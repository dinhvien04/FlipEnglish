import {
  DictionaryEntry,
  DictionarySuggestion,
  DictionaryRelationType,
  ReverseDictionaryResult,
} from './dictionaryTypes';
import {
  normalizeDictionaryQuery,
  getCurriculumMatchesForWord,
  buildCurriculumDictionaryEntry,
  getLocalCurriculumSuggestions,
  buildDictionaryEntryFromSavedSnapshot,
} from './dictionaryLocalIndex';
import {
  getCachedDictionaryEntry,
  setCachedDictionaryEntry,
  getSavedWordFromDb,
} from './dictionaryCache';

export interface DictionaryLookupResult {
  entry: DictionaryEntry | null;
  spellingSuggestions?: string[];
  isOfflineCached?: boolean;
  error?: string;
}

/**
 * Executes multi-tier dictionary lookup:
 * 1. Normalize query
 * 2. Find local FlipEnglish curriculum matches
 * 3. Check IndexedDB cache
 * 4. Check Saved word snapshot in IndexedDB
 * 5. If offline, serve cached entry -> saved snapshot -> curriculum entry -> calm offline notice
 * 6. If online, fetch from backend /api/dictionary/lookup
 * 7. Merge curriculum matches with provider result & persist to IndexedDB
 * 8. Fall back to cached entry, saved snapshot, or local curriculum entry on network failure
 */
export async function lookupDictionary(word: string): Promise<DictionaryLookupResult> {
  const normalized = normalizeDictionaryQuery(word);
  if (!normalized) {
    return { entry: null, error: 'Please enter a word to search.' };
  }

  // 1. Local Curriculum Matches
  const curriculumMatches = getCurriculumMatchesForWord(normalized);

  // 2. Check IndexedDB cache
  const cachedEntry = await getCachedDictionaryEntry(normalized);

  // 3. Check Saved Word Snapshot in IndexedDB
  const savedWord = await getSavedWordFromDb(normalized);

  // Check network state
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    if (cachedEntry) {
      if (curriculumMatches.length > 0) {
        cachedEntry.curriculumMatches = curriculumMatches;
        cachedEntry.source = 'combined';
      }
      return { entry: cachedEntry, isOfflineCached: true };
    }

    if (savedWord) {
      const snapshotEntry = buildDictionaryEntryFromSavedSnapshot(savedWord);
      if (curriculumMatches.length > 0) {
        snapshotEntry.curriculumMatches = curriculumMatches;
        snapshotEntry.source = 'combined';
      }
      return { entry: snapshotEntry, isOfflineCached: true };
    }

    if (curriculumMatches.length > 0) {
      const currEntry = buildCurriculumDictionaryEntry(normalized);
      if (currEntry) {
        return { entry: currEntry, isOfflineCached: false };
      }
    }

    return {
      entry: null,
      error: "This word isn't available offline yet. Connect to the internet to look it up.",
    };
  }

  // 4. Online Backend Provider Lookup
  try {
    const encoded = encodeURIComponent(normalized);
    const res = await fetch(`/api/dictionary/lookup?word=${encoded}`);

    if (res.status === 200) {
      const data: DictionaryEntry = await res.json();

      // Merge curriculum matches
      if (curriculumMatches.length > 0) {
        data.curriculumMatches = curriculumMatches;
        data.source = 'combined';
      }

      // Persist to IndexedDB cache
      setCachedDictionaryEntry(data).catch(() => {});

      return { entry: data };
    }

    if (res.status === 404) {
      const errData = await res.json().catch(() => ({}));

      // If word is not in external dictionary, check saved snapshot or curriculum:
      if (savedWord) {
        const snapshotEntry = buildDictionaryEntryFromSavedSnapshot(savedWord);
        if (curriculumMatches.length > 0) {
          snapshotEntry.curriculumMatches = curriculumMatches;
          snapshotEntry.source = 'combined';
        }
        return { entry: snapshotEntry };
      }

      if (curriculumMatches.length > 0) {
        const currEntry = buildCurriculumDictionaryEntry(normalized);
        if (currEntry) {
          setCachedDictionaryEntry(currEntry).catch(() => {});
          return { entry: currEntry };
        }
      }

      return {
        entry: null,
        spellingSuggestions: errData.spellingSuggestions,
        error: `Word "${word}" not found in dictionary.`,
      };
    }

    // Provider error (503, 504, 429) -> fallback to cache, saved snapshot, or curriculum
    if (cachedEntry) {
      if (curriculumMatches.length > 0) {
        cachedEntry.curriculumMatches = curriculumMatches;
      }
      return { entry: cachedEntry, isOfflineCached: true };
    }

    if (savedWord) {
      const snapshotEntry = buildDictionaryEntryFromSavedSnapshot(savedWord);
      if (curriculumMatches.length > 0) {
        snapshotEntry.curriculumMatches = curriculumMatches;
      }
      return { entry: snapshotEntry, isOfflineCached: true };
    }

    if (curriculumMatches.length > 0) {
      const currEntry = buildCurriculumDictionaryEntry(normalized);
      if (currEntry) return { entry: currEntry };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      entry: null,
      error: errData.error || 'Dictionary service is temporarily unavailable.',
    };
  } catch (netErr) {
    // Network failure during request -> gracefully serve cached entry, saved snapshot, or curriculum
    if (cachedEntry) {
      if (curriculumMatches.length > 0) {
        cachedEntry.curriculumMatches = curriculumMatches;
      }
      return { entry: cachedEntry, isOfflineCached: true };
    }

    if (savedWord) {
      const snapshotEntry = buildDictionaryEntryFromSavedSnapshot(savedWord);
      if (curriculumMatches.length > 0) {
        snapshotEntry.curriculumMatches = curriculumMatches;
      }
      return { entry: snapshotEntry, isOfflineCached: true };
    }

    if (curriculumMatches.length > 0) {
      const currEntry = buildCurriculumDictionaryEntry(normalized);
      if (currEntry) return { entry: currEntry };
    }

    return {
      entry: null,
      error: 'Unable to reach dictionary service. Please check your connection.',
    };
  }
}

