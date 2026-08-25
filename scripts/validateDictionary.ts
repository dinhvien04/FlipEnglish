/**
 * FlipEnglish Comprehensive Deterministic Dictionary Validation Suite
 * 100% deterministic unit & contract tests using fixtures and mock fetch.
 * Zero live network calls to external APIs.
 */

import {
  normalizeFreeDictionaryResponse,
  sanitizeAudioUrl,
} from '../server/dictionary/freeDictionaryProvider';
import {
  suggestDatamuseWords,
  getDatamuseRelated,
  reverseDatamuseLookup,
} from '../server/dictionary/datamuseProvider';
import {
  DictionaryService,
} from '../server/dictionary/dictionaryService';
import {
  normalizeDictionaryQuery,
  getCurriculumMatchesForWord,
  buildCurriculumDictionaryEntry,
  getLocalCurriculumSuggestions,
  buildDictionaryEntryFromSavedSnapshot,
} from '../src/features/dictionary/dictionaryLocalIndex';
import {
  createEntrySnapshot,
} from '../src/features/dictionary/dictionaryCache';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '../src/features/dictionary/dictionaryStorage';
import {
  isValidDictionaryEntry,
  isValidSavedDictionaryWord,
  isValidDictionaryEntrySnapshot,
} from '../src/features/dictionary/dictionaryValidation';
import {
  DictionaryEntry,
  SavedDictionaryWord,
} from '../src/features/dictionary/dictionaryTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('=== Running FlipEnglish Deterministic Dictionary Validation Suite ===\n');

// Mock localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    },
  };
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: (global as any).localStorage,
  };
}

