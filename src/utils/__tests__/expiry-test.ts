import { isExpired, minutesLeft, msUntilExpiry } from '../expiry';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

describe('expiry', () => {
  test('msUntilExpiry counts down from createdAt + window', () => {
    expect(msUntilExpiry(T0, 15, T0)).toBe(15 * MIN);
    expect(msUntilExpiry(T0, 15, T0 + 10 * MIN)).toBe(5 * MIN);
    expect(msUntilExpiry(T0, 15, T0 + 20 * MIN)).toBe(-5 * MIN);
  });

  test('isExpired is false before the window ends and true at/after it', () => {
    expect(isExpired(T0, 15, T0)).toBe(false);
    expect(isExpired(T0, 15, T0 + 15 * MIN - 1)).toBe(false);
    expect(isExpired(T0, 15, T0 + 15 * MIN)).toBe(true);
    expect(isExpired(T0, 15, T0 + 16 * MIN)).toBe(true);
  });

  test('minutesLeft rounds up and clamps at zero', () => {
    expect(minutesLeft(T0, 15, T0)).toBe(15);
    expect(minutesLeft(T0, 15, T0 + 14 * MIN + 1)).toBe(1);
    expect(minutesLeft(T0, 15, T0 + 14 * MIN + 59_999)).toBe(1);
    expect(minutesLeft(T0, 15, T0 + 15 * MIN)).toBe(0);
    expect(minutesLeft(T0, 15, T0 + 60 * MIN)).toBe(0);
  });

  test('a 1-minute demo ping expires exactly one minute after creation', () => {
    expect(isExpired(T0, 1, T0 + MIN - 1)).toBe(false);
    expect(isExpired(T0, 1, T0 + MIN)).toBe(true);
  });
});
