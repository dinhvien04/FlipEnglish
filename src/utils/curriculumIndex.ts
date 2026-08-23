import { Lesson, VocabWord, CEFRLevel } from '../types';
import { ALL_CURRICULUM_LESSONS } from '../data/curriculum';

export interface IndexedCurriculumItem {
  word: VocabWord;
  lesson: Lesson;
  level: CEFRLevel;
}

// Module-level memoized curriculum index for instant O(1) resolution
let cachedMap: Map<string, IndexedCurriculumItem> | null = null;
let cachedWordToLessonMap: Map<string, IndexedCurriculumItem> | null = null;

function buildCurriculumIndex() {
  if (cachedMap && cachedWordToLessonMap) return;

  const idMap = new Map<string, IndexedCurriculumItem>();
  const wordTextMap = new Map<string, IndexedCurriculumItem>();

  for (const lesson of ALL_CURRICULUM_LESSONS) {
    for (const word of lesson.words) {
      const item: IndexedCurriculumItem = {
        word,
        lesson,
        level: lesson.level,
      };

      idMap.set(word.id, item);

      // Also index lowercase word text for matching exam targets
      const normText = word.word.trim().toLowerCase();
      if (!wordTextMap.has(normText)) {
        wordTextMap.set(normText, item);
      }
      if (word.expression) {
        const normExp = word.expression.trim().toLowerCase();
        if (!wordTextMap.has(normExp)) {
          wordTextMap.set(normExp, item);
        }
      }
    }
  }

  cachedMap = idMap;
  cachedWordToLessonMap = wordTextMap;
}

/**
 * Resolves a curriculum item by canonical item ID in O(1) time.
 */
export function resolveCurriculumItem(itemId: string): IndexedCurriculumItem | undefined {
  if (!cachedMap) {
    buildCurriculumIndex();
  }
  return cachedMap!.get(itemId);
}

/**
 * Resolves a curriculum item by matching English text or expression (useful for exam question targets).
 */
export function resolveCurriculumItemByText(text: string): IndexedCurriculumItem | undefined {
  if (!cachedWordToLessonMap) {
    buildCurriculumIndex();
  }
  const norm = text.trim().toLowerCase();
  return cachedWordToLessonMap!.get(norm);
}

/**
 * Returns all canonical item IDs across the entire curriculum.
 */
export function getAllCurriculumItemIds(): string[] {
  if (!cachedMap) {
    buildCurriculumIndex();
  }
  return Array.from(cachedMap!.keys());
}

/**
 * Returns all item IDs for a specific lesson.
 */
export function getLessonItemIds(lessonId: string): string[] {
  const lesson = ALL_CURRICULUM_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return [];
  return lesson.words.map((w) => w.id);
}
