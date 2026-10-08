import { loadProfile, saveLocationOptIn, saveWhatsappOptIn } from '../storage/profile';
import { NearbyCard, RadiusM, RideRequest, Role } from '../types';
import { toWhatsAppDigits } from '../utils/phone';
import { supabaseConfigured, supabaseRequest } from './supabase';

export type PublishInput = {
  role: Role;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  radiusM: RadiusM;
  windowMin: number;
  note: string;
  latitude: number;
  longitude: number;
};

type ActiveRow = {
  request_id: string;
  role: Role;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  radius_m: RadiusM;
  window_min: number;
  note: string;
  created_at: string;
};

type NearbyRow = {
  request_id: string;
  first_name: string;
  distance_m: number;
  destination: string;
  role: Role;
  seats: number;
  created_at: string;
  window_min: number;
};

type MatchRow = NearbyRow & { phone_e164: string | null };
type InterestRow = MatchRow & { matched: boolean };

function asRows<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toRequest(row: ActiveRow): RideRequest {
  return {
    id: row.request_id,
    role: row.role,
    destination: row.destination,
    destinationLat: row.destination_lat ?? undefined,
    destinationLng: row.destination_lng ?? undefined,
    radiusM: row.radius_m,
    windowMin: row.window_min,
    note: row.note,
    createdAt: Date.parse(row.created_at),
  };
}

function toCard(row: NearbyRow, phoneE164 = ''): NearbyCard {
  return {
    id: row.request_id,
    firstName: row.first_name,
    distanceM: Math.round(row.distance_m),
    destination: row.destination,
    role: row.role,
    seats: row.seats,
    phoneE164,
    createdAt: Date.parse(row.created_at),
    windowMin: row.window_min,
  };
}

/** Push the saved name and WhatsApp number. No-op when live matching is not configured. */
export async function syncSavedProfile(input: {
  firstName: string;
  phoneE164: string;
  shareLocation: boolean;
}): Promise<void> {
  if (!supabaseConfigured) return;
  await supabaseRequest('/rest/v1/rpc/save_my_profile', {
    method: 'POST',
    body: JSON.stringify({
      p_first_name: input.firstName,
      p_phone_e164: input.phoneE164,
      p_share_location: input.shareLocation,
      p_whatsapp_opt_in: true,
      p_whatsapp_alerts_opt_in: false,
    }),
  });
}

export async function fetchRemoteActiveRequest(): Promise<RideRequest | null> {
  if (!supabaseConfigured) return null;
  const rows = asRows(await supabaseRequest<ActiveRow[]>('/rest/v1/rpc/my_active_request', { method: 'POST', body: '{}' }));
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function fetchNearbyRequests(): Promise<NearbyCard[]> {
  const rows = asRows(await supabaseRequest<NearbyRow[]>('/rest/v1/rpc/nearby_requests', { method: 'POST', body: '{}' }));
  return rows.map((row) => toCard(row));
}

export async function fetchMutualMatches(): Promise<NearbyCard[]> {
  const rows = asRows(await supabaseRequest<MatchRow[]>('/rest/v1/rpc/my_matches', { method: 'POST', body: '{}' }));
  return rows.map((row) => toCard(row, row.phone_e164 ? toWhatsAppDigits(row.phone_e164) : ''));
}

export async function publishLiveRequest(payload: PublishInput): Promise<RideRequest> {
  if (!supabaseConfigured) {
    throw new Error('Live matching is not available in this build.');
  }
  const profile = await loadProfile();
  const firstName = profile.name.trim();
  if (!firstName || !profile.phone) {
    throw new Error('Save your first name and WhatsApp number on Profile before broadcasting.');
  }
  await syncSavedProfile({ firstName, phoneE164: profile.phone, shareLocation: true });
  await saveLocationOptIn(true);
  await saveWhatsappOptIn(true);
  const rows = asRows(
    await supabaseRequest<{ request_id: string; created_at: string }[]>('/rest/v1/rpc/publish_request', {
      method: 'POST',
      body: JSON.stringify({
        p_role: payload.role,
        p_destination: payload.destination,
        p_destination_lat: payload.destinationLat ?? null,
        p_destination_lng: payload.destinationLng ?? null,
        p_radius_m: payload.radiusM,
        p_window_min: payload.windowMin,
        p_note: payload.note,
        p_latitude: payload.latitude,
        p_longitude: payload.longitude,
      }),
    }),
  );
  const row = rows[0];
  if (!row?.request_id) throw new Error('Live matching did not accept this request.');
  const request: RideRequest = {
    id: row.request_id,
    role: payload.role,
    destination: payload.destination,
    destinationLat: payload.destinationLat,
    destinationLng: payload.destinationLng,
    radiusM: payload.radiusM,
    windowMin: payload.windowMin,
    note: payload.note,
    createdAt: Date.parse(row.created_at),
  };
  void supabaseRequest('/functions/v1/notify-nearby', {
    method: 'POST',
    body: JSON.stringify({ request_id: request.id }),
  }).catch(() => undefined);
  return request;
}

export async function expressInterest(requestId: string): Promise<{ matched: boolean; match?: NearbyCard }> {
  const rows = asRows(
    await supabaseRequest<InterestRow[]>('/rest/v1/rpc/express_interest', {
      method: 'POST',
      body: JSON.stringify({ p_request_id: requestId }),
    }),
  );
  const row = rows[0];
  if (!row?.matched) return { matched: false };
  return { matched: true, match: toCard(row, row.phone_e164 ? toWhatsAppDigits(row.phone_e164) : '') };
}

export async function declineRequest(requestId: string): Promise<void> {
  await supabaseRequest('/rest/v1/rpc/decline_request', {
    method: 'POST',
    body: JSON.stringify({ p_request_id: requestId }),
  });
}

export async function endActiveRequest(): Promise<void> {
  if (!supabaseConfigured) return;
  await supabaseRequest('/rest/v1/rpc/end_my_request', { method: 'POST', body: '{}' });
}

export async function updateMyLocation(latitude: number, longitude: number): Promise<void> {
  if (!supabaseConfigured) return;
  await supabaseRequest('/rest/v1/rpc/update_my_location', {
    method: 'POST',
    body: JSON.stringify({ p_latitude: latitude, p_longitude: longitude }),
  });
}
