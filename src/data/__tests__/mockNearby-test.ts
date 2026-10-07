import { MIN_RADIUS_M } from '../../constants/limits';
import { createDemoNearby, MOCK_NEARBY } from '../mockNearby';
import { isExpired } from '../../utils/expiry';

describe('createDemoNearby', () => {
  test('seeds three riders that stay live for a 30-minute review session', () => {
    const t0 = 1_800_000_000_000;
    const cards = createDemoNearby(t0);
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.distanceM <= MIN_RADIUS_M)).toBe(true);
    expect(cards.every((c) => c.windowMin >= 30)).toBe(true);
    expect(cards.every((c) => !isExpired(c.createdAt, c.windowMin, t0 + 29 * 60_000))).toBe(true);
    expect(cards.some((c) => isExpired(c.createdAt, c.windowMin, t0 + 30 * 60_000))).toBe(true);
  });

  test('does not freeze the clock at module import', () => {
    const later = createDemoNearby(Date.now());
    expect(later[0].createdAt).not.toBe(MOCK_NEARBY[0].createdAt);
  });
});
