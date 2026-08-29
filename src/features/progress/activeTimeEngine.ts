import { ActiveTimeRecord } from '../../types/progress';
import { getStoredActiveTime, saveActiveTime } from './activeTimeStorage';

let lastUserInteractionTime = Date.now();
const MAX_IDLE_TIMEOUT_MS = 60 * 1000; // 60 seconds of inactivity cutoff

/**
 * Tracks learner interaction (pointer, touch, keydown, scroll) to prevent phantom accumulation
 * on unattended visible tabs.
 */
export function recordUserInteraction(): void {
  lastUserInteractionTime = Date.now();
}

/**
 * Checks if user is currently active (interacted within idle timeout threshold).
 */
export function isUserActive(cutoffMs: number = MAX_IDLE_TIMEOUT_MS): boolean {
  return Date.now() - lastUserInteractionTime < cutoffMs;
}

/**
 * Records active study seconds for today.
 * Gated by page visibility AND user activity/interaction.
 *
 * @param seconds Number of active seconds to accumulate.
 * @param referenceDate Optional reference date for testing / simulation.
 * @param bypassActivityGate Optional flag for deterministic unit testing.
 */
export function recordActiveStudySeconds(
  seconds: number,
  referenceDate?: Date,
  bypassActivityGate: boolean = false
): ActiveTimeRecord {
  // Gated by page visibility in browser environments
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return getStoredActiveTime(referenceDate);
  }

  // Gated by user interaction cutoff (unless explicitly bypassed in unit test)
  if (!bypassActivityGate && !isUserActive()) {
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
