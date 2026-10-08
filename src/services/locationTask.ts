import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateMyLocation } from './matching';

/** Background fixes while a request is active. Defined at import time, before start. */
export const LOCATION_TASK = 'junctionshare-active-request-location';

type LocationTaskData = { locations?: Location.LocationObject[] };

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as LocationTaskData | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  try {
    await updateMyLocation(latest.coords.latitude, latest.coords.longitude);
  } catch {
    // The next fix retries. An ended or expired request is a no-op on the server.
  }
});
