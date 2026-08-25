import { RecentSearchItem } from './dictionaryTypes';
import { normalizeDictionaryQuery } from './dictionaryLocalIndex';

const RECENT_SEARCHES_KEY = 'flipenglish_dictionary_recent_v1';
const MAX_RECENT_SEARCHES = 20;

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: any) => typeof item === 'object' && item !== null && typeof item.word === 'string')
      .map((item: any) => ({
        word: String(item.word).trim().slice(0, 80),
        searchedAt: typeof item.searchedAt === 'number' ? item.searchedAt : Date.now(),
      }))
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function addRecentSearch(word: string): void {
  if (typeof window === 'undefined') return;
  const clean = word.trim().slice(0, 80);
  if (!clean) return;

  try {
    const current = getRecentSearches();
    const normalized = normalizeDictionaryQuery(clean);

    // Filter out existing occurrence of same word
    const filtered = current.filter((item) => normalizeDictionaryQuery(item.word) !== normalized);

    // Prepend fresh item
    filtered.unshift({
      word: clean,
      searchedAt: Date.now(),
    });

    const bounded = filtered.slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(bounded));
  } catch (err) {
    console.warn('[Dictionary Storage] Failed to write recent search:', err);
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (err) {
    console.warn('[Dictionary Storage] Failed to clear recent searches:', err);
  }
}
