export type StorageFailureType =
  | 'quota_exceeded'
  | 'security_restricted'
  | 'corrupt_data'
  | 'unavailable'
  | 'unknown';

export interface StorageHealthState {
  isHealthy: boolean;
  isWarningDismissed: boolean;
  lastFailureType: StorageFailureType | null;
  lastFailedKey: string | null;
  failedKeys: string[];
  failedWriteAttempts: number;
}

export const STORAGE_HEALTH_EVENT = 'flipenglish_storage_health_changed';

let currentHealth: StorageHealthState = {
  isHealthy: true,
  isWarningDismissed: false,
  lastFailureType: null,
  lastFailedKey: null,
  failedKeys: [],
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
 * Records a successful storage write and resets unhealthy state only if all tracked
 * failed keys have been resolved or a dedicated health probe succeeded.
 */
export function recordStorageSuccess(key: string): void {
  if (!currentHealth.isHealthy) {
    if (key === 'flipenglish_storage_health_probe') {
      currentHealth = {
        isHealthy: true,
        isWarningDismissed: false,
        lastFailureType: null,
        lastFailedKey: null,
        failedKeys: [],
        failedWriteAttempts: 0,
      };
      emitHealthUpdate();
      return;
    }

    // Filter out the recovered key from the set of failed keys
    const remainingFailedKeys = currentHealth.failedKeys.filter((k) => k !== key);
    if (remainingFailedKeys.length === 0) {
      currentHealth = {
        isHealthy: true,
        isWarningDismissed: false,
        lastFailureType: null,
        lastFailedKey: null,
        failedKeys: [],
        failedWriteAttempts: 0,
      };
      emitHealthUpdate();
    } else {
      currentHealth = {
        ...currentHealth,
        failedKeys: remainingFailedKeys,
        lastFailedKey: remainingFailedKeys[remainingFailedKeys.length - 1],
      };
      emitHealthUpdate();
    }
  }
}

/**
 * Records a storage failure and triggers global health listeners.
 */
export function recordStorageFailure(key: string, err: unknown): void {
  const failureType = categorizeStorageError(err);
  const updatedFailedKeys = currentHealth.failedKeys.includes(key)
    ? currentHealth.failedKeys
    : [...currentHealth.failedKeys, key];

  currentHealth = {
    isHealthy: false,
    isWarningDismissed: false, // Reset dismissed state on new failure so user is alerted
    lastFailureType: failureType,
    lastFailedKey: key,
    failedKeys: updatedFailedKeys,
    failedWriteAttempts: currentHealth.failedWriteAttempts + 1,
  };
  emitHealthUpdate();
}

/**
 * Dismisses the visual storage health warning banner without claiming storage is technically healthy.
 */
export function dismissStorageWarning(): void {
  currentHealth = {
    ...currentHealth,
    isWarningDismissed: true,
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
 * Safe localStorage.getItem wrapper that catches SecurityErrors, records degradation, and returns null cleanly.
 */
export function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'));
      return null;
    }
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to read key "${key}":`, err);
    recordStorageFailure(key, err);
    return null;
  }
}

/**
 * Safe localStorage.removeItem wrapper that catches SecurityErrors, records degradation, and returns boolean.
 */
export function safeRemoveLocalStorage(key: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'));
      return false;
    }
    localStorage.removeItem(key);
    recordStorageSuccess(key);
    return true;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to remove key "${key}":`, err);
    recordStorageFailure(key, err);
    return false;
  }
}
