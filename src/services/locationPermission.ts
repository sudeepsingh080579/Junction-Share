import * as Location from 'expo-location';

export type LocationAccess =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'unavailable' };

/**
 * Ask for foreground location (when-in-use). Used when the rider opts in
 * and again before a broadcast so we never claim location we cannot read.
 */
export async function ensureForegroundLocation(): Promise<LocationAccess> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function locationAccessMessage(access: Extract<LocationAccess, { ok: false }>): {
  title: string;
  body: string;
} {
  if (access.reason === 'denied') {
    return {
      title: 'Location permission needed',
      body: 'Allow location while using JunctionShare so we can match nearby riders. You can enable this in system Settings.',
    };
  }
  return {
    title: 'Location unavailable',
    body: 'Location could not be read on this device. Try again in a moment.',
  };
}
