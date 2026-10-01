import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { NearbyCard, RadiusM, Role, RideRequest } from '../types';
import { supabaseConfigured, supabaseRequest } from './supabase';
import { toWhatsAppDigits } from '../utils/phone';

const PROFILE_KEYS = { name: 'js_profile_name', phone: 'js_profile_phone', location: 'js_profile_location_optin', whatsapp: 'js_profile_whatsapp_optin' };
const getLocal = async (key: string) => Platform.OS === 'web'
  ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
  : SecureStore.getItemAsync(key);

export async function readLocalProfile() {
  const [firstName, phone, location, whatsapp] = await Promise.all(Object.values(PROFILE_KEYS).map(getLocal));
  const phoneDigits = phone ? toWhatsAppDigits(phone) : '';
  return {
    firstName: firstName?.trim() || 'Neighbor', phoneE164: phoneDigits ? `+${phoneDigits}` : '',
    shareLocation: location === '1', whatsappOptIn: whatsapp === '1',
  };
}

export async function saveRemoteProfile() {
  const profile = await readLocalProfile();
  await supabaseRequest('/rest/v1/rpc/save_my_profile', {
    method: 'POST', body: JSON.stringify({
      p_first_name: profile.firstName, p_phone_e164: profile.phoneE164,
      p_share_location: profile.shareLocation, p_whatsapp_opt_in: profile.whatsappOptIn,
    }),
  });
  return profile;
}

type NearbyRow = { request_id: string; first_name: string; distance_m: number; destination: string; role: Role; seats: number; created_at: string; window_min: number };
export async function loadActiveRequest(): Promise<RideRequest | null> {
  const rows = await supabaseRequest<{ request_id: string; role: Role; destination: string; destination_lat: number | null; destination_lng: number | null; radius_m: RadiusM; window_min: number; note: string; created_at: string }[]>('/rest/v1/rpc/my_active_request', { method: 'POST', body: '{}' });
  const row = rows[0];
  return row ? { id: row.request_id, role: row.role, destination: row.destination, destinationLat: row.destination_lat ?? undefined, destinationLng: row.destination_lng ?? undefined, radiusM: row.radius_m, windowMin: row.window_min, note: row.note, createdAt: Date.parse(row.created_at) } : null;
}

export async function fetchNearby(): Promise<NearbyCard[]> {
  const rows = await supabaseRequest<NearbyRow[]>('/rest/v1/rpc/nearby_requests', { method: 'POST', body: '{}' });
  return rows.map((row) => ({
    id: row.request_id, firstName: row.first_name, distanceM: Math.round(row.distance_m), destination: row.destination,
    role: row.role, seats: row.seats, phoneE164: '', createdAt: Date.parse(row.created_at), windowMin: row.window_min,
  }));
}

export async function fetchMatches(): Promise<NearbyCard[]> {
  const rows = await supabaseRequest<{ request_id: string; first_name: string; phone_e164: string | null; distance_m: number; destination: string; role: Role; seats: number; created_at: string; window_min: number }[]>('/rest/v1/rpc/my_matches', { method: 'POST', body: '{}' });
  return rows.map((row) => ({ id: row.request_id, firstName: row.first_name, phoneE164: row.phone_e164 ? toWhatsAppDigits(row.phone_e164) : '', distanceM: Math.round(row.distance_m), destination: row.destination, role: row.role, seats: row.seats, createdAt: Date.parse(row.created_at), windowMin: row.window_min }));
}

export async function publishRequest(payload: { role: Role; destination: string; destinationLat?: number; destinationLng?: number; radiusM: RadiusM; windowMin: number; note: string; latitude: number; longitude: number }): Promise<RideRequest> {
  if (!supabaseConfigured) throw new Error('Live matching is not configured yet. Add the Supabase project URL and publishable key.');
  const profile = await saveRemoteProfile();
  if (!profile.shareLocation) throw new Error('Turn on “Share location while requesting” in Profile / safety before broadcasting.');
  const rows = await supabaseRequest<{ request_id: string; created_at: string }[]>('/rest/v1/rpc/publish_request', {
    method: 'POST', body: JSON.stringify({
      p_role: payload.role, p_destination: payload.destination, p_destination_lat: payload.destinationLat ?? null,
      p_destination_lng: payload.destinationLng ?? null, p_radius_m: payload.radiusM, p_window_min: payload.windowMin,
      p_note: payload.note, p_latitude: payload.latitude, p_longitude: payload.longitude,
    }),
  });
  const row = rows[0];
  return { ...payload, id: row.request_id, createdAt: Date.parse(row.created_at) };
}

type InterestResult = { matched: boolean; request_id: string; first_name: string; phone_e164: string | null; distance_m: number; destination: string; role: Role; seats: number; created_at: string; window_min: number }[];
export async function expressInterest(requestId: string): Promise<{ matched: boolean; match?: NearbyCard }> {
  const rows = await supabaseRequest<InterestResult>('/rest/v1/rpc/express_interest', { method: 'POST', body: JSON.stringify({ p_request_id: requestId }) });
  const row = rows[0];
  if (!row?.matched) return { matched: false };
  return { matched: true, match: {
    id: row.request_id, firstName: row.first_name, phoneE164: row.phone_e164 ? toWhatsAppDigits(row.phone_e164) : '',
    distanceM: Math.round(row.distance_m), destination: row.destination, role: row.role, seats: row.seats,
    createdAt: Date.parse(row.created_at), windowMin: row.window_min,
  } };
}

export async function declineRequest(requestId: string) {
  await supabaseRequest('/rest/v1/rpc/decline_request', { method: 'POST', body: JSON.stringify({ p_request_id: requestId }) });
}

export async function endActiveRequest() {
  if (!supabaseConfigured) return;
  await supabaseRequest('/rest/v1/rpc/end_my_request', { method: 'POST', body: '{}' });
}
