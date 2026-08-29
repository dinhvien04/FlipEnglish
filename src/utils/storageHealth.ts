export type StorageFailureType =
  | 'quota_exceeded'
  | 'security_restricted'
  | 'corrupt_data'
  | 'unavailable'
  | 'unknown';

export interface StorageHealthState {
  isHealthy: boolean;
  lastFailureType: StorageFailureType | null;
  lastFailedKey: string | null;
  failedWriteAttempts: number;
}

export const STORAGE_HEALTH_EVENT = 'flipenglish_storage_health_changed';

let currentHealth: StorageHealthState = {
  isHealthy: true,
  lastFailureType: null,
  lastFailedKey: null,
  failedWriteAttempts: 0,
};

/**
 * Categorizes a storage error into deterministic types (QuotaExceeded, SecurityError, etc.)
 */
export function categorizeStorageError(err: unknown): StorageFailureType {
  const name = (err as any)?.name || '';
  const code = (err as any)?.code;
  const message = String((err as any)?.message || err || '');

  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    message.includes('quota') ||
    message.includes('QuotaExceeded')
  ) {
    return 'quota_exceeded';
  }

  if (
    name === 'SecurityError' ||
    message.includes('SecurityError') ||
    message.includes('access is denied') ||
    message.includes('localStorage is not available')
  ) {
    return 'security_restricted';
  }

  if (message.includes('JSON') || message.includes('SyntaxError')) {
    return 'corrupt_data';
  }

  return 'unknown';
}

function emitHealthUpdate(): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(STORAGE_HEALTH_EVENT, {
          detail: { ...currentHealth },
        })
      );
    } catch {
      // Ignore event dispatch errors in restricted environments
    }
  }
}

/**
 * Records a successful storage write and resets unhealthy state.
 */
export function recordStorageSuccess(key: string): void {
  if (!currentHealth.isHealthy) {
    currentHealth = {
      isHealthy: true,
      lastFailureType: null,
      lastFailedKey: null,
      failedWriteAttempts: 0,
    };
    emitHealthUpdate();
  }
}

/**
 * Records a storage failure and triggers global health listeners.
 */
export function recordStorageFailure(key: string, err: unknown): void {
  const failureType = categorizeStorageError(err);
  currentHealth = {
    isHealthy: false,
    lastFailureType: failureType,
    lastFailedKey: key,
    failedWriteAttempts: currentHealth.failedWriteAttempts + 1,
  };
  emitHealthUpdate();
}

/**
 * Dismisses the active storage health warning from UI.
 */
export function dismissStorageWarning(): void {
  currentHealth = {
    ...currentHealth,
    isHealthy: true,
  };
  emitHealthUpdate();
}

/**
 * Gets the current snapshot of storage health.
 */
export function getStorageHealth(): StorageHealthState {
  return { ...currentHealth };
}

/**
 * Safe localStorage.setItem wrapper that never throws, detects quota/security issues,
 * tracks health, and returns true on success or false on failure.
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'));
      return false;
    }

    localStorage.setItem(key, value);
    recordStorageSuccess(key);
    return true;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to write key "${key}":`, err);
    recordStorageFailure(key, err);
    return false;
  }
}

/**
 * Safe localStorage.getItem wrapper that catches SecurityErrors and returns null cleanly.
 */
export function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to read key "${key}":`, err);
    return null;
  }
}

/**
 * Safe localStorage.removeItem wrapper that catches SecurityErrors and returns boolean.
 */
export function safeRemoveLocalStorage(key: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to remove key "${key}":`, err);
    return false;
  }
}
