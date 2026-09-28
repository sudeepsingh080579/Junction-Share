/** Milliseconds until createdAt + windowMin expires (may be negative). */
export function msUntilExpiry(createdAt: number, windowMin: number, now = Date.now()): number {
  return createdAt + windowMin * 60_000 - now;
}

export function isExpired(createdAt: number, windowMin: number, now = Date.now()): boolean {
  return msUntilExpiry(createdAt, windowMin, now) <= 0;
}

/** Whole minutes remaining, rounded up; 0 when expired. */
export function minutesLeft(createdAt: number, windowMin: number, now = Date.now()): number {
  const ms = msUntilExpiry(createdAt, windowMin, now);
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60_000);
}