/**
 * Autocomplete suggestions: Combines local curriculum matches first,
 * then fetches Datamuse suggestions via /api/dictionary/suggest with AbortSignal.
 */
export async function getDictionarySuggestions(
  query: string,
  signal?: AbortSignal
): Promise<DictionarySuggestion[]> {
  const normalized = normalizeDictionaryQuery(query);
  if (!normalized || normalized.length < 2) return [];

  // Local curriculum suggestions immediately
  const localSuggs = getLocalCurriculumSuggestions(normalized, 5);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    return localSuggs;
  }

  try {
    const encoded = encodeURIComponent(normalized);
    const res = await fetch(`/api/dictionary/suggest?q=${encoded}`, { signal });
    if (!res.ok) return localSuggs;

    const data = await res.json();
    const remoteSuggs: DictionarySuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];

    // Merge and deduplicate by lowercased word
    const seen = new Set<string>();
    const merged: DictionarySuggestion[] = [];

    // Local curriculum first
    for (const s of localSuggs) {
      const key = s.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(s);
      }
    }

    // Remote second
    for (const s of remoteSuggs) {
      const key = s.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ word: s.word, score: s.score });
      }
      if (merged.length >= 10) break;
    }

    return merged.slice(0, 10);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return [];
    }
    return localSuggs;
  }
}

/**
 * Related words lookup via /api/dictionary/related with AbortSignal support
 */
export async function getDictionaryRelated(
  word: string,
  relationType: DictionaryRelationType,
  signal?: AbortSignal
): Promise<string[]> {
  const normalized = normalizeDictionaryQuery(word);
  if (!normalized) return [];

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) return [];

  try {
    const encWord = encodeURIComponent(normalized);
    const encType = encodeURIComponent(relationType);
    const res = await fetch(`/api/dictionary/related?word=${encWord}&type=${encType}`, { signal });
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

/**
 * Reverse dictionary lookup via /api/dictionary/reverse with AbortSignal support
 */
export async function lookupReverseDictionary(
  description: string,
  signal?: AbortSignal
): Promise<ReverseDictionaryResult[]> {
  const clean = description.trim();
  if (!clean || clean.length < 2) return [];

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) return [];

  try {
    const enc = encodeURIComponent(clean);
    const res = await fetch(`/api/dictionary/reverse?q=${enc}`, { signal });
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}
