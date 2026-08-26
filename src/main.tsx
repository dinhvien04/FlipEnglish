import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './features/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global Vite dynamic import preload error listener to catch network chunk dropouts
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite preloadError] Failed to fetch dynamic import chunk:', event);
  // Dispatch custom application recovery event
  window.dispatchEvent(new CustomEvent('flipenglish_chunk_load_error', { detail: event }));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);
