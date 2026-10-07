import * as SecureStore from 'expo-secure-store';
import { DESTINATION_MAX_LENGTH, NOTE_MAX_LENGTH } from '../constants/limits';
import { RadiusM, RideRequest } from '../types';
import { isExpired } from '../utils/expiry';

export const ACTIVE_REQUEST_KEY = 'js_active_request';

const RADII: readonly RadiusM[] = [100, 500, 1000];

let chain: Promise<unknown> = Promise.resolve();

/** Serialize storage mutations so a clear cannot land after a newer save. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isRadius(v: unknown): v is RadiusM {
  return typeof v === 'number' && (RADII as readonly number[]).includes(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Narrow untrusted JSON (from storage) to a well-formed RideRequest, or null. */
export function parseRideRequest(raw: unknown): RideRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (r.role !== 'need' && r.role !== 'offer') return null;
  if (typeof r.destination !== 'string') return null;
  const destination = r.destination.trim().slice(0, DESTINATION_MAX_LENGTH);
  if (!destination) return null;
  if (!isRadius(r.radiusM)) return null;
  if (!isFiniteNumber(r.windowMin) || r.windowMin <= 0) return null;
  if (!isFiniteNumber(r.createdAt)) return null;
  if (r.destinationLat !== undefined && !isFiniteNumber(r.destinationLat)) return null;
  if (r.destinationLng !== undefined && !isFiniteNumber(r.destinationLng)) return null;

  return {
    id: r.id,
    role: r.role,
    destination,
    destinationLat: r.destinationLat,
    destinationLng: r.destinationLng,
    radiusM: r.radiusM,
    windowMin: r.windowMin,
    note: (typeof r.note === 'string' ? r.note : '').slice(0, NOTE_MAX_LENGTH),
    createdAt: r.createdAt,
  };
}

async function deleteIfUnchanged(snapshot: string, expectedId?: string): Promise<void> {
  const current = await SecureStore.getItemAsync(ACTIVE_REQUEST_KEY);
  if (current !== snapshot) return;
  if (expectedId !== undefined) {
    try {
      const id = (JSON.parse(current) as { id?: unknown }).id;
      if (id !== expectedId) return;
    } catch {
      return;
    }
  }
  await SecureStore.deleteItemAsync(ACTIVE_REQUEST_KEY);
}

/**
 * Restore the user's active broadcast after an app restart. Returns null when
 * nothing is stored, the payload is malformed, or the request has already expired.
 */
export function loadActiveRequest(now = Date.now()): Promise<RideRequest | null> {
  return enqueue(async () => {
    let raw: string | null;
    try {
      raw = await SecureStore.getItemAsync(ACTIVE_REQUEST_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        await deleteIfUnchanged(raw);
      } catch {
        // A failed delete is retried the next time this payload is read.
      }
      return null;
    }

    const req = parseRideRequest(parsed);
    if (!req || isExpired(req.createdAt, req.windowMin, now)) {
      try {
        await deleteIfUnchanged(raw, req?.id);
      } catch {
        // Leave the payload; the next load will try again.
      }
      return null;
    }
    return req;
  });
}

export function saveActiveRequest(req: RideRequest): Promise<void> {
  return enqueue(() => SecureStore.setItemAsync(ACTIVE_REQUEST_KEY, JSON.stringify(req)));
}

/**
 * Delete the stored request. When `expectedId` is set, a newer request with a
 * different id is left in place.
 */
export function clearActiveRequest(expectedId?: string): Promise<void> {
  return enqueue(async () => {
    try {
      const raw = await SecureStore.getItemAsync(ACTIVE_REQUEST_KEY);
      if (!raw) return;
      if (expectedId !== undefined) {
        try {
          const id = (JSON.parse(raw) as { id?: unknown }).id;
          if (id !== expectedId) return;
        } catch {
          return;
        }
      }
      const again = await SecureStore.getItemAsync(ACTIVE_REQUEST_KEY);
      if (again !== raw) return;
      await SecureStore.deleteItemAsync(ACTIVE_REQUEST_KEY);
    } catch {
      // Nothing to do: a stale entry is re-validated (and dropped if expired) on next load.
    }
  });
}
