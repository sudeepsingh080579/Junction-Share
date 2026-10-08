import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { prepareBroadcastLocation, startRequestTracking } from '../location';

function pressAlert(label: string) {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const button = buttons?.find((item) => item.text === label);
    button?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
  (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude: 40.31, longitude: -74.62 } });
  (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
  (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
});

describe('broadcast location permission', () => {
  test('asks for While Using before Always', async () => {
    pressAlert('Continue');
    const result = await prepareBroadcastLocation();
    expect(result).toMatchObject({ ok: true, latitude: 40.31, longitude: -74.62, background: 'granted' });
    const foregroundOrder = (Location.requestForegroundPermissionsAsync as jest.Mock).mock.invocationCallOrder[0];
    const backgroundOrder = (Location.requestBackgroundPermissionsAsync as jest.Mock).mock.invocationCallOrder[0];
    expect(foregroundOrder).toBeLessThan(backgroundOrder);
  });

  test('does not ask for Always when While Using is denied, and offers Settings', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied', canAskAgain: false });
    const result = await prepareBroadcastLocation();
    expect(result).toMatchObject({ ok: false, openSettings: true });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('keeps the coordinates when the user postpones Always', async () => {
    pressAlert('Not now');
    const result = await prepareBroadcastLocation();
    expect(result).toMatchObject({ ok: true, background: 'skipped' });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('reports Always as denied when it can no longer be asked', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied', canAskAgain: false });
    const result = await prepareBroadcastLocation();
    expect(result).toMatchObject({ ok: true, background: 'denied' });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('explains a missing position without sending the user to Settings', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('unavailable'));
    const result = await prepareBroadcastLocation();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.openSettings).toBe(false);
      expect(result.message).toMatch(/Could not read your location/);
    }
  });

  test('starts background updates only after Always is granted', async () => {
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
    await startRequestTracking();
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();

    (Location.startLocationUpdatesAsync as jest.Mock).mockClear();
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied', canAskAgain: false });
    await startRequestTracking();
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});
