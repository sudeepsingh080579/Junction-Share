import * as SecureStore from 'expo-secure-store';
import { toDisplayPhone } from '../utils/phone';

export const PROFILE_KEYS = {
  name: 'js_profile_name',
  phone: 'js_profile_phone',
  location: 'js_profile_location_optin',
  whatsapp: 'js_profile_whatsapp_optin',
} as const;

export type Profile = {
  name: string;
  /** Validated `+E.164` number, or '' when none has been saved. */
  phone: string;
  locationOptIn: boolean;
  whatsappOptIn: boolean;
};

/** Privacy-affecting settings are opt-in: nothing is shared until the user turns it on. */
export const DEFAULT_PROFILE: Profile = {
  name: '',
  phone: '',
  locationOptIn: false,
  whatsappOptIn: false,
};

export async function loadProfile(): Promise<Profile> {
  const [name, phone, loc, wa] = await Promise.all([
    SecureStore.getItemAsync(PROFILE_KEYS.name),
    SecureStore.getItemAsync(PROFILE_KEYS.phone),
    SecureStore.getItemAsync(PROFILE_KEYS.location),
    SecureStore.getItemAsync(PROFILE_KEYS.whatsapp),
  ]);
  return {
    name: name ?? DEFAULT_PROFILE.name,
    // Re-validate on read so a value written by an older build cannot leak an unroutable number.
    phone: phone ? toDisplayPhone(phone) : DEFAULT_PROFILE.phone,
    locationOptIn: loc == null ? DEFAULT_PROFILE.locationOptIn : loc === '1',
    whatsappOptIn: wa == null ? DEFAULT_PROFILE.whatsappOptIn : wa === '1',
  };
}

export function saveProfileName(name: string): Promise<void> {
  return SecureStore.setItemAsync(PROFILE_KEYS.name, name);
}

/** Expects an already-validated `+E.164` number. */
export function saveProfilePhone(phoneE164: string): Promise<void> {
  return SecureStore.setItemAsync(PROFILE_KEYS.phone, phoneE164);
}

export function saveLocationOptIn(value: boolean): Promise<void> {
  return SecureStore.setItemAsync(PROFILE_KEYS.location, value ? '1' : '0');
}

export function saveWhatsappOptIn(value: boolean): Promise<void> {
  return SecureStore.setItemAsync(PROFILE_KEYS.whatsapp, value ? '1' : '0');
}
