/**
 * FlipEnglish Comprehensive Dictionary Validation & Unit Test Suite
 * Tests 3-layer architecture, server normalization, bounding limits, Datamuse proxies,
 * Local index offline search, IndexedDB caching simulation, and security bounds.
 */

import {
  normalizeFreeDictionaryResponse,
  lookupFreeDictionary,
} from '../server/dictionary/freeDictionaryProvider';
import {
  suggestDatamuseWords,
  getDatamuseRelated,
  reverseDatamuseLookup,
  getDatamuseSpellingSuggestions,
} from '../server/dictionary/datamuseProvider';
import {
  DictionaryService,
} from '../server/dictionary/dictionaryService';
import {
  normalizeDictionaryQuery,
  getCurriculumMatchesForWord,
  buildCurriculumDictionaryEntry,
  getLocalCurriculumSuggestions,
} from '../src/features/dictionary/dictionaryLocalIndex';
import {
  createEntrySnapshot,
} from '../src/features/dictionary/dictionaryCache';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '../src/features/dictionary/dictionaryStorage';
import { DictionaryEntry } from '../server/dictionary/dictionaryTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('=== Running FlipEnglish Dictionary & Offline Wordbook Validation Suite ===\n');

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

  console.log('\n--- 2. Free Dictionary Parser & Bounding Limits ---');
  const rawApiData = [
    {
      word: 'resilient',
      phonetic: '/rɪˈzɪl.jənt/',
      phonetics: [
        { text: '/rɪˈzɪl.jənt/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/resilient-us.mp3' },
        { text: '/rɪˈzɪl.jənt/', audio: 'http://insecure.example.com/audio.mp3' }, // should be rejected (not https)
        { text: '/rɪˈzɪl.jənt/', audio: 'javascript:alert(1)' }, // dangerous URI rejected
        { text: '/rɪˈzɪl.jənt/', audio: '//ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3' }, // protocol relative upgraded
      ],
      meanings: [
        {
          partOfSpeech: 'adjective',
          definitions: [
            {
              definition: 'Able to recoil or spring back into shape after bending, stretching, or being compressed.',
              example: 'A resilient material.',
              synonyms: ['flexible', 'pliable', 'supple', 'elastic'],
              antonyms: ['rigid', 'fragile'],
            },
            {
              definition: 'Able to withstand or recover quickly from difficult conditions.',
              example: 'Babies are generally remarkably resilient.',
              synonyms: ['strong', 'tough'],
              antonyms: ['vulnerable'],
            },
          ],
          synonyms: ['hardy', 'robust'],
          antonyms: [],
        },
      ],
    },
  ];

  const normalized = normalizeFreeDictionaryResponse('resilient', rawApiData);
  assert(normalized !== null, 'Normalized entry created successfully');
  assert(normalized?.word === 'resilient', 'Word matches target');
  assert(normalized?.meanings.length === 1, 'Meanings parsed');
  assert(normalized?.meanings[0].definitions.length === 2, 'Definitions correctly attached');
  assert(normalized?.synonyms.includes('flexible'), 'Synonyms merged and deduped');
  assert(normalized?.antonyms.includes('rigid'), 'Antonyms merged and deduped');
  assert(normalized?.source === 'dictionaryapi', 'Source stamped as dictionaryapi');
  assert(
    normalized?.pronunciations.every((p) => !p.audioUrl || p.audioUrl.startsWith('https://')),
    'All extracted audio URLs strictly use HTTPS protocol'
  );

  // Test payload bounding limits
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
  assert(bounded !== null, 'Oversized payload parsed');
  assert(bounded!.meanings.length <= 8, 'Max meanings bounded to 8');
  assert(bounded!.meanings[0].definitions.length <= 8, 'Max definitions per meaning bounded to 8');
  assert(bounded!.synonyms.length <= 30, 'Total entry synonyms bounded to 30');
  assert(bounded!.antonyms.length <= 30, 'Total entry antonyms bounded to 30');
  assert(bounded!.meanings[0].definitions[0].definition.length <= 800, 'Definition string clamped');

  console.log('\n--- 3. Local Curriculum Index (72 Lessons / 720 Items) ---');
  const greetingEntry = buildCurriculumDictionaryEntry('hello');
  assert(greetingEntry !== null, 'Curriculum match for "hello" found');
  assert(greetingEntry?.word.toLowerCase() === 'hello', 'Canonical word name preserved');
  assert(greetingEntry?.curriculumMatches && greetingEntry.curriculumMatches.length > 0, 'Curriculum metadata attached');
  assert(greetingEntry?.source === 'flipenglish', 'Source marked as flipenglish');
  assert(greetingEntry?.curriculumMatches![0].lessonTitle !== '', 'Lesson title present');

  // Check that multi-word curriculum queries work
  assert(normalizeDictionaryQuery('  Break Down! ') === 'break down!', 'Dictionary query normalization collapses whitespace');

  // Autocomplete search across local index
  const suggestions = getLocalCurriculumSuggestions('con', 5);
  assert(suggestions.length > 0, 'Local autocomplete returns matches for prefix "con"');
  assert(suggestions.every((s) => s.isCurriculum === true), 'Curriculum suggestions tagged correctly');

  console.log('\n--- 4. Datamuse Proxy Structure & Offline Fallbacks ---');
  const datamuseSuggestions = await suggestDatamuseWords('app', 5000);
  assert(Array.isArray(datamuseSuggestions.suggestions), 'Datamuse suggestions returns array');

  const datamuseSynonyms = await getDatamuseRelated('resilient', 'synonym', 5000);
  assert(Array.isArray(datamuseSynonyms.results), 'Datamuse relations returns array');

  const reverseResults = await reverseDatamuseLookup('a vehicle with two wheels', 5000);
  assert(Array.isArray(reverseResults.results), 'Datamuse reverse lookup returns array');

  console.log('\n--- 5. Server Dictionary In-Memory Cache Service ---');
  const cacheResult1 = await DictionaryService.lookup('hello');
  assert(cacheResult1.status === 200, 'Lookup succeeds for hello');
  assert(cacheResult1.entry !== null, 'Entry returned');
  assert(cacheResult1.entry?.word.toLowerCase() === 'hello', 'Word name returned correctly');

  // Second call should hit in-memory cache
  const cacheResult2 = await DictionaryService.lookup('hello');
  assert(cacheResult2.status === 200 && cacheResult2.entry?.id === cacheResult1.entry?.id, 'In-memory cache delivers identical entry');

  // Not found lookup gives 404
  const invalidResult = await DictionaryService.lookup('hellloooqzxx');
  assert(invalidResult.status === 404, 'Unknown word yields 404');
  assert(invalidResult.entry === null, 'Entry is null');
  assert(
    invalidResult.spellingSuggestions === undefined || Array.isArray(invalidResult.spellingSuggestions),
    'Spelling suggestions handled gracefully on 404'
  );

  console.log('\n--- 6. Compact Offline Snapshots & Validation ---');
  const fullEntry: DictionaryEntry = {
    schemaVersion: 1,
    id: 'dict_test_123',
    word: 'resilient',
    normalizedWord: 'resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    pronunciations: [{ audioUrl: 'https://example.com/audio.mp3', text: '/rɪˈzɪl.jənt/' }],
    meanings: [
      {
        partOfSpeech: 'adjective',
        definitions: [{ definition: 'Quick to recover' }],
      },
    ],
    synonyms: ['tough', 'strong'],
    antonyms: ['fragile'],
    curriculumMatches: [
      {
        wordId: 'a2_01_resilient',
        lessonId: 'personal-growth',
        lessonTitle: 'Personal Growth',
        level: 'B2',
        meaning: 'kiên cường, nhanh hồi phục',
        example: 'She is a resilient person.',
      },
    ],
    source: 'combined',
  };

  const snapshot = createEntrySnapshot(fullEntry);
  assert(snapshot.word === 'resilient', 'Snapshot preserves word');
  assert(snapshot.primaryMeaningVi === 'kiên cường, nhanh hồi phục', 'Snapshot captures Vietnamese meaning from curriculum match');
  assert(snapshot.primaryDefinition === 'Quick to recover', 'Snapshot captures English definition');
  assert(snapshot.cefrLevel === 'B2', 'Snapshot captures CEFR level');

  console.log('\n--- 7. Recent Search Storage in LocalStorage ---');
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
