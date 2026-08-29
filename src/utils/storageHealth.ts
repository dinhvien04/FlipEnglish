export type StorageFailureType =
  | 'quota_exceeded'
  | 'security_restricted'
  | 'corrupt_data'
  | 'unavailable'
  | 'unknown';

export interface StorageHealthState {
  isHealthy: boolean;
  isStorageAccessible: boolean;
  isWarningDismissed: boolean;
  lastFailureType: StorageFailureType | null;
  lastFailedKey: string | null;
  failedKeys: string[];
  failedWriteAttempts: number;
}

export const STORAGE_HEALTH_EVENT = 'flipenglish_storage_health_changed';

let currentHealth: StorageHealthState = {
  isHealthy: true,
  isStorageAccessible: true,
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
 * Records a successful storage write.
 * - If key is the diagnostic probe, updates isStorageAccessible = true without erasing genuine failed keys.
 * - For real application keys, filters out the recovered key from failedKeys.
 */
export function recordStorageSuccess(key: string): void {
  if (key === 'flipenglish_storage_health_probe') {
    const isHealthyNow = currentHealth.failedKeys.length === 0;
    currentHealth = {
      ...currentHealth,
      isStorageAccessible: true,
      isHealthy: isHealthyNow,
      isWarningDismissed: isHealthyNow ? false : currentHealth.isWarningDismissed,
      lastFailureType: isHealthyNow ? null : currentHealth.lastFailureType,
      lastFailedKey: isHealthyNow ? null : currentHealth.lastFailedKey,
    };
    emitHealthUpdate();
    return;
  }

  const remainingFailedKeys = currentHealth.failedKeys.filter((k) => k !== key);
  const nowHealthy = remainingFailedKeys.length === 0;

  currentHealth = {
    ...currentHealth,
    isStorageAccessible: true,
    isHealthy: nowHealthy,
    isWarningDismissed: nowHealthy ? false : currentHealth.isWarningDismissed,
    lastFailureType: nowHealthy ? null : currentHealth.lastFailureType,
    lastFailedKey: nowHealthy ? null : remainingFailedKeys[remainingFailedKeys.length - 1],
    failedKeys: remainingFailedKeys,
    failedWriteAttempts: nowHealthy ? 0 : currentHealth.failedWriteAttempts,
  };
  emitHealthUpdate();
}

/**
 * Records a storage failure and triggers global health listeners.
 * Re-shows warning only if a new key failed or failure type changed.
 */
export function recordStorageFailure(key: string, err: unknown): void {
  const failureType = categorizeStorageError(err);
  const isNewKey = !currentHealth.failedKeys.includes(key);
  const updatedFailedKeys = isNewKey
    ? [...currentHealth.failedKeys, key]
    : currentHealth.failedKeys;

  const isMaterialChange = isNewKey || currentHealth.lastFailureType !== failureType;

  currentHealth = {
    ...currentHealth,
    isHealthy: false,
    isStorageAccessible: false,
    isWarningDismissed: isMaterialChange ? false : currentHealth.isWarningDismissed,
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
