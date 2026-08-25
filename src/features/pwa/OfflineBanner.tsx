import React from 'react';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Text-only offline mode notification banner.
 * Shows when browser reports offline, with a graceful transient message when returning online.
 * Respects safe-area, >=44px touch targets, zero decorative icons.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline, showBackOnlineNotice, dismissBackOnlineNotice } = useNetworkStatus();

  if (isOnline && !showBackOnlineNotice) {
    return null;
  }

  if (showBackOnlineNotice) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-emerald-700 text-white px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-300 animate-fadeIn"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <p className="min-w-0">
            <span className="font-extrabold uppercase text-2xs tracking-wider bg-emerald-800 px-2 py-0.5 rounded-md mr-2 inline-block">
              Connected
            </span>
            <span>You're back online. Live AI features are available.</span>
          </p>
          <button
            type="button"
            onClick={dismissBackOnlineNotice}
            className="min-h-11 px-3 py-1 text-xs font-bold text-emerald-100 hover:text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center"
          >
            Dismiss
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="w-full bg-slate-900 text-white px-4 py-2.5 sm:py-3 text-xs sm:text-sm transition-all duration-300 animate-fadeIn"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="min-w-0 font-medium">
          <span className="font-extrabold uppercase text-2xs tracking-wider bg-slate-800 text-amber-300 border border-slate-700 px-2 py-0.5 rounded-md mr-2 inline-block">
            Offline Mode
          </span>
          <span>
            Core learning and review remain available. AI features require an internet connection.
          </span>
        </p>
      </div>
    </aside>
  );
};
