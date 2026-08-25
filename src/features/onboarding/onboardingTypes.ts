import { CEFRLevel } from '../../types';
import { UiLanguageMode } from '../i18n';

export type OnboardingRoute = 'unknown' | 'know' | 'explore';

export interface OnboardingState {
  status: 'pending' | 'completed' | 'skipped';
  selectedLanguage?: UiLanguageMode;
  selectedRoute?: OnboardingRoute;
  selectedLevel?: CEFRLevel;
  completedAt?: number;
}
