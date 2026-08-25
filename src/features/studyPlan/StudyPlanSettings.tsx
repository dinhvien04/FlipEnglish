import React from 'react';
import { AllowedDailyMinutes, ALLOWED_DAILY_MINUTES } from './studyPlanTypes';

interface StudyPlanSettingsModalProps {
  currentMinutes: AllowedDailyMinutes;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newMinutes: AllowedDailyMinutes) => void;
}

export const StudyPlanSettingsModal: React.FC<StudyPlanSettingsModalProps> = ({
  currentMinutes,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedMinutes, setSelectedMinutes] = React.useState<AllowedDailyMinutes>(currentMinutes);

  React.useEffect(() => {
    setSelectedMinutes(currentMinutes);
  }, [currentMinutes, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedMinutes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-plan-settings-title"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp">
        <div className="space-y-1 text-center sm:text-left">
          <h2
            id="study-plan-settings-title"
            className="text-xl font-black text-slate-900 tracking-tight"
          >
            Daily Learning Goal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose how much time you want to dedicate to English study each day.
          </p>
        </div>

        {/* Goal options selector */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {ALLOWED_DAILY_MINUTES.map((mins) => {
            const isSelected = selectedMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedMinutes(mins)}
                className={`min-h-12 sm:min-h-14 rounded-2xl font-black text-sm sm:text-base border transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{mins}</span>
                <span className={`text-3xs font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  min
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-2xs text-slate-400 text-center leading-relaxed">
          Your daily plan will automatically adapt its recommended review and lesson blocks to fit this target.
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  );
};
