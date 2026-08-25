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
  getCachedDictionaryEntryWithMeta,
  setCachedDictionaryEntry,
  getSavedWordFromDb,
} from './dictionaryCache';
import {
  isValidDictionaryEntry,
  sanitizeSuggestionsArray,
  sanitizeRelatedWordsArray,
  sanitizeReverseResultsArray,
  sanitizeSpellingSuggestions,
} from './dictionaryValidation';

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
 * 3. Check IndexedDB cache with TTL metadata (30-day fresh/stale)
 * 4. Check Saved word snapshot in IndexedDB
 * 5. If offline: serve cached entry (fresh/stale) -> saved snapshot -> curriculum entry -> calm offline notice
 * 6. If online + fresh cache: serve fresh cache immediately without extra provider request
 * 7. If online + stale/missing: call backend /api/dictionary/lookup
 *    - On 200: validate with isValidDictionaryEntry, merge curriculum, persist to cache, return
 *    - On 404: check saved snapshot -> curriculum -> 404 suggestions
 *    - On provider/network failure: fallback to stale cache -> saved snapshot -> curriculum -> calm error
 */
export async function lookupDictionary(word: string): Promise<DictionaryLookupResult> {
  const normalized = normalizeDictionaryQuery(word);
  if (!normalized) {
    return { entry: null, error: 'Please enter a word to search.' };
  }

  // 1. Local Curriculum Matches
  const curriculumMatches = getCurriculumMatchesForWord(normalized);

  // 2. Check IndexedDB cache with metadata
  const cachedMeta = await getCachedDictionaryEntryWithMeta(normalized);

  // 3. Check Saved Word Snapshot in IndexedDB
  const savedWord = await getSavedWordFromDb(normalized);

  // Check network state
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // OFFLINE MODE
  if (!isOnline) {
    if (cachedMeta) {
      if (curriculumMatches.length > 0) {
        cachedMeta.entry.curriculumMatches = curriculumMatches;
        cachedMeta.entry.source = 'combined';
      }
      return { entry: cachedMeta.entry, isOfflineCached: true };
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

  // ONLINE MODE: If cache exists and is FRESH (< 30 days old), use immediately
  if (cachedMeta && !cachedMeta.stale) {
    if (curriculumMatches.length > 0) {
      cachedMeta.entry.curriculumMatches = curriculumMatches;
      cachedMeta.entry.source = 'combined';
    }
    return { entry: cachedMeta.entry, isOfflineCached: false };
  }

  // ONLINE MODE: Stale cache or missing -> attempt fresh fetch from backend provider
  try {
    const encoded = encodeURIComponent(normalized);
    const res = await fetch(`/api/dictionary/lookup?word=${encoded}`);

    if (res.status === 200) {
      const rawData = await res.json().catch(() => null);

      // Validate runtime schema before trusting or caching
      if (isValidDictionaryEntry(rawData)) {
        if (curriculumMatches.length > 0) {
          rawData.curriculumMatches = curriculumMatches;
          rawData.source = 'combined';
        }

        // Persist fresh entry to IndexedDB cache
        setCachedDictionaryEntry(rawData).catch(() => {});

        return { entry: rawData };
      }

      // If backend returned 200 with invalid schema, fallback gracefully
      if (cachedMeta) {
        if (curriculumMatches.length > 0) {
          cachedMeta.entry.curriculumMatches = curriculumMatches;
        }
        return { entry: cachedMeta.entry, isOfflineCached: true };
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
        error: 'Dictionary service returned an unrecognized response format.',
      };
    }

    if (res.status === 404) {
      const errData = await res.json().catch(() => ({}));
      const spellingSuggestions = sanitizeSpellingSuggestions(errData.spellingSuggestions);

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
        spellingSuggestions: spellingSuggestions.length > 0 ? spellingSuggestions : undefined,
        error: `Word "${word}" not found in dictionary.`,
      };
    }

    // Provider error (503, 504, 429) -> fallback to stale cache, saved snapshot, or curriculum
    if (cachedMeta) {
      if (curriculumMatches.length > 0) {
        cachedMeta.entry.curriculumMatches = curriculumMatches;
      }
      return { entry: cachedMeta.entry, isOfflineCached: true };
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
  } catch {
    // Network failure during request -> gracefully serve stale cache, saved snapshot, or curriculum
    if (cachedMeta) {
      if (curriculumMatches.length > 0) {
        cachedMeta.entry.curriculumMatches = curriculumMatches;
      }
      return { entry: cachedMeta.entry, isOfflineCached: true };
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
    const remoteSuggs = sanitizeSuggestionsArray(data.suggestions, 20);

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
    return sanitizeRelatedWordsArray(data.results, 30);
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
    return sanitizeReverseResultsArray(data.results, 30);
  } catch {
    return [];
  }
}
