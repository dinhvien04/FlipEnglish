import {
  DictionaryEntry,
  SavedDictionaryWord,
  DictionaryEntrySnapshot,
} from './dictionaryTypes';
import {
  isValidDictionaryEntry,
  isValidSavedDictionaryWord,
} from './dictionaryValidation';

const DB_NAME = 'flipenglish_dictionary_v1';
const DB_VERSION = 1;

const STORE_ENTRIES = 'entries';
const STORE_SAVED = 'savedWords';
const STORE_META = 'metadata';

const MAX_CACHED_ENTRIES = 250;
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface CachedDictionaryResult {
  entry: DictionaryEntry;
  stale: boolean;
  fetchedAt: number;
}

export interface CachedEntryRecord {
  normalizedWord: string;
  entry: DictionaryEntry;
  fetchedAt: number;
  lastAccessedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
          const entryStore = db.createObjectStore(STORE_ENTRIES, { keyPath: 'normalizedWord' });
          entryStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SAVED)) {
          const savedStore = db.createObjectStore(STORE_SAVED, { keyPath: 'normalizedWord' });
          savedStore.createIndex('savedAt', 'savedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('[Dictionary IndexedDB] Open failed:', err);
        resolve(null);
      };
    } catch (err) {
      console.warn('[Dictionary IndexedDB] Exception opening DB:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Retrieves a cached dictionary entry with metadata (fresh vs stale).
 * Stale entries (older than 30 days) remain available for offline fallback.
 */
export async function getCachedDictionaryEntryWithMeta(
  normalizedWord: string,
  now = Date.now()
): Promise<CachedDictionaryResult | null> {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTRIES);
      const req = store.get(normalizedWord);

      req.onsuccess = () => {
        const record = req.result as CachedEntryRecord | undefined;
        if (!record || !record.entry || !isValidDictionaryEntry(record.entry)) {
          // If record exists but is corrupted, optionally clean it up safely
          if (record && !isValidDictionaryEntry(record.entry)) {
            try {
              store.delete(normalizedWord);
            } catch {}
          }
          resolve(null);
          return;
        }

        // Validate fetchedAt timestamp
        const fetchedAt = typeof record.fetchedAt === 'number' && record.fetchedAt > 0
          ? record.fetchedAt
          : (record.entry.fetchedAt || now);

        const age = now - fetchedAt;
        const stale = age > CACHE_TTL_MS;

        // Update lastAccessedAt in background
        record.lastAccessedAt = now;
        store.put(record);

        resolve({
          entry: record.entry,
          stale,
          fetchedAt,
        });
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves a cached dictionary entry from IndexedDB.
 * Validates schema integrity and updates lastAccessedAt timestamp.
 */
export async function getCachedDictionaryEntry(normalizedWord: string): Promise<DictionaryEntry | null> {
  const res = await getCachedDictionaryEntryWithMeta(normalizedWord);
  return res ? res.entry : null;
}

/**
 * Stores or updates a normalized dictionary entry in IndexedDB cache,
 * enforcing LRU eviction when max capacity is reached.
 */
export async function setCachedDictionaryEntry(entry: DictionaryEntry): Promise<boolean> {
  if (!isValidDictionaryEntry(entry)) return false;
  const db = await getDb();
  if (!db) return false;

  const normalizedWord = entry.normalizedWord;
  const record: CachedEntryRecord = {
    normalizedWord,
    entry,
    fetchedAt: entry.fetchedAt || Date.now(),
    lastAccessedAt: Date.now(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTRIES);

      // Check if entry already exists to avoid unnecessary eviction
      const existReq = store.get(normalizedWord);
      existReq.onsuccess = () => {
        const exists = Boolean(existReq.result);

        if (!exists) {
          const countReq = store.count();
          countReq.onsuccess = () => {
            if (countReq.result >= MAX_CACHED_ENTRIES) {
              // Evict oldest ~20 items using lastAccessedAt index
              const index = store.index('lastAccessedAt');
              const cursorReq = index.openCursor();
              let deleted = 0;
              cursorReq.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && deleted < 20) {
                  store.delete(cursor.primaryKey);
                  deleted++;
                  cursor.continue();
                }
              };
            }
            store.put(record);
          };
        } else {
          store.put(record);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Creates a compact snapshot of a dictionary entry for offline saved vocabulary.
 */
export function createEntrySnapshot(entry: DictionaryEntry): DictionaryEntrySnapshot {
  const primaryMeaning = entry.meanings.length > 0 ? entry.meanings[0] : undefined;
  const primaryDef = primaryMeaning?.definitions.length ? primaryMeaning.definitions[0].definition : undefined;
  const primaryPron = entry.pronunciations.find((p) => p.audioUrl)?.audioUrl;

  const firstCurr = entry.curriculumMatches?.length ? entry.curriculumMatches[0] : undefined;

  return {
    word: entry.word,
    normalizedWord: entry.normalizedWord,
    phonetic: entry.phonetic,
    primaryPartOfSpeech: primaryMeaning?.partOfSpeech || firstCurr?.partOfSpeech,
    primaryDefinition: primaryDef,
    primaryMeaningVi: firstCurr?.meaning,
    audioUrl: primaryPron,
    cefrLevel: firstCurr?.level,
    lessonTitle: firstCurr?.lessonTitle,
  };
}

/**
 * Loads all saved vocabulary items from IndexedDB.
 * Filters and ensures only valid records are returned.
 */
export async function getSavedWordsFromDb(): Promise<SavedDictionaryWord[]> {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readonly');
      const store = tx.objectStore(STORE_SAVED);
      const req = store.getAll();

      req.onsuccess = () => {
        const rawResults = (req.result as SavedDictionaryWord[]) || [];
        const validResults = rawResults.filter(isValidSavedDictionaryWord);
        // Sort descending by savedAt
        validResults.sort((a, b) => b.savedAt - a.savedAt);
        resolve(validResults);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Retrieves a single saved word by normalized word key.
 */
export async function getSavedWordFromDb(normalizedWord: string): Promise<SavedDictionaryWord | null> {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readonly');
      const store = tx.objectStore(STORE_SAVED);
      const req = store.get(normalizedWord);

      req.onsuccess = () => {
        const item = req.result as SavedDictionaryWord | undefined;
        if (!item || !isValidSavedDictionaryWord(item)) {
          resolve(null);
          return;
        }
        resolve(item);
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a word in IndexedDB.
 * Returns true on success, false on error.
 */
export async function saveWordToDb(item: SavedDictionaryWord): Promise<boolean> {
  if (!isValidSavedDictionaryWord(item)) return false;
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readwrite');
      const store = tx.objectStore(STORE_SAVED);
      store.put(item);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Removes a saved word from IndexedDB.
 * Returns true on success, false on error.
 */
export async function removeSavedWordFromDb(normalizedWord: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readwrite');
      const store = tx.objectStore(STORE_SAVED);
      store.delete(normalizedWord);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks if a normalized word is saved.
 * Validates saved record schema before returning true.
 */
export async function isWordSavedInDb(normalizedWord: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readonly');
      const store = tx.objectStore(STORE_SAVED);
      const req = store.get(normalizedWord);
      req.onsuccess = () => {
        const item = req.result as SavedDictionaryWord | undefined;
        if (!item || !isValidSavedDictionaryWord(item)) {
          resolve(false);
          return;
        }
        resolve(true);
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Clears all saved vocabulary entries from IndexedDB.
 */
export async function clearAllSavedWordsFromDb(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return true; // No IndexedDB in current environment (e.g. Node test script or restricted browser)
  }

  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVED, 'readwrite');
      const store = tx.objectStore(STORE_SAVED);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Clears all cached dictionary entry definitions from IndexedDB.
 */
export async function clearAllCachedEntriesFromDb(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return true; // No IndexedDB in current environment
  }

  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = tx.objectStore(STORE_ENTRIES);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Clears all metadata records from IndexedDB.
 */
export async function clearAllMetadataFromDb(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return true; // No IndexedDB in current environment
  }

  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(STORE_META)) {
        resolve(true);
        return;
      }
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

