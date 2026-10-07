import * as Location from 'expo-location';
import { ensureForegroundLocation, locationAccessMessage } from '../locationPermission';

describe('ensureForegroundLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ok when the OS grants when-in-use location', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    await expect(ensureForegroundLocation()).resolves.toEqual({ ok: true });
  });

  test('denied when the user refuses', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    await expect(ensureForegroundLocation()).resolves.toEqual({ ok: false, reason: 'denied' });
  });

  test('unavailable when the native module throws', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('no gps'));
    await expect(ensureForegroundLocation()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('locationAccessMessage', () => {
  test('explains a denial vs an unavailable module', () => {
    expect(locationAccessMessage({ ok: false, reason: 'denied' }).title).toMatch(/permission/i);
    expect(locationAccessMessage({ ok: false, reason: 'unavailable' }).title).toMatch(/unavailable/i);
  });
});
