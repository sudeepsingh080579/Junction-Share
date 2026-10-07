import { NearbyCard, RideRequest } from '../../types';
import { mergeRestoredRequest, pruneSession } from '../prune';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const active: RideRequest = {
  id: 'mine',
  role: 'need',
  destination: 'Park',
  radiusM: 500,
  windowMin: 15,
  note: '',
  createdAt: T0,
};

const match: NearbyCard = {
  id: 'demo-alex',
  firstName: 'Alex',
  distanceM: 40,
  destination: 'Park',
  role: 'need',
  seats: 1,
  phoneE164: '16095550101',
  createdAt: T0,
  windowMin: 30,
};

describe('pruneSession', () => {
  test('keeps an open match when only the user request expires', () => {
    const result = pruneSession(active, match, [match], T0 + 15 * MIN);
    expect(result.requestEnded).toBe(true);
    expect(result.active).toBeNull();
    expect(result.matchEnded).toBe(false);
    expect(result.match).toBe(match);
  });

  test('closes the match only when that card expires', () => {
    const result = pruneSession(active, match, [match], T0 + 30 * MIN);
    expect(result.requestEnded).toBe(true);
    expect(result.matchEnded).toBe(true);
    expect(result.match).toBeNull();
    expect(result.inbox).toEqual([]);
  });

  test('returns the same inbox array when nothing expired', () => {
    const inbox = [match];
    const result = pruneSession(active, match, inbox, T0 + MIN);
    expect(result.inbox).toBe(inbox);
    expect(result.requestEnded).toBe(false);
    expect(result.matchEnded).toBe(false);
  });
});

describe('mergeRestoredRequest', () => {
  test('ignores a restore that finished after a newer broadcast', () => {
    const newer = { ...active, id: 'newer', destination: 'Library' };
    expect(mergeRestoredRequest(newer, active, 0, 1)).toBe(newer);
  });

  test('applies a restore when the user has not broadcast yet', () => {
    expect(mergeRestoredRequest(null, active, 0, 0)).toBe(active);
  });

  test('keeps a request that is already on screen', () => {
    const newer = { ...active, id: 'newer' };
    expect(mergeRestoredRequest(newer, active, 0, 0)).toBe(newer);
  });
});
