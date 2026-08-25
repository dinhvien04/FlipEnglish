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

export function validateOnboardingState(data: any): data is OnboardingState {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!VALID_STATUSES.has(data.status)) return false;
  if (!isValidUiLanguageMode(data.selectedLanguage)) return false;
  if (data.selectedRoute !== undefined && !VALID_ROUTES.has(data.selectedRoute)) return false;
  if (data.selectedLevel !== undefined && !VALID_LEVELS.has(data.selectedLevel)) return false;
  if (data.completedAt !== undefined && (typeof data.completedAt !== 'number' || !Number.isFinite(data.completedAt))) {
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
    // ignore
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
 * If true, returning learners are NOT forced through blocking onboarding.
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

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const state = loadOnboardingState();
  if (state && (state.status === 'completed' || state.status === 'skipped')) {
    return false;
  }
  if (hasMeaningfulExistingLearnerData()) {
    // Automatically flag returning users as completed so onboarding never interrupts them
    saveOnboardingState({
      status: 'completed',
      selectedLanguage: 'vi',
      completedAt: Date.now(),
    });
    return false;
  }
  return true;
}
