import { NearbyCard, RideRequest } from '../types';
import { isExpired } from '../utils/expiry';

export type PruneResult = {
  active: RideRequest | null;
  match: NearbyCard | null;
  inbox: NearbyCard[];
  requestEnded: boolean;
  matchEnded: boolean;
};

/**
 * Drop expired broadcasts and nearby cards.
 * The open match stays up when only the user's own request expires.
 */
export function pruneSession(
  active: RideRequest | null,
  match: NearbyCard | null,
  inbox: NearbyCard[],
  now: number,
): PruneResult {
  const requestEnded = Boolean(active && isExpired(active.createdAt, active.windowMin, now));
  const matchEnded = Boolean(match && isExpired(match.createdAt, match.windowMin, now));
  const nextInbox = inbox.filter((card) => !isExpired(card.createdAt, card.windowMin, now));
  return {
    active: requestEnded ? null : active,
    match: matchEnded ? null : match,
    inbox: nextInbox.length === inbox.length ? inbox : nextInbox,
    requestEnded,
    matchEnded,
  };
}

/** Ignore a restore that lost the race with a broadcast started while storage was being read. */
export function mergeRestoredRequest(
  current: RideRequest | null,
  restored: RideRequest | null,
  epochAtStart: number,
  epochNow: number,
): RideRequest | null {
  if (epochNow !== epochAtStart) return current;
  return current ?? restored;
}