const SAFE_WORD_REGEX = /^[\p{L}\p{M}\s'-]{1,80}$/u;
const SAFE_DESC_REGEX = /^[\p{L}\p{M}\p{N}\s',.?!-]{1,150}$/u;

async function runTests() {
  console.log('--- 1. Input Sanitization & Regex Guards ---');
  assert(SAFE_WORD_REGEX.test('hello'), 'Valid single word passes');
  assert(SAFE_WORD_REGEX.test('break down'), 'Valid multi-word expression passes');
  assert(SAFE_WORD_REGEX.test("it's-a-deal"), 'Valid word with apostrophe and hyphen passes');
  assert(!SAFE_WORD_REGEX.test('<script>alert(1)</script>'), 'XSS payload in word rejected');
  assert(!SAFE_WORD_REGEX.test('hello; DROP TABLE entries;'), 'SQL injection attempt rejected');
  assert(!SAFE_WORD_REGEX.test('word/../etc/passwd'), 'Path traversal rejected');
  assert(!SAFE_WORD_REGEX.test(''), 'Empty word rejected');
  assert(!SAFE_WORD_REGEX.test('a'.repeat(85)), 'Word over 80 characters rejected');

  assert(SAFE_DESC_REGEX.test('a person who designs buildings'), 'Valid reverse description passes');
  assert(!SAFE_DESC_REGEX.test('<img src=x onerror=alert(1)>'), 'HTML in description rejected');
  assert(!SAFE_DESC_REGEX.test(''), 'Empty description rejected');
  assert(!SAFE_DESC_REGEX.test('a'.repeat(161)), 'Description over 150 characters rejected');

  console.log('\n--- 2. Audio URL Sanitization & Allowlist ---');
  assert(
    sanitizeAudioUrl('https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3') !== undefined,
    'Valid https audio on api.dictionaryapi.dev is allowed'
  );
  assert(
    sanitizeAudioUrl('//ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3') !== undefined,
    'Protocol-relative url on ssl.gstatic.com upgraded to https and allowed'
  );
  assert(
    sanitizeAudioUrl('http://api.dictionaryapi.dev/audio.mp3') === undefined,
    'Non-https audio rejected'
  );
  assert(
    sanitizeAudioUrl('https://untrusted-domain.com/evil.mp3') === undefined,
    'Audio from non-allowlisted domain rejected'
  );
  assert(
    sanitizeAudioUrl('javascript:alert(1)') === undefined,
    'JavaScript scheme audio rejected'
  );

  console.log('\n--- 3. Multi-Entry Normalization & Bound Limits ---');
  const multiEntryApiData = [
    {
      word: 'run',
      phonetic: '/rʌn/',
      phonetics: [
        { text: '/rʌn/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/run-us.mp3' },
      ],
      meanings: [
        {
          partOfSpeech: 'verb',
          definitions: [
            {
              definition: 'To move fast on foot.',
              example: 'He runs every morning.',
              synonyms: ['sprint', 'jog'],
              antonyms: ['walk', 'crawl'],
            },
          ],
          synonyms: ['dash'],
          antonyms: [],
        },
      ],
    },
    {
      word: 'run',
      phonetic: '/rʌn/',
      phonetics: [
        { text: '/rʌn/', audio: 'https://ssl.gstatic.com/run-uk.mp3' },
      ],
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'An act of running.',
              example: 'I went for a 5k run.',
              synonyms: ['jog'],
            },
          ],
        },
      ],
    },
  ];

  const merged = normalizeFreeDictionaryResponse('run', multiEntryApiData);
  assert(merged !== null, 'Normalized multi-entry response created successfully');
  assert(merged?.word === 'run', 'Word matches target');
  assert(merged?.meanings.length === 2, 'Both verb and noun meanings merged');
  assert(merged?.pronunciations.length === 2, 'Both distinct pronunciations preserved');
  assert(merged?.synonyms.includes('sprint') && merged?.synonyms.includes('dash'), 'Synonyms aggregated across entries');

  // Payload bounding limits
  const oversizedData = [
    {
      word: 'test',
      meanings: Array.from({ length: 20 }, (_, i) => ({
        partOfSpeech: `noun_${i}`,
        definitions: Array.from({ length: 20 }, (__, j) => ({
          definition: `Definition ${j} ` + 'x'.repeat(1200),
          example: `Example ${j} ` + 'y'.repeat(1000),
          synonyms: Array.from({ length: 50 }, (___, k) => `syn_${k}`),
          antonyms: Array.from({ length: 50 }, (___, k) => `ant_${k}`),
        })),
        synonyms: Array.from({ length: 50 }, (_, k) => `msyn_${k}`),
        antonyms: Array.from({ length: 50 }, (_, k) => `mant_${k}`),
      })),
    },
  ];

  const bounded = normalizeFreeDictionaryResponse('test', oversizedData);
  assert(bounded !== null, 'Oversized payload normalized');
  assert(bounded!.meanings.length <= 8, 'Max meanings bounded to 8');
  assert(bounded!.meanings[0].definitions.length <= 8, 'Max definitions per meaning bounded to 8');
  assert(bounded!.synonyms.length <= 30, 'Total entry synonyms bounded to 30');
  assert(bounded!.antonyms.length <= 30, 'Total entry antonyms bounded to 30');
  assert(bounded!.meanings[0].definitions[0].definition.length <= 800, 'Definition string length clamped');

  console.log('\n--- 4. Local Curriculum Index (72 Lessons / 720 Items) ---');
  const greetingEntry = buildCurriculumDictionaryEntry('hello');
  assert(greetingEntry !== null, 'Curriculum match for "hello" found');
  assert(greetingEntry?.word.toLowerCase() === 'hello', 'Canonical word name preserved');
  assert(greetingEntry?.curriculumMatches && greetingEntry.curriculumMatches.length > 0, 'Curriculum metadata attached');
  assert(greetingEntry?.source === 'flipenglish', 'Source marked as flipenglish');
  assert(greetingEntry?.curriculumMatches![0].lessonTitle !== '', 'Lesson title present');

  assert(normalizeDictionaryQuery('  Break Down! ') === 'break down!', 'Query normalization collapses whitespace');

  const suggestions = getLocalCurriculumSuggestions('con', 5);
  assert(suggestions.length > 0, 'Local autocomplete returns matches for prefix "con"');
  assert(suggestions.every((s) => s.isCurriculum === true), 'Curriculum suggestions tagged correctly');

  console.log('\n--- 5. Saved Word Snapshot Reconstitution & Offline Fallback ---');
  const savedWordItem: SavedDictionaryWord = {
    schemaVersion: 1,
    id: 'saved_resilient',
    normalizedWord: 'resilient',
    displayWord: 'resilient',
    savedAt: 1700000000000,
    source: 'dictionary',
    snapshot: {
      word: 'resilient',
      normalizedWord: 'resilient',
      phonetic: '/rɪˈzɪl.jənt/',
      primaryPartOfSpeech: 'adjective',
      primaryDefinition: 'Able to recover quickly from difficult conditions.',
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3',
      cefrLevel: 'B2',
      lessonTitle: 'Personal Growth',
    },
  };

  const reconstituted = buildDictionaryEntryFromSavedSnapshot(savedWordItem);
  assert(reconstituted !== null, 'Reconstituted entry built from snapshot');
  assert(reconstituted.word === 'resilient', 'Reconstituted word preserved');
  assert(reconstituted.meanings.length > 0, 'Meanings populated from snapshot');
  assert(reconstituted.meanings[0].partOfSpeech === 'adjective', 'Part of speech mapped');
  assert(isValidDictionaryEntry(reconstituted), 'Reconstituted entry satisfies strict runtime validator');

  console.log('\n--- 6. Runtime Schema Validators ---');
  assert(isValidDictionaryEntry(reconstituted), 'Valid dictionary entry passes validator');
  assert(!isValidDictionaryEntry({ word: 'bad' }), 'Malformed dictionary entry rejected');

  assert(isValidSavedDictionaryWord(savedWordItem), 'Valid saved word passes validator');
  assert(!isValidSavedDictionaryWord({ schemaVersion: 2, id: 'bad' }), 'Invalid schema version rejected');

  assert(isValidDictionaryEntrySnapshot(savedWordItem.snapshot), 'Valid snapshot passes validator');

  console.log('\n--- 7. Mocked Datamuse & Dictionary Provider Tests (Zero Live Network) ---');
  // Store original fetch
  const originalFetch = global.fetch;

  try {
    // Install Mock Fetch
    (global as any).fetch = async (url: string) => {
      const urlStr = String(url);

      if (urlStr.includes('api.datamuse.com/sug?s=app')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ word: 'apple', score: 1000 }, { word: 'application', score: 900 }],
        };
      }

      if (urlStr.includes('rel_syn=')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ word: 'flexible', score: 800 }, { word: 'supple', score: 750 }],
        };
      }

      if (urlStr.includes('ml=')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { word: 'bicycle', score: 1000, defs: ['n\ta two-wheeled vehicle'] },
          ],
        };
      }

      if (urlStr.includes('api.dictionaryapi.dev/api/v2/entries/en/mocktest')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              word: 'mocktest',
              phonetic: '/mɒk/',
              meanings: [
                {
                  partOfSpeech: 'noun',
                  definitions: [{ definition: 'A simulated examination or trial.' }],
                },
              ],
            },
          ],
        };
      }

      if (urlStr.includes('api.dictionaryapi.dev/api/v2/entries/en/unknown404word')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ title: 'No Definitions Found' }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => [],
      };
    };

    const datamuseSuggestions = await suggestDatamuseWords('app', 5000);
    assert(datamuseSuggestions.suggestions.length === 2, 'Datamuse suggestions parsed correctly from mock');

    const datamuseSynonyms = await getDatamuseRelated('resilient', 'synonym', 5000);
    assert(datamuseSynonyms.results.includes('flexible'), 'Datamuse relations parsed from mock');

    const reverseResults = await reverseDatamuseLookup('a vehicle with two wheels', 5000);
    assert(reverseResults.results[0].word === 'bicycle', 'Datamuse reverse lookup parsed from mock');

    const mockLookupSuccess = await DictionaryService.lookup('mocktest');
    assert(mockLookupSuccess.status === 200 && mockLookupSuccess.entry !== null, 'Mock provider lookup returns entry');

    const mockLookup404 = await DictionaryService.lookup('unknown404word');
    assert(mockLookup404.status === 404, 'Mock unknown word yields 404');
  } finally {
    // Restore fetch
    (global as any).fetch = originalFetch;
  }

  console.log('\n--- 8. Recent Search Storage in LocalStorage ---');
  clearRecentSearches();
  assert(getRecentSearches().length === 0, 'Recent searches starts empty');

  addRecentSearch('resilient');
  addRecentSearch('perseverance');
  addRecentSearch('hello');

  let searches = getRecentSearches();
  assert(searches.length === 3, '3 recent searches saved');
  assert(searches[0].word === 'hello', 'Most recent search appears at front');

  // De-duplication test: re-searching 'resilient' brings it to top
  addRecentSearch('resilient');
  searches = getRecentSearches();
  assert(searches.length === 3, 'Duplicates prevented');
  assert(searches[0].word === 'resilient', 'Re-searched word moved to top');

  clearRecentSearches();
  assert(getRecentSearches().length === 0, 'History cleared completely');

  console.log('\n============================================================');
  console.log('🎉 ALL FLIPENGLISH DICTIONARY TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
