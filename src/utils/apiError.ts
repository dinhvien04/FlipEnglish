/**
 * Normalizes frontend network and server API errors into friendly product copy.
 * Accurately differentiates offline / connection failures from server-side errors.
 */
export function getApiErrorMessage(err: any, fallbackMessage: string = 'Service is temporarily unavailable.'): string {
  if (!err) return fallbackMessage;

  const raw = String(err?.message || err || '');
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // Network connection failures (fetch failed, NetworkError, DNS, aborts)
  if (
    isOffline ||
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('fetch failed') ||
    raw.includes('ECONN') ||
    raw.includes('ETIMEDOUT') ||
    raw.includes('TypeError: Load failed') ||
    raw.includes('The Internet connection appears to be offline')
  ) {
    return 'This feature requires an active internet connection. Your local learning progress is safely saved.';
  }

  // Server 429 rate limit
  if (raw.includes('rate limit') || raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'AI service is receiving high demand right now. Please wait a moment and try again.';
  }

  // Server 503 / 500
  if (raw.includes('503') || raw.includes('500') || raw.includes('temporarily unavailable') || raw.includes('busy')) {
    return 'AI service is temporarily busy. Please try again in a few moments.';
  }

  // Use specific error message if it's already friendly, otherwise fallback
  if (err.message && typeof err.message === 'string' && err.message.length > 5 && !err.message.includes('object Object')) {
    return err.message;
  }

  return fallbackMessage;
}
