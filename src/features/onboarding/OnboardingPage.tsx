import React, { useState } from 'react';
import { CEFRLevel } from '../../types';
import { UiLanguageMode, useI18n } from '../i18n';
import { OnboardingRoute } from './onboardingTypes';
import { saveOnboardingState } from './onboardingStorage';
import { LanguageStep } from './LanguageStep';
import { StartingPointStep } from './StartingPointStep';
import { LevelChoiceStep } from './LevelChoiceStep';

interface OnboardingPageProps {
  onComplete: (route: OnboardingRoute, level?: CEFRLevel) => void;
  onSkip: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onComplete,
  onSkip,
}) => {
  const { mode, setMode } = useI18n();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<UiLanguageMode>(mode);

  const handleLanguageContinue = () => {
    setMode(selectedLanguage, true);
    setCurrentStep(2);
  };

  const handleSelectRoute = (route: OnboardingRoute) => {
    if (route === 'know') {
      setCurrentStep(3);
    } else {
      saveOnboardingState({
        status: 'completed',
        selectedLanguage,
        selectedRoute: route,
        completedAt: Date.now(),
      });
      onComplete(route);
    }
  };

  const handleSelectLevel = (level: CEFRLevel) => {
    saveOnboardingState({
      status: 'completed',
      selectedLanguage,
      selectedRoute: 'know',
      selectedLevel: level,
      completedAt: Date.now(),
    });
    onComplete('know', level);
  };

  const handleSkip = () => {
    saveOnboardingState({
      status: 'skipped',
      selectedLanguage,
      completedAt: Date.now(),
    });
    onSkip();
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Flip<span className="text-indigo-600">English</span>
        </span>
        <div className="flex items-center justify-center gap-2 mt-3">
          <div
            className={`h-1.5 w-12 rounded-full transition-colors ${
              currentStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-1.5 w-12 rounded-full transition-colors ${
              currentStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />
          {currentStep === 3 && (
            <div className="h-1.5 w-12 rounded-full bg-indigo-600 transition-colors" />
          )}
        </div>
      </div>

      {currentStep === 1 && (
        <LanguageStep
          selectedLanguage={selectedLanguage}
          onSelectLanguage={(lang) => {
            setSelectedLanguage(lang);
            setMode(lang, false);
          }}
          onContinue={handleLanguageContinue}
        />
      )}

      {currentStep === 2 && (
        <StartingPointStep
          onSelectRoute={handleSelectRoute}
          onBack={() => setCurrentStep(1)}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 3 && (
        <LevelChoiceStep
          onSelectLevel={handleSelectLevel}
          onBack={() => setCurrentStep(2)}
        />
      )}
    </div>
  );
};
