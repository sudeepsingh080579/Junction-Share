import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SESSION_KEY = 'junctionshare_supabase_session';

type Session = { access_token: string; refresh_token: string; expires_at?: number };

function configured() {
  if (!url || !publishableKey) {
    throw new Error('Live matching is not configured. Add the Supabase URL and publishable key to the app environment.');
  }
}

async function getStored(key: string) {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function store(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }
  if (value == null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

async function authSession(): Promise<Session> {
  configured();
  let session: Session | null = null;
  try {
    const saved = await getStored(SESSION_KEY);
    session = saved ? JSON.parse(saved) as Session : null;
  } catch {
    session = null;
  }

  if (session?.access_token && (session.expires_at ?? 0) > Date.now() / 1000 + 60) return session;

  const response = session?.refresh_token
    ? await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { apikey: publishableKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      })
    : await fetch(`${url}/auth/v1/signup`, {
        method: 'POST', headers: { apikey: publishableKey!, 'Content-Type': 'application/json' }, body: '{}',
      });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    if (session) await store(SESSION_KEY, null);
    throw new Error(payload.msg || payload.message || payload.error_description || 'Could not connect to Supabase authentication.');
  }
  const next: Session = { ...payload, expires_at: payload.expires_at ?? Date.now() / 1000 + payload.expires_in };
  await store(SESSION_KEY, JSON.stringify(next));
  return next;
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  configured();
  const session = await authSession();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: publishableKey!, Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json', ...init.headers,
    },
  });
  const body = await response.text();
  const result = body ? JSON.parse(body) : null;
  if (!response.ok) throw new Error(result?.message || result?.msg || result?.error || `Supabase request failed (${response.status}).`);
  return result as T;
}

export const supabaseConfigured = Boolean(url && publishableKey);
