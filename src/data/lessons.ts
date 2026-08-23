import { Lesson } from '../types';
import { ALL_CURRICULUM_LESSONS } from './curriculum';

export const LESSONS: Lesson[] = ALL_CURRICULUM_LESSONS;

export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export { ALL_CURRICULUM_LESSONS } from './curriculum';
