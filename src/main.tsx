import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './features/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global Vite dynamic import preload error listener to handle network chunk dropouts
// Uses event.preventDefault() and sessionStorage-based reload recovery with loop prevention
const CHUNK_RECOVERY_KEY = 'flipenglish_chunk_reload_attempt';
const MAX_RELOAD_ATTEMPTS = 1;

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Vite preloadError] Failed to fetch dynamic import chunk:', event);

  // If user is currently offline, let React ErrorBoundary show the offline chunk fallback
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    window.dispatchEvent(new CustomEvent('flipenglish_chunk_load_error', { detail: { isOffline: true } }));
    return;
  }

  // Reload recovery with loop protection
  try {
    const attempts = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || '0');
    if (attempts < MAX_RELOAD_ATTEMPTS) {
      sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(attempts + 1));
      window.location.reload();
      return;
    }
  } catch {}

  // If reload already attempted or storage failed, broadcast error to ErrorBoundary
  window.dispatchEvent(new CustomEvent('flipenglish_chunk_load_error', { detail: { loopPrevented: true } }));
});

// Clear reload attempt counter on successful application boot
try {
  sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);
