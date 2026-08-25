import React, { useEffect, useRef } from 'react';
import { UiLanguageMode } from './i18nTypes';
import { useI18n } from './useI18n';

export interface LanguageChoiceGroupProps {
  mode: UiLanguageMode;
  onChange: (newMode: UiLanguageMode) => void;
  name: string;
  className?: string;
  itemClassName?: (checked: boolean) => string;
  legendHidden?: boolean;
  autoFocusSelected?: boolean;
  onSelected?: () => void;
}

const LANGUAGE_OPTIONS: Array<{
  value: UiLanguageMode;
  label: string;
}> = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'bilingual', label: 'Song ngữ / Bilingual' },
  { value: 'en', label: 'English' },
];

export const LanguageChoiceGroup: React.FC<LanguageChoiceGroupProps> = ({
  mode,
  onChange,
  name,
  className = 'space-y-1',
  itemClassName,
  legendHidden = true,
  autoFocusSelected = false,
  onSelected,
}) => {
  const { t } = useI18n();
  const checkedRadioRef = useRef<HTMLInputElement>(null);
  const firstRadioRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSelected) {
      if (checkedRadioRef.current) {
        checkedRadioRef.current.focus();
      } else if (firstRadioRef.current) {
        firstRadioRef.current.focus();
      }
    }
  }, [autoFocusSelected]);

  return (
    <fieldset className={className}>
      <legend
        className={
          legendHidden
            ? 'sr-only'
            : 'text-2xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2 col-span-3'
        }
      >
        {t('accessibility.languageOptions')}
      </legend>

      {LANGUAGE_OPTIONS.map((option, index) => {
        const isChecked = mode === option.value;
        const defaultClass = `w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-between cursor-pointer border ${
          isChecked
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
            : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
        }`;

        return (
          <label
            key={option.value}
            className={itemClassName ? itemClassName(isChecked) : defaultClass}
          >
            <span className="select-none">{option.label}</span>
            <input
              ref={isChecked ? checkedRadioRef : index === 0 ? firstRadioRef : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={isChecked}
              onChange={() => {
                onChange(option.value);
                onSelected?.();
              }}
              className="sr-only"
            />
          </label>
        );
      })}
    </fieldset>
  );
};

