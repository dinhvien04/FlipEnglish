import React, { useState, useEffect } from 'react';

interface ExamTimerProps {
  endsAt: number; // absolute timestamp in ms
  onExpire: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({ endsAt, onExpire }) => {
  const calculateRemainingSeconds = () => {
    const remainingMs = endsAt - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemainingSeconds);

  useEffect(() => {
    // Initial check
    const initial = calculateRemainingSeconds();
    if (initial <= 0) {
      onExpire();
      return;
    }
    setSecondsLeft(initial);

    // Update every second based on real wall-clock time
    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = secondsLeft > 0 && secondsLeft <= 5 * 60; // Less than 5 minutes

  return (
    <div
      id="exam-timer-widget"
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes and ${seconds} seconds`}
      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base border transition-all ${
        isLowTime
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-2xs'
          : 'bg-slate-800 border-slate-700 text-indigo-300 shadow-2xs'
      }`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xs uppercase tracking-wider font-sans font-bold text-slate-400">
          {isLowTime ? 'Expiring:' : 'Time Left:'}
        </span>
        <span className="tracking-widest text-white text-base sm:text-lg font-mono">{formattedTime}</span>
      </div>
    </div>
  );
};
