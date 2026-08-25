import { ALL_CURRICULUM_LESSONS } from '../src/data/curriculum';
import { CEFRLevel } from '../src/types';

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  lessonId?: string;
  wordId?: string;
}

function isValidUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCurriculum(): { passed: boolean; stats: any; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const lessonIds = new Set<string>();
  const wordIds = new Set<string>();
  const imageDomains = new Set<string>();

  let totalItems = 0;
  let itemsWithImage = 0;
  let itemsWithoutImage = 0;

  const levelStats: Record<CEFRLevel, { lessons: number; items: number; withImage: number; withoutImage: number }> = {
    A1: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
    A2: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
    B1: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
    B2: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
    C1: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
    C2: { lessons: 0, items: 0, withImage: 0, withoutImage: 0 },
  };

  for (const lesson of ALL_CURRICULUM_LESSONS) {
    if (!lesson.id || lesson.id.trim() === '') {
      errors.push({ type: 'error', message: 'Lesson has empty ID' });
    } else if (lessonIds.has(lesson.id)) {
      errors.push({ type: 'error', message: `Duplicate lesson ID: ${lesson.id}`, lessonId: lesson.id });
    } else {
      lessonIds.add(lesson.id);
    }

    if (!lesson.title || lesson.title.trim() === '') {
      errors.push({ type: 'error', message: `Lesson ${lesson.id} has empty title`, lessonId: lesson.id });
    }

    if (lesson.imageUrl) {
      if (!isValidUrl(lesson.imageUrl)) {
        errors.push({ type: 'error', message: `Lesson ${lesson.id} has invalid imageUrl syntax: ${lesson.imageUrl}`, lessonId: lesson.id });
      } else {
        try {
          const domain = new URL(lesson.imageUrl).hostname;
          imageDomains.add(domain);
        } catch {}
      }
    }

    if (levelStats[lesson.level]) {
      levelStats[lesson.level].lessons++;
    }

    if (!Array.isArray(lesson.words) || lesson.words.length === 0) {
      errors.push({ type: 'error', message: `Lesson ${lesson.id} has no words array or is empty`, lessonId: lesson.id });
      continue;
    }

    for (const item of lesson.words) {
      totalItems++;
      if (levelStats[lesson.level]) {
        levelStats[lesson.level].items++;
      }

      if (!item.id || item.id.trim() === '') {
        errors.push({ type: 'error', message: `Item in lesson ${lesson.id} has empty ID`, lessonId: lesson.id });
      } else if (wordIds.has(item.id)) {
        errors.push({ type: 'error', message: `Duplicate word ID: ${item.id}`, lessonId: lesson.id, wordId: item.id });
      } else {
        wordIds.add(item.id);
      }

      if (!item.word || item.word.trim() === '') {
        errors.push({ type: 'error', message: `Item ${item.id} has empty word text`, lessonId: lesson.id, wordId: item.id });
      }

      if (!item.meaning || item.meaning.trim() === '') {
        errors.push({ type: 'error', message: `Item ${item.id} has empty meaning`, lessonId: lesson.id, wordId: item.id });
      }

      if (!item.example || item.example.trim() === '') {
        errors.push({ type: 'warning', message: `Item ${item.id} is missing example sentence`, lessonId: lesson.id, wordId: item.id });
      }

      if (item.imageUrl) {
        itemsWithImage++;
        if (levelStats[lesson.level]) {
          levelStats[lesson.level].withImage++;
        }
        if (!isValidUrl(item.imageUrl)) {
          errors.push({ type: 'error', message: `Item ${item.id} has invalid imageUrl syntax: ${item.imageUrl}`, lessonId: lesson.id, wordId: item.id });
        } else {
          try {
            const domain = new URL(item.imageUrl).hostname;
            imageDomains.add(domain);
          } catch {}
        }
      } else {
        itemsWithoutImage++;
        if (levelStats[lesson.level]) {
          levelStats[lesson.level].withoutImage++;
        }
        // Warn for concrete words in A1/A2 if missing image
        if ((lesson.level === 'A1' || lesson.level === 'A2') && item.type === 'word') {
          errors.push({
            type: 'warning',
            message: `[${lesson.level}] Concrete word '${item.word}' in lesson '${lesson.title}' has no imageUrl.`,
            lessonId: lesson.id,
            wordId: item.id,
          });
        }
      }
    }
  }

  const criticalErrors = errors.filter((e) => e.type === 'error');
  const warnings = errors.filter((e) => e.type === 'warning');

  return {
    passed: criticalErrors.length === 0,
    stats: {
      totalLessons: ALL_CURRICULUM_LESSONS.length,
      totalItems,
      itemsWithImage,
      itemsWithoutImage,
      imageDomains: Array.from(imageDomains),
      levelStats,
      errorCount: criticalErrors.length,
      warningCount: warnings.length,
    },
    errors,
  };
}

if (process.argv[1] && process.argv[1].endsWith('validateCurriculum.ts')) {
  console.log('=== Running FlipEnglish Curriculum Integrity & Visual Audit ===\n');
  const result = validateCurriculum();

  console.log(`Total Lessons: ${result.stats.totalLessons} (Expected: 72)`);
  console.log(`Total Learning Items: ${result.stats.totalItems}`);
  console.log(`Items with imageUrl: ${result.stats.itemsWithImage}`);
  console.log(`Items without imageUrl (Text-First / Abstract): ${result.stats.itemsWithoutImage}`);
  console.log(`External Image Domains: ${result.stats.imageDomains.join(', ')}\n`);

  console.log('Breakdown by Level:');
  for (const [lvl, s] of Object.entries(result.stats.levelStats as Record<string, any>)) {
    console.log(`  - ${lvl}: ${s.lessons} lessons, ${s.items} items (${s.withImage} visual, ${s.withoutImage} text-first)`);
  }

  if (result.errors.length > 0) {
    console.log(`\nAudit Findings (${result.stats.errorCount} errors, ${result.stats.warningCount} warnings):`);
    for (const err of result.errors) {
      const prefix = err.type === 'error' ? '❌ [ERROR]' : '⚠️ [WARN]';
      console.log(`  ${prefix} ${err.message}`);
    }
  }

  if (!result.passed) {
    console.error('\n❌ Curriculum validation failed with critical errors.');
    process.exit(1);
  } else {
    console.log('\n✅ Curriculum validation passed successfully.');
  }
}
