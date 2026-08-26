import { PlacementQuestion, ORDERED_CEFR_LEVELS } from './placementTypes';

/**
 * Normalizes text for comparison: trim, lowercase, collapse whitespace, strip punctuation.
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Validates whether a candidate question satisfies strict placement quality criteria:
 * - non-empty ID and prompt
 * - exactly 4 options
 * - 4 unique options case-insensitively & normalized
 * - exactly one correct answer matching one of the options
 * - valid CEFR level
 * - reading questions have passage
 * - listening questions have audioPromptText
 */
export function isValidPlacementQuestion(q: PlacementQuestion): boolean {
  if (!q.id || !q.prompt || !q.prompt.trim()) return false;
  if (!q.correctAnswer || !q.correctAnswer.trim()) return false;
  if (!q.options || q.options.length !== 4) return false;
  if (!ORDERED_CEFR_LEVELS.includes(q.level)) return false;

  const optionTexts = q.options.map((o) => o.text.trim());
  if (optionTexts.some((t) => !t)) return false;

  // Unique options case-insensitively and whitespace/punctuation normalized
  const normTexts = optionTexts.map(normalizeText);
  const uniqueNorm = new Set(normTexts);
  if (uniqueNorm.size !== 4) return false;

  // Correct answer must exist in options
  const normCorrect = normalizeText(q.correctAnswer);
  const hasMatch = optionTexts.some((t) => normalizeText(t) === normCorrect);
  if (!hasMatch) return false;

  if (q.skill === 'reading') {
    if (!q.passage || !q.passage.trim()) return false;
  }

  if (q.skill === 'listening') {
    if (!q.audioPromptText || !q.audioPromptText.trim()) return false;
  }

  return true;
}
