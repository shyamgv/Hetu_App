import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { initWhisper, type WhisperContext } from 'whisper.rn';

/**
 * Voice service — on-device speech-to-text using whisper.cpp (base.en model)
 * via whisper.rn. The model is bundled into the app at build time (see
 * `assets/models/ggml-base.en.bin` + `metro.config.js`), so there is no
 * runtime download step.
 *
 * iOS-first: records true 16kHz mono linear-PCM WAV, which whisper.cpp reads
 * natively. Android support is a known follow-up (MediaRecorder can't emit
 * raw PCM/WAV directly, so a transcoding step is needed there).
 *
 * NOTE: whisper.rn ships native code, so a dev-client rebuild is required
 * after installing it (`npx expo prebuild` + `npx expo run:ios`).
 */

// Bundled at build time — Metro treats `.bin` as a binary asset (see metro.config.js).
const MODEL_ASSET = require('../../assets/models/ggml-base.en.bin');

let whisperContext: WhisperContext | null = null;
let initPromise: Promise<WhisperContext> | null = null;
let recording: Audio.Recording | null = null;

// True 16kHz mono linear-PCM WAV — the format whisper.cpp expects natively.
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    // Not yet supported for on-device transcription — see module docblock.
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 256000,
  },
};

/** Lazily initializes the bundled whisper context (first call only). */
async function getWhisperContext(): Promise<WhisperContext> {
  if (whisperContext) return whisperContext;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const ctx = await initWhisper({ filePath: MODEL_ASSET });
    whisperContext = ctx;
    return ctx;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/** Pre-warms the whisper context — call early (e.g. on chat screen mount) to avoid a cold-start delay. */
export async function preloadVoiceModel(): Promise<void> {
  await getWhisperContext();
}

/** Requests microphone permission. Returns true if granted. */
export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

/** Starts recording audio for voice input. Throws if permission is denied. */
export async function startRecording(): Promise<void> {
  if (recording) {
    // Already recording — ignore duplicate start calls.
    return;
  }

  const granted = await requestMicPermission();
  if (!granted) {
    throw new Error('Microphone permission is required to use voice chat.');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
  recording = rec;
}

/**
 * Stops the current recording and transcribes it with whisper.cpp.
 * Returns the transcribed text (trimmed). Returns an empty string if
 * nothing was captured.
 */
export async function stopRecordingAndTranscribe(): Promise<string> {
  if (!recording) return '';

  const rec = recording;
  recording = null;

  await rec.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = rec.getURI();
  if (!uri) return '';

  const ctx = await getWhisperContext();
  const { promise } = ctx.transcribe(uri, { language: 'en' });
  const { result } = await promise;

  // Clean up the temp audio file — we only need the transcript.
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

  return (result ?? '').trim();
}

/** Cancels an in-progress recording without transcribing it. */
export async function cancelRecording(): Promise<void> {
  if (!recording) return;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    if (uri) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  } catch {
    // ignore
  } finally {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }
}

export function isRecording(): boolean {
  return recording !== null;
}

