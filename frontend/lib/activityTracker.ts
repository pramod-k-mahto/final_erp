/**
 * Activity tracking shared between Layout inactivity timer and API token refresh logic.
 * This is separated from lib/api.ts to avoid circular dependencies.
 */

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = 'last_activity_at';

// In-memory fallback if localStorage is unavailable
let _lastActivityAt: number = Date.now();

export function recordActivity() {
  const now = Date.now();
  _lastActivityAt = now;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVITY_KEY, now.toString());
    } catch (e) {
      // ignore
    }
  }
}

export function isUserActive(): boolean {
  let latest = _lastActivityAt;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY);
      if (stored) {
        const storedTime = parseInt(stored, 10);
        if (!isNaN(storedTime) && storedTime > latest) {
          latest = storedTime;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return Date.now() - latest < INACTIVITY_MS;
}
