import { OnboardingState } from './onboardingTypes';
import { isValidUiLanguageMode } from '../i18n';
import { getStoredProgress } from '../../utils/storage';
import { getReviewDashboardStats } from '../../utils/reviewStorage';
import { getLatestPlacementResult } from '../placement/placementStorage';
import { getExamHistory } from '../../utils/examStorage';
import { getRecentSearches } from '../dictionary/dictionaryStorage';

export const ONBOARDING_STORAGE_KEY = 'flipenglish_onboarding_v1';
export const ONBOARDING_UPDATED_EVENT = 'flipenglish_onboarding_updated';

const VALID_STATUSES = new Set(['pending', 'completed', 'skipped']);
const VALID_ROUTES = new Set(['unknown', 'know', 'explore']);
const VALID_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

export function validateOnboardingState(data: unknown): data is OnboardingState {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.status !== 'string' || !VALID_STATUSES.has(obj.status)) return false;
  if (obj.selectedLanguage !== undefined && !isValidUiLanguageMode(obj.selectedLanguage)) return false;
  if (obj.selectedRoute !== undefined && (typeof obj.selectedRoute !== 'string' || !VALID_ROUTES.has(obj.selectedRoute))) return false;
  if (obj.selectedLevel !== undefined && (typeof obj.selectedLevel !== 'string' || !VALID_LEVELS.has(obj.selectedLevel))) return false;
  if (obj.completedAt !== undefined && (typeof obj.completedAt !== 'number' || !Number.isFinite(obj.completedAt))) {
    return false;
  }
  return true;
}

export function loadOnboardingState(): OnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validateOnboardingState(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    if (!validateOnboardingState(state)) return;
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(ONBOARDING_UPDATED_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    window.dispatchEvent(new Event(ONBOARDING_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Checks whether an existing user has meaningful study history.
 * Used for returning user backwards compatibility and reducing beginner guidance.
 */
export function hasMeaningfulExistingLearnerData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Lessons progress
    const progress = getStoredProgress();
    if (Object.keys(progress).length > 0) return true;

    // 2. Review tracked items
    const review = getReviewDashboardStats();
    if (review.totalTracked > 0) return true;

    // 3. Placement tests completed
    const placement = getLatestPlacementResult();
    if (placement) return true;

    // 4. Saved/Recent vocabulary searches
    const recent = getRecentSearches();
    if (recent.length > 0) return true;

    // 5. Exam sessions
    const exams = getExamHistory();
    if (exams.length > 0) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * PURE read-only helper to decide if onboarding should be displayed.
 * MUST NOT perform any localStorage writes or dispatch any events.
 */
export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const state = loadOnboardingState();
  if (state && (state.status === 'completed' || state.status === 'skipped')) {
    return false;
  }
  if (hasMeaningfulExistingLearnerData()) {
    return false;
  }
  return true;
}

/**
 * Idempotent background migration for returning learners with existing data.
 * Called outside of render phase (e.g. in App.tsx useEffect).
 */
export function migrateOnboardingStateForExistingUser(): void {
  if (typeof window === 'undefined') return;
  const state = loadOnboardingState();
  if (!state && hasMeaningfulExistingLearnerData()) {
    saveOnboardingState({
      status: 'completed',
      completedAt: Date.now(),
    });
  }
}
