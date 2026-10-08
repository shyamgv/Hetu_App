/**
 * Minimal ambient type declaration for `whisper.rn`.
 *
 * The package's `package.json` only declares subpath `exports` (e.g. `./*`)
 * and has no root `"."` entry, which trips up TypeScript's `bundler`/`node16`
 * module resolution for the bare `import ... from 'whisper.rn'` even though
 * Metro resolves it fine at runtime via the `main`/`react-native` fields.
 * This declaration unblocks `tsc` without changing how Metro bundles it.
 */
declare module 'whisper.rn' {
  export type TranscribeOptions = {
    language?: string;
    translate?: boolean;
    maxThreads?: number;
    maxContext?: number;
    maxLen?: number;
    tokenTimestamps?: boolean;
    onProgress?: (progress: number) => void;
    [key: string]: unknown;
  };

  export type TranscribeResult = {
    result: string;
    segments: Array<{ text: string; t0: number; t1: number }>;
  };

  export type ContextOptions = {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
  };

  export class WhisperContext {
    id: number;
    gpu: boolean;
    reasonNoGPU: string;
    transcribe(
      filePathOrBase64: string | number,
      options?: TranscribeOptions
    ): {
      stop: () => Promise<void>;
      promise: Promise<TranscribeResult>;
    };
    release(): Promise<void>;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function releaseAllWhisper(): Promise<void>;
  export const libVersion: string;
}
