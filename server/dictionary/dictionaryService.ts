import {
  DictionaryEntry,
  DictionarySuggestion,
  DictionaryRelationType,
  ReverseDictionaryResult,
} from './dictionaryTypes';
import { lookupFreeDictionary } from './freeDictionaryProvider';
import {
  suggestDatamuseWords,
  getDatamuseRelated,
  reverseDatamuseLookup,
  getDatamuseSpellingSuggestions,
} from './datamuseProvider';

// Bounded in-process server memory cache (Max 300 entries, 20 minute TTL)
interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

const SERVER_CACHE_MAX_ENTRIES = 300;
const SERVER_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const lookupCache = new Map<string, CacheItem<DictionaryEntry>>();

function getFromCache<T>(cache: Map<string, CacheItem<T>>, key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache<T>(cache: Map<string, CacheItem<T>>, key: string, data: T): void {
  if (cache.size >= SERVER_CACHE_MAX_ENTRIES) {
    // Simple eviction: delete the oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, {
    data,
    expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
  });
}

export class DictionaryService {
  /**
   * Primary Dictionary Lookup: Checks server cache, calls Free Dictionary API,
   * attaches spelling suggestions if not found.
   */
  static async lookup(word: string): Promise<{
    entry: DictionaryEntry | null;
    spellingSuggestions?: string[];
    status: number;
    error?: string;
  }> {
    const normalizedKey = word.trim().toLowerCase();
    if (!normalizedKey) {
      return { entry: null, status: 400, error: 'Word query is required' };
    }

    // 1. Check in-memory server cache
    const cached = getFromCache(lookupCache, normalizedKey);
    if (cached) {
      return { entry: cached, status: 200 };
    }

    // 2. Query Free Dictionary API
    const result = await lookupFreeDictionary(word);
    if (result.status === 200 && result.entry) {
      setToCache(lookupCache, normalizedKey, result.entry);
      return { entry: result.entry, status: 200 };
    }

    // 3. If word not found (404), fetch spelling suggestions from Datamuse asynchronously
    if (result.status === 404) {
      const spellingSuggestions = await getDatamuseSpellingSuggestions(word);
      return {
        entry: null,
        spellingSuggestions: spellingSuggestions.length > 0 ? spellingSuggestions : undefined,
        status: 404,
        error: result.error || 'Word not found',
      };
    }

    return {
      entry: null,
      status: result.status,
      error: result.error || 'Dictionary service unavailable',
    };
  }

  /**
   * Autocomplete suggestions using Datamuse
   */
  static async suggest(query: string): Promise<{
    suggestions: DictionarySuggestion[];
    status: number;
    error?: string;
  }> {
    return suggestDatamuseWords(query);
  }

  /**
   * Relations (synonyms, antonyms, similar, sounds-like)
   */
  static async related(
    word: string,
    relationType: DictionaryRelationType
  ): Promise<{ results: string[]; status: number; error?: string }> {
    return getDatamuseRelated(word, relationType);
  }

  /**
   * Reverse Dictionary (means-like description)
   */
  static async reverse(description: string): Promise<{
    results: ReverseDictionaryResult[];
    status: number;
    error?: string;
  }> {
    return reverseDatamuseLookup(description);
  }
}
