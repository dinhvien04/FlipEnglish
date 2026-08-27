import { ActiveTimeRecord } from '../../types/progress';
import { getStoredActiveTime, saveActiveTime } from './activeTimeStorage';

/**
 * Records active study seconds for today.
 * Gated by page visibility: only accumulates when document.visibilityState === 'visible'.
 *
 * @param seconds Number of active seconds to accumulate.
 * @param referenceDate Optional reference date for testing / simulation.
 */
export function recordActiveStudySeconds(
  seconds: number,
  referenceDate?: Date
): ActiveTimeRecord {
  // Gated by page visibility in browser environments
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return getStoredActiveTime(referenceDate);
  }

  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const currentRecord = getStoredActiveTime(referenceDate);

  if (safeSeconds <= 0) {
    return currentRecord;
  }

  const now = Date.now();
  const updatedRecord: ActiveTimeRecord = {
    ...currentRecord,
    activeSeconds: currentRecord.activeSeconds + safeSeconds,
    lastHeartbeatAt: now,
    updatedAt: now,
  };

  saveActiveTime(updatedRecord);
  return updatedRecord;
}

/**
 * Returns total active study minutes accumulated today.
 * Calculated as Math.floor(activeSeconds / 60).
 *
 * @param referenceDate Optional reference date.
 */
export function getActiveMinutesToday(referenceDate?: Date): number {
  const record = getStoredActiveTime(referenceDate);
  return Math.floor(record.activeSeconds / 60);
}
