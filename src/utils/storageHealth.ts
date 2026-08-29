export type StorageFailureType =
  | 'quota_exceeded'
  | 'security_restricted'
  | 'corrupt_data'
  | 'unavailable'
  | 'unknown';

export type StorageOperationType = 'read' | 'write' | 'remove' | 'probe';

export interface StorageHealthState {
  isHealthy: boolean;
  isStorageAccessible: boolean;
  isWarningDismissed: boolean;
  lastFailureType: StorageFailureType | null;
  lastFailureOperation?: StorageOperationType | null;
  lastFailedKey: string | null;
  failedKeys: string[];
  failedWriteAttempts: number;
}

export const STORAGE_HEALTH_EVENT = 'flipenglish_storage_health_changed';

const failedWriteKeys = new Set<string>();
const failedReadKeys = new Set<string>();
const failedRemoveKeys = new Set<string>();

let currentHealth: StorageHealthState = {
  isHealthy: true,
  isStorageAccessible: true,
  isWarningDismissed: false,
  lastFailureType: null,
  lastFailureOperation: null,
  lastFailedKey: null,
  failedKeys: [],
  failedWriteAttempts: 0,
};

function getCombinedFailedKeys(): string[] {
  return Array.from(new Set([...failedWriteKeys, ...failedReadKeys, ...failedRemoveKeys]));
}

function computeIsHealthy(isAccessible: boolean): boolean {
  return (
    isAccessible &&
    failedWriteKeys.size === 0 &&
    failedReadKeys.size === 0 &&
    failedRemoveKeys.size === 0
  );
}

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
 * Records a successful storage operation.
 * - If key is the diagnostic probe (or operation is 'probe'), updates isStorageAccessible = true
 *   without erasing genuine unresolved application failures.
 * - For read success, reconciles read accessibility and removes the key from failedReadKeys ONLY.
 * - For write success, removes the key from failedWriteKeys ONLY.
 * - For remove success, removes the key from failedRemoveKeys ONLY.
 */
export function recordStorageSuccess(
  key: string,
  operation: StorageOperationType = 'write'
): void {
  if (key === 'flipenglish_storage_health_probe' || operation === 'probe') {
    const combinedFailedKeys = getCombinedFailedKeys();
    const isHealthyNow = computeIsHealthy(true);
    currentHealth = {
      ...currentHealth,
      isStorageAccessible: true,
      isHealthy: isHealthyNow,
      isWarningDismissed: isHealthyNow ? false : currentHealth.isWarningDismissed,
      lastFailureType: isHealthyNow ? null : currentHealth.lastFailureType,
      lastFailureOperation: isHealthyNow ? null : currentHealth.lastFailureOperation,
      lastFailedKey: isHealthyNow
        ? null
        : combinedFailedKeys[combinedFailedKeys.length - 1] ?? null,
      failedKeys: combinedFailedKeys,
    };
    emitHealthUpdate();
    return;
  }

  if (operation === 'read') {
    failedReadKeys.delete(key);
  } else if (operation === 'write') {
    failedWriteKeys.delete(key);
  } else if (operation === 'remove') {
    failedRemoveKeys.delete(key);
  }

  const remainingFailedKeys = getCombinedFailedKeys();
  const nowHealthy = computeIsHealthy(true);

  currentHealth = {
    ...currentHealth,
    isStorageAccessible: true,
    isHealthy: nowHealthy,
    isWarningDismissed: nowHealthy ? false : currentHealth.isWarningDismissed,
    lastFailureType: nowHealthy ? null : currentHealth.lastFailureType,
    lastFailureOperation: nowHealthy ? null : currentHealth.lastFailureOperation,
    lastFailedKey: nowHealthy ? null : remainingFailedKeys[remainingFailedKeys.length - 1] ?? null,
    failedKeys: remainingFailedKeys,
    failedWriteAttempts: nowHealthy ? 0 : currentHealth.failedWriteAttempts,
  };
  emitHealthUpdate();
}

/**
 * Records a storage failure and triggers global health listeners.
 * Accurately tracks failure operation ('read' | 'write' | 'remove' | 'probe').
 */
export function recordStorageFailure(
  key: string,
  err: unknown,
  operation: StorageOperationType = 'write'
): void {
  const failureType = categorizeStorageError(err);

  if (operation === 'read') {
    failedReadKeys.add(key);
  } else if (operation === 'write') {
    failedWriteKeys.add(key);
  } else if (operation === 'remove') {
    failedRemoveKeys.add(key);
  }

  const updatedFailedKeys = getCombinedFailedKeys();
  const isNewKey = !currentHealth.failedKeys.includes(key);
  const isMaterialChange =
    isNewKey ||
    currentHealth.lastFailureType !== failureType ||
    currentHealth.lastFailureOperation !== operation;

  currentHealth = {
    ...currentHealth,
    isHealthy: false,
    isStorageAccessible: false,
    isWarningDismissed: isMaterialChange ? false : currentHealth.isWarningDismissed,
    lastFailureType: failureType,
    lastFailureOperation: operation,
    lastFailedKey: key,
    failedKeys: updatedFailedKeys,
    failedWriteAttempts:
      operation === 'write' || operation === 'remove'
        ? currentHealth.failedWriteAttempts + 1
        : currentHealth.failedWriteAttempts,
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
  return { ...currentHealth, failedKeys: [...currentHealth.failedKeys] };
}

/**
 * Safe localStorage.setItem wrapper that never throws, detects quota/security issues,
 * tracks health, and returns true on success or false on failure.
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'), 'write');
      return false;
    }

    localStorage.setItem(key, value);
    recordStorageSuccess(key, 'write');
    return true;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to write key "${key}":`, err);
    recordStorageFailure(key, err, 'write');
    return false;
  }
}

/**
 * Safe localStorage.getItem wrapper that catches SecurityErrors, records degradation, and returns null cleanly.
 * On success, reconciles read accessibility without falsely clearing failed writes.
 */
export function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'), 'read');
      return null;
    }
    const value = localStorage.getItem(key);
    recordStorageSuccess(key, 'read');
    return value;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to read key "${key}":`, err);
    recordStorageFailure(key, err, 'read');
    return null;
  }
}

/**
 * Safe localStorage.removeItem wrapper that catches SecurityErrors, records degradation, and returns boolean.
 */
export function safeRemoveLocalStorage(key: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      recordStorageFailure(key, new Error('localStorage is undefined'), 'remove');
      return false;
    }
    localStorage.removeItem(key);
    recordStorageSuccess(key, 'remove');
    return true;
  } catch (err) {
    console.warn(`[FlipEnglish Storage] Failed to remove key "${key}":`, err);
    recordStorageFailure(key, err, 'remove');
    return false;
  }
}
