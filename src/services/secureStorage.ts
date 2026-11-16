import * as SecureStore from 'expo-secure-store';
import type { KeyValueStorageInterface } from 'aws-amplify/utils';

/**
 * Where Amplify keeps the user's Cognito tokens: the device's secure storage
 * (Keychain / Keystore) instead of Amplify's default, plain AsyncStorage.
 *
 * Two things SecureStore needs that Amplify's keys and tokens don't satisfy:
 * - keys may only contain letters, digits, ".", "-" and "_";
 * - values above about 2 KB are not reliably stored, and a Cognito refresh token can
 *   be that long. Longer values are split across several entries.
 *
 * A missing key means "signed out" to Amplify, so a value must never be absent while it
 * is being replaced (even if the app is killed half way). Hence a new value is written
 * in full before the key that points to it is switched, and only then are the old
 * pieces removed. Operations are also run one at a time, so a read can't land between steps.
 */
const CHUNK_SIZE = 1500;
const CHUNKED_MARKER = '@@chunks:'; // no token starts with this; the rest is "<version>:<count>"
const INDEX_KEY = 'hetu_amplify_keys';

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const chunkKey = (key: string, version: string, i: number) => `${key}.${version}.c${i}`;

let versionCounter = 0;
const newVersion = () => `${Date.now().toString(36)}${(versionCounter++).toString(36)}`;

interface ChunkedRef {
  version: string;
  count: number;
}

function parseMarker(stored: string | null): ChunkedRef | null {
  if (!stored?.startsWith(CHUNKED_MARKER)) return null;
  const [version, count] = stored.slice(CHUNKED_MARKER.length).split(':');
  return version && Number(count) > 0 ? { version, count: Number(count) } : null;
}

async function deleteChunks(key: string, ref: ChunkedRef): Promise<void> {
  for (let i = 0; i < ref.count; i++) await SecureStore.deleteItemAsync(chunkKey(key, ref.version, i));
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  if (keys.length === 0) await SecureStore.deleteItemAsync(INDEX_KEY);
  else await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(keys));
}

// All operations go through one queue; a failed one doesn't block the ones after it
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => {});
  return run;
}

async function setItem(rawKey: string, value: string): Promise<void> {
  const key = safeKey(rawKey);
  const previous = parseMarker(await SecureStore.getItemAsync(key));

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
  } else {
    const ref = { version: newVersion(), count: Math.ceil(value.length / CHUNK_SIZE) };
    try {
      for (let i = 0; i < ref.count; i++) {
        await SecureStore.setItemAsync(
          chunkKey(key, ref.version, i),
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
    } catch (e) {
      await deleteChunks(key, ref).catch(() => {}); // the old value is untouched; just tidy up
      throw e;
    }
    await SecureStore.setItemAsync(key, `${CHUNKED_MARKER}${ref.version}:${ref.count}`); // the switch
  }

  if (previous) await deleteChunks(key, previous);

  const index = await readIndex();
  if (!index.includes(key)) await writeIndex([...index, key]);
}

async function getItem(rawKey: string): Promise<string | null> {
  const key = safeKey(rawKey);
  const stored = await SecureStore.getItemAsync(key);
  const ref = parseMarker(stored);
  if (!ref) return stored;

  const parts: string[] = [];
  for (let i = 0; i < ref.count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, ref.version, i));
    if (part === null) return null; // incomplete: treat as signed out rather than return a corrupt token
    parts.push(part);
  }
  return parts.join('');
}

async function removeEntry(key: string): Promise<void> {
  const ref = parseMarker(await SecureStore.getItemAsync(key));
  await SecureStore.deleteItemAsync(key);
  if (ref) await deleteChunks(key, ref);
}

async function removeItem(rawKey: string): Promise<void> {
  const key = safeKey(rawKey);
  await removeEntry(key);
  const index = await readIndex();
  if (index.includes(key)) await writeIndex(index.filter((k) => k !== key));
}

async function clear(): Promise<void> {
  for (const key of await readIndex()) await removeEntry(key);
  await writeIndex([]);
}

export const secureTokenStorage: KeyValueStorageInterface = {
  setItem: (key, value) => serialized(() => setItem(key, value)),
  getItem: (key) => serialized(() => getItem(key)),
  removeItem: (key) => serialized(() => removeItem(key)),
  clear: () => serialized(clear),
};
