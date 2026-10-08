import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LOCATION_TASK } from './locationTask';

const WHEN_IN_USE_DENIED =
  'Location is needed to show your request to nearby riders and to find requests near you. Allow location in Settings, then broadcast again. The rest of JunctionShare stays available.';

const POSITION_UNAVAILABLE =
  'Could not read your location. Turn location services on and try again. You can still use Profile and Home.';

export type BroadcastLocation =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      /** granted: Always is on. skipped: user postponed the Always prompt. denied: Always was refused. */
      background: 'granted' | 'skipped' | 'denied';
    }
  | { ok: false; message: string; openSettings: boolean };

function confirmAlways(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Allow location all the time',
      'While a request is active, JunctionShare updates your location in the background so nearby riders can still see your request if you move. You can broadcast with location only while the app is open.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

/**
 * When-in-use first, then Always, which is the order iOS requires.
 * A refusal does not throw. Callers keep the rest of the app usable and can open Settings.
 */
export async function prepareBroadcastLocation(): Promise<BroadcastLocation> {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== 'granted') {
    return { ok: false, message: WHEN_IN_USE_DENIED, openSettings: foreground.canAskAgain === false };
  }

  let point: Location.LocationObject;
  try {
    point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return { ok: false, message: POSITION_UNAVAILABLE, openSettings: false };
  }

  const existing = await Location.getBackgroundPermissionsAsync();
  if (existing.status === 'granted') {
    return {
      ok: true,
      latitude: point.coords.latitude,
      longitude: point.coords.longitude,
      background: 'granted',
    };
  }

  if (existing.canAskAgain === false) {
    return {
      ok: true,
      latitude: point.coords.latitude,
      longitude: point.coords.longitude,
      background: 'denied',
    };
  }

  const accepted = await confirmAlways();
  if (!accepted) {
    return {
      ok: true,
      latitude: point.coords.latitude,
      longitude: point.coords.longitude,
      background: 'skipped',
    };
  }

  const asked = await Location.requestBackgroundPermissionsAsync();
  return {
    ok: true,
    latitude: point.coords.latitude,
    longitude: point.coords.longitude,
    background: asked.status === 'granted' ? 'granted' : 'denied',
  };
}

export async function readCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return null;
  try {
    const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: point.coords.latitude, longitude: point.coords.longitude };
  } catch {
    return null;
  }
}

export async function startRequestTracking(): Promise<void> {
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== 'granted') return;
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (started) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60_000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'JunctionShare request is active',
      notificationBody: 'Updating your location so nearby riders can see your request.',
      notificationColor: '#2F6F4E',
    },
  });
}

export async function stopRequestTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
