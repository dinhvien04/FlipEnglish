import { Lesson, CEFRLevel } from '../../types';
import { A1_LESSONS } from './a1';
import { A2_LESSONS } from './a2';
import { B1_LESSONS } from './b1';
import { B2_LESSONS } from './b2';
import { C1_LESSONS } from './c1';
import { C2_LESSONS } from './c2';
import { CEFR_LEVELS } from './curriculumMeta';

export { CEFR_LEVELS } from './curriculumMeta';
export { A1_LESSONS } from './a1';
export { A2_LESSONS } from './a2';
export { B1_LESSONS } from './b1';
export { B2_LESSONS } from './b2';
export { C1_LESSONS } from './c1';
export { C2_LESSONS } from './c2';

export const ALL_CURRICULUM_LESSONS: Lesson[] = [
  ...A1_LESSONS,
  ...A2_LESSONS,
  ...B1_LESSONS,
  ...B2_LESSONS,
  ...C1_LESSONS,
  ...C2_LESSONS,
];

export function getLessonsByLevel(level: CEFRLevel): Lesson[] {
  switch (level) {
    case 'A1': return A1_LESSONS;
    case 'A2': return A2_LESSONS;
    case 'B1': return B1_LESSONS;
    case 'B2': return B2_LESSONS;
    case 'C1': return C1_LESSONS;
    case 'C2': return C2_LESSONS;
    default: return A1_LESSONS;
  }
}

export function getLessonById(id: string): Lesson | undefined {
  return ALL_CURRICULUM_LESSONS.find((l) => l.id === id);
}

export function getLevelMeta(level: CEFRLevel) {
  return CEFR_LEVELS.find((lvl) => lvl.level === level) || CEFR_LEVELS[0];
}
