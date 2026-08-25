import {
  DictionarySuggestion,
  DictionaryRelationType,
  ReverseDictionaryResult,
} from './dictionaryTypes';

const DATAMUSE_BASE_URL = 'https://api.datamuse.com';
const MAX_SUGGESTIONS = 10;
const MAX_RELATIONS = 30;
const MAX_REVERSE_RESULTS = 15;

/**
 * Builds request URL for Datamuse, optionally attaching DATAMUSE_API_KEY when configured.
 */
function buildDatamuseUrl(endpoint: string, params: Record<string, string | number>): string {
  const url = new URL(`${DATAMUSE_BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  // Future API key readiness (supported starting Jan 2027 or whenever configured)
  const apiKey = process.env.DATAMUSE_API_KEY;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    url.searchParams.set('key', apiKey.trim());
  }

  return url.toString();
}

/**
 * Autocomplete / Suggestions using Datamuse /sug
 */
export async function suggestDatamuseWords(
  query: string,
  timeoutMs = 4000
): Promise<{ suggestions: DictionarySuggestion[]; status: number; error?: string }> {
  const cleanQ = query.trim().slice(0, 80);
  if (!cleanQ) {
    return { suggestions: [], status: 200 };
  }

  const url = buildDatamuseUrl('/sug', { s: cleanQ, max: MAX_SUGGESTIONS });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { suggestions: [], status: res.status >= 500 ? 503 : res.status, error: 'Suggestion service error' };
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return { suggestions: [], status: 200 };
    }

    const suggestions: DictionarySuggestion[] = data
      .slice(0, MAX_SUGGESTIONS)
      .map((item: any) => ({
        word: String(item.word || '').trim(),
        score: typeof item.score === 'number' ? item.score : undefined,
      }))
      .filter((s) => s.word.length > 0);

    return { suggestions, status: 200 };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { suggestions: [], status: 504, error: 'Suggestion request timed out' };
    }
    return { suggestions: [], status: 503, error: 'Suggestion service unavailable' };
  }
}

/**
 * Related words, Synonyms, Antonyms, Sounds-Like, Similar using Datamuse /words
 */
export async function getDatamuseRelated(
  word: string,
  relationType: DictionaryRelationType,
  timeoutMs = 4000
): Promise<{ results: string[]; status: number; error?: string }> {
  const cleanWord = word.trim().slice(0, 80);
  if (!cleanWord) {
    return { results: [], status: 200 };
  }

  const params: Record<string, string | number> = { max: MAX_RELATIONS };
  switch (relationType) {
    case 'synonym':
      params.rel_syn = cleanWord;
      break;
    case 'antonym':
      params.rel_ant = cleanWord;
      break;
    case 'similar':
      params.ml = cleanWord;
      break;
    case 'sounds-like':
      params.sl = cleanWord;
      break;
    default:
      params.ml = cleanWord;
  }

  const url = buildDatamuseUrl('/words', params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { results: [], status: res.status >= 500 ? 503 : res.status, error: 'Related service error' };
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return { results: [], status: 200 };
    }

    const results: string[] = data
      .slice(0, MAX_RELATIONS)
      .map((item: any) => String(item.word || '').trim())
      .filter((w) => w.length > 0 && w.toLowerCase() !== cleanWord.toLowerCase());

    return { results, status: 200 };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { results: [], status: 504, error: 'Related request timed out' };
    }
    return { results: [], status: 503, error: 'Related service unavailable' };
  }
}

/**
 * Reverse Dictionary / Means-Like lookup using Datamuse /words?ml=description
 */
export async function reverseDatamuseLookup(
  description: string,
  timeoutMs = 5000
): Promise<{ results: ReverseDictionaryResult[]; status: number; error?: string }> {
  const cleanDesc = description.trim().slice(0, 150);
  if (!cleanDesc) {
    return { results: [], status: 200 };
  }

  const url = buildDatamuseUrl('/words', {
    ml: cleanDesc,
    max: MAX_REVERSE_RESULTS,
    md: 'd', // request definition previews
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { results: [], status: res.status >= 500 ? 503 : res.status, error: 'Reverse lookup error' };
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return { results: [], status: 200 };
    }

    const results: ReverseDictionaryResult[] = data
      .slice(0, MAX_REVERSE_RESULTS)
      .map((item: any) => {
        const word = String(item.word || '').trim();
        let defPreview: string | undefined;
        if (Array.isArray(item.defs) && item.defs.length > 0) {
          const firstDef = String(item.defs[0]);
          // Datamuse defs format is often: "n\tdefinition text"
          const parts = firstDef.split('\t');
          defPreview = parts.length > 1 ? parts[1] : parts[0];
        }
        return {
          word,
          score: typeof item.score === 'number' ? item.score : undefined,
          definitionPreview: defPreview ? defPreview.slice(0, 200) : undefined,
        };
      })
      .filter((r) => r.word.length > 0);

    return { results, status: 200 };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { results: [], status: 504, error: 'Reverse lookup timed out' };
    }
    return { results: [], status: 503, error: 'Reverse lookup service unavailable' };
  }
}

/**
 * Spelling suggestions for misspelled words using Datamuse /words?sp=word
 */
export async function getDatamuseSpellingSuggestions(
  misspelledWord: string,
  timeoutMs = 4000
): Promise<string[]> {
  const cleanWord = misspelledWord.trim().slice(0, 80);
  if (!cleanWord) return [];

  const url = buildDatamuseUrl('/words', {
    sp: cleanWord,
    max: 6,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => String(item.word || '').trim())
      .filter((w) => w.length > 0 && w.toLowerCase() !== cleanWord.toLowerCase())
      .slice(0, 5);
  } catch {
    clearTimeout(timer);
    return [];
  }
}
