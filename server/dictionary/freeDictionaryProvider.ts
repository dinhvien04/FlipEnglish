import {
  DictionaryEntry,
  DictionaryMeaning,
  DictionaryDefinition,
  DictionaryPronunciation,
} from './dictionaryTypes';

// Bound limits for security and payload sizing
const MAX_MEANINGS = 8;
const MAX_DEFINITIONS_PER_MEANING = 8;
const MAX_SYNONYMS = 30;
const MAX_ANTONYMS = 30;
const MAX_PRONUNCIATIONS = 8;
const MAX_STRING_LENGTH = 1000;

function truncateStr(str: any, maxLen = MAX_STRING_LENGTH): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function sanitizeAudioUrl(url: any): string | undefined {
  if (typeof url !== 'string') return undefined;
  let trimmed = url.trim();
  if (!trimmed) return undefined;

  // Normalize protocol-relative URL
  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed;
  }

  // Must be https and not contain javascript/data/blob
  if (!trimmed.startsWith('https://')) {
    return undefined;
  }

  // Validate URL structure
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes Free Dictionary API JSON into internal DictionaryEntry
 */
export function normalizeFreeDictionaryResponse(word: string, rawData: any): DictionaryEntry | null {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return null;
  }

  const primary = rawData[0];
  if (!primary || typeof primary !== 'object') {
    return null;
  }

  const displayWord = truncateStr(primary.word || word, 100);
  const normalizedWord = displayWord.toLowerCase().replace(/\s+/g, ' ').trim();

  // Phonetic
  const phonetic = truncateStr(primary.phonetic, 100) || undefined;

  // Pronunciations
  const pronunciations: DictionaryPronunciation[] = [];
  if (Array.isArray(primary.phonetics)) {
    for (const p of primary.phonetics) {
      if (pronunciations.length >= MAX_PRONUNCIATIONS) break;
      if (typeof p === 'object' && p !== null) {
        const text = truncateStr(p.text, 100) || undefined;
        const audioUrl = sanitizeAudioUrl(p.audio);
        if (text || audioUrl) {
          pronunciations.push({
            text,
            audioUrl,
          });
        }
      }
    }
  }

  // Meanings & Definitions
  const meanings: DictionaryMeaning[] = [];
  const allSynonymsSet = new Set<string>();
  const allAntonymsSet = new Set<string>();

  if (Array.isArray(primary.meanings)) {
    for (const m of primary.meanings) {
      if (meanings.length >= MAX_MEANINGS) break;
      if (typeof m !== 'object' || m === null) continue;

      const partOfSpeech = truncateStr(m.partOfSpeech, 50) || 'unknown';
      const definitions: DictionaryDefinition[] = [];

      if (Array.isArray(m.definitions)) {
        for (const d of m.definitions) {
          if (definitions.length >= MAX_DEFINITIONS_PER_MEANING) break;
          if (typeof d !== 'object' || d === null) continue;

          const defText = truncateStr(d.definition, 800);
          if (!defText) continue;

          const example = truncateStr(d.example, 800) || undefined;
          const defSyns: string[] = [];
          const defAnts: string[] = [];

          if (Array.isArray(d.synonyms)) {
            for (const s of d.synonyms) {
              const cleaned = truncateStr(s, 60).toLowerCase();
              if (cleaned && !defSyns.includes(cleaned) && defSyns.length < 10) {
                defSyns.push(cleaned);
                if (allSynonymsSet.size < MAX_SYNONYMS) allSynonymsSet.add(cleaned);
              }
            }
          }

          if (Array.isArray(d.antonyms)) {
            for (const a of d.antonyms) {
              const cleaned = truncateStr(a, 60).toLowerCase();
              if (cleaned && !defAnts.includes(cleaned) && defAnts.length < 10) {
                defAnts.push(cleaned);
                if (allAntonymsSet.size < MAX_ANTONYMS) allAntonymsSet.add(cleaned);
              }
            }
          }

          definitions.push({
            definition: defText,
            example,
            synonyms: defSyns.length > 0 ? defSyns : undefined,
            antonyms: defAnts.length > 0 ? defAnts : undefined,
          });
        }
      }

      // Collect top-level meaning synonyms/antonyms if present
      if (Array.isArray(m.synonyms)) {
        for (const s of m.synonyms) {
          const cleaned = truncateStr(s, 60).toLowerCase();
          if (cleaned && allSynonymsSet.size < MAX_SYNONYMS) allSynonymsSet.add(cleaned);
        }
      }

      if (Array.isArray(m.antonyms)) {
        for (const a of m.antonyms) {
          const cleaned = truncateStr(a, 60).toLowerCase();
          if (cleaned && allAntonymsSet.size < MAX_ANTONYMS) allAntonymsSet.add(cleaned);
        }
      }

      if (definitions.length > 0) {
        meanings.push({
          partOfSpeech,
          definitions,
        });
      }
    }
  }

  return {
    schemaVersion: 1,
    id: `dict_${normalizedWord.replace(/[^a-z0-9]/g, '_')}`,
    word: displayWord,
    normalizedWord,
    phonetic: phonetic || pronunciations.find((p) => p.text)?.text,
    pronunciations,
    meanings,
    synonyms: Array.from(allSynonymsSet).slice(0, MAX_SYNONYMS),
    antonyms: Array.from(allAntonymsSet).slice(0, MAX_ANTONYMS),
    source: 'dictionaryapi',
    fetchedAt: Date.now(),
  };
}

export async function lookupFreeDictionary(word: string, timeoutMs = 5000): Promise<{
  entry: DictionaryEntry | null;
  status: number;
  error?: string;
}> {
  const normalized = encodeURIComponent(word.trim().toLowerCase());
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${normalized}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timer);

    if (response.status === 404) {
      return { entry: null, status: 404, error: 'Word not found in dictionary' };
    }

    if (!response.ok) {
      return {
        entry: null,
        status: response.status >= 500 ? 503 : response.status,
        error: `Dictionary provider returned status ${response.status}`,
      };
    }

    const data = await response.json();
    const normalizedEntry = normalizeFreeDictionaryResponse(word, data);
    if (!normalizedEntry) {
      return { entry: null, status: 404, error: 'Unable to parse dictionary entry' };
    }

    return { entry: normalizedEntry, status: 200 };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { entry: null, status: 504, error: 'Dictionary provider request timed out' };
    }
    return { entry: null, status: 503, error: 'Dictionary provider unavailable' };
  }
}
