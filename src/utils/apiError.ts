import { TranslationKey } from '../features/i18n';

export type ApiFailureKind =
  | 'offline'
  | 'timeout'
  | 'rate-limited'
  | 'unavailable'
  | 'bad-response'
  | 'request-error'
  | 'unknown';

export interface NormalizedApiErrorOptions {
  kind: ApiFailureKind;
  userMessageKey: TranslationKey;
  technicalMessage?: string;
  statusCode?: number;
  retryable?: boolean;
  retryAfterSeconds?: number;
  cause?: unknown;
}

/**
 * Normalized API error that abstracts raw server diagnostics into safe,
 * product-grade error classifications for the learner.
 */
export class NormalizedApiError extends Error {
  readonly kind: ApiFailureKind;
  readonly userMessageKey: TranslationKey;
  readonly technicalMessage: string;
  readonly statusCode: number | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;

  constructor(options: NormalizedApiErrorOptions) {
    super(options.technicalMessage || 'API operation failed');
    this.name = 'NormalizedApiError';
    this.kind = options.kind;
    this.userMessageKey = options.userMessageKey;
    this.technicalMessage = options.technicalMessage || '';
    this.statusCode = options.statusCode ?? null;
    this.retryable = options.retryable ?? (options.kind === 'offline' || options.kind === 'timeout' || options.kind === 'rate-limited' || options.kind === 'unavailable');
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

/**
 * Inspects any thrown error (fetch failure, DOMException, HTTP response, NetworkError)
 * and classifies it into a deterministic NormalizedApiError.
 */
export function classifyApiError(err: unknown, response?: Response): NormalizedApiError {
  if (err instanceof NormalizedApiError) {
    return err;
  }

  const rawMessage = String((err as any)?.message || err || '');
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const isAbort = (err as any)?.name === 'AbortError' || rawMessage.includes('aborted');
  const isTimeout = isAbort || rawMessage.includes('timeout') || rawMessage.includes('ETIMEDOUT') || rawMessage.includes('timed out');

  // 1. Explicit Offline State
  if (isOffline) {
    return new NormalizedApiError({
      kind: 'offline',
      userMessageKey: 'error.networkOffline',
      technicalMessage: 'Client is offline (navigator.onLine === false)',
      retryable: true,
      cause: err,
    });
  }

  // 2. Timeout
  if (isTimeout) {
    return new NormalizedApiError({
      kind: 'timeout',
      userMessageKey: 'error.timeout',
      technicalMessage: `Request timed out: ${rawMessage}`,
      retryable: true,
      cause: err,
    });
  }

  // 3. Network connection dropouts (fetch failed, NetworkError, DNS failure, CORS)
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('fetch failed') ||
    rawMessage.includes('ECONN') ||
    rawMessage.includes('TypeError: Load failed') ||
    rawMessage.includes('The Internet connection appears to be offline')
  ) {
    return new NormalizedApiError({
      kind: 'offline',
      userMessageKey: 'error.networkConnectionLost',
      technicalMessage: `Network connection error: ${rawMessage}`,
      retryable: true,
      cause: err,
    });
  }

  // 4. HTTP Status Code Classification (if Response object or status code is present)
  const status = response ? response.status : typeof (err as any)?.status === 'number' ? (err as any).status : null;

  if (status === 429 || rawMessage.includes('429') || rawMessage.includes('rate limit') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    let retryAfterSeconds: number | undefined = undefined;
    if (response && response.headers) {
      const headerVal = response.headers.get('Retry-After');
      if (headerVal) {
        const parsed = parseInt(headerVal, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          retryAfterSeconds = parsed;
        }
      }
    }

    return new NormalizedApiError({
      kind: 'rate-limited',
      userMessageKey: 'error.rateLimited',
      technicalMessage: `HTTP 429 Rate Limit Exceeded`,
      statusCode: 429,
      retryable: true,
      retryAfterSeconds,
      cause: err,
    });
  }

  if (status === 503 || status === 502 || rawMessage.includes('503') || rawMessage.includes('502') || rawMessage.includes('temporarily unavailable')) {
    return new NormalizedApiError({
      kind: 'unavailable',
      userMessageKey: 'error.serviceUnavailable',
      technicalMessage: `Service unavailable (HTTP ${status || 503})`,
      statusCode: status || 503,
      retryable: true,
      cause: err,
    });
  }

  if (status === 500 || (status !== null && status >= 500)) {
    return new NormalizedApiError({
      kind: 'unavailable',
      userMessageKey: 'error.serverError',
      technicalMessage: `Server internal error (HTTP ${status})`,
      statusCode: status,
      retryable: true,
      cause: err,
    });
  }

  if (status === 400 || status === 422 || (status !== null && status >= 400 && status < 500)) {
    return new NormalizedApiError({
      kind: 'request-error',
      userMessageKey: 'error.badRequest',
      technicalMessage: `Client request error (HTTP ${status})`,
      statusCode: status,
      retryable: false,
      cause: err,
    });
  }

  if (rawMessage.includes('JSON') || rawMessage.includes('SyntaxError') || rawMessage.includes('malformed')) {
    return new NormalizedApiError({
      kind: 'bad-response',
      userMessageKey: 'error.badResponse',
      technicalMessage: `Malformed JSON response: ${rawMessage}`,
      retryable: true,
      cause: err,
    });
  }

  return new NormalizedApiError({
    kind: 'unknown',
    userMessageKey: 'error.generic',
    technicalMessage: rawMessage || 'Unknown error occurred',
    retryable: true,
    cause: err,
  });
}

/**
 * Backward-compatible helper for legacy components returning string copy.
 */
export function getApiErrorMessage(err: any, fallbackMessage: string = 'Service is temporarily unavailable.'): string {
  if (!err) return fallbackMessage;
  const normalized = classifyApiError(err);

  switch (normalized.kind) {
    case 'offline':
      return 'This feature requires an active internet connection. Your local learning progress is safely saved.';
    case 'timeout':
      return 'This request took too long. Please check your connection and try again.';
    case 'rate-limited':
      return 'Service is receiving high demand right now. Please wait a moment and try again.';
    case 'unavailable':
      return 'Service is temporarily unavailable. Your offline lessons, reviews, and exams remain available.';
    case 'bad-response':
      return 'Received an invalid response from the server. Please try again.';
    case 'request-error':
      return 'Unable to process this request. Please try again.';
    default:
      return fallbackMessage;
  }
}
