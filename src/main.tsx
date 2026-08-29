import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './features/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalChunkRecoveryController } from './components/GlobalChunkRecoveryController';
import './index.css';

// Global Vite dynamic import preload error listener to handle network chunk dropouts
// Uses event.preventDefault() and sessionStorage-based reload recovery with loop prevention and TTL
const CHUNK_RECOVERY_KEY = 'flipenglish_chunk_reload_marker';
const CHUNK_RECOVERY_TTL_MS = 60 * 1000; // 60 seconds TTL window

interface ChunkRecoveryMarker {
  attempts: number;
  firstAttemptAt: number;
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Vite preloadError] Failed to fetch dynamic import chunk:', event);

  // If user is currently offline, dispatch offline chunk recovery event (no pointless reload)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    window.dispatchEvent(
      new CustomEvent('flipenglish_chunk_load_error', { detail: { isOffline: true } })
    );
    return;
  }

  // Reload recovery with bounded loop protection and TTL window
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(CHUNK_RECOVERY_KEY);
    let marker: ChunkRecoveryMarker | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.attempts === 'number' &&
          typeof parsed.firstAttemptAt === 'number' &&
          now - parsed.firstAttemptAt < CHUNK_RECOVERY_TTL_MS
        ) {
          marker = parsed;
        }
      } catch {}
    }

    if (!marker) {
      // First online attempt or previous attempt expired: allow 1 automatic reload
      const newMarker: ChunkRecoveryMarker = { attempts: 1, firstAttemptAt: now };
      sessionStorage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify(newMarker));
      window.location.reload();
      return;
    }

    // Inside TTL window and already attempted reload: do NOT reload again
  } catch (err) {
    console.warn('[Vite preloadError] sessionStorage restricted or unavailable:', err);
    // If sessionStorage is unavailable: do not loop -> broadcast error to recovery UI
  }

  // If reload already attempted inside TTL window or storage failed, broadcast error to Recovery UI
  window.dispatchEvent(
    new CustomEvent('flipenglish_chunk_load_error', { detail: { loopPrevented: true } })
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <GlobalChunkRecoveryController />
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);
