import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Anonymous session. Wiped with other secure-store keys on a fresh install. */
export const SUPABASE_SESSION_KEY = 'junctionshare_supabase_session';

type Session = { access_token: string; refresh_token: string; expires_at?: number };

export const supabaseConfigured = Boolean(url && publishableKey);

function requireConfig() {
  if (!url || !publishableKey) {
    throw new Error('Live matching is not available in this build.');
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

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const body = payload as Record<string, unknown>;
  for (const key of ['message', 'msg', 'error_description', 'error', 'hint'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function requestSession(refreshToken?: string): Promise<Response> {
  requireConfig();
  if (refreshToken) {
    return fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: publishableKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }
  return fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: publishableKey!, 'Content-Type': 'application/json' },
    body: '{}',
  });
}

async function authSession(): Promise<Session> {
  requireConfig();
  let session: Session | null = null;
  try {
    const saved = await getStored(SUPABASE_SESSION_KEY);
    session = saved ? (JSON.parse(saved) as Session) : null;
  } catch {
    session = null;
  }

  if (session?.access_token && (session.expires_at ?? 0) > Date.now() / 1000 + 60) return session;

  let response: Response;
  try {
    response = await requestSession(session?.refresh_token);
  } catch {
    throw new Error('No network connection. Check your connection and try again.');
  }
  let payload = await readBody(response);
  if ((!response.ok || !payload || typeof payload !== 'object' || !('access_token' in payload)) && session?.refresh_token) {
    await store(SUPABASE_SESSION_KEY, null);
    try {
      response = await requestSession();
    } catch {
      throw new Error('No network connection. Check your connection and try again.');
    }
    payload = await readBody(response);
  }
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  if (!response.ok || typeof record?.access_token !== 'string' || typeof record.refresh_token !== 'string') {
    await store(SUPABASE_SESSION_KEY, null);
    throw new Error(errorMessage(payload, 'Could not start a matching session.'));
  }
  const expiresIn = typeof record.expires_in === 'number' ? record.expires_in : 3600;
  const next: Session = {
    access_token: record.access_token,
    refresh_token: record.refresh_token,
    expires_at: typeof record.expires_at === 'number' ? record.expires_at : Date.now() / 1000 + expiresIn,
  };
  await store(SUPABASE_SESSION_KEY, JSON.stringify(next));
  return next;
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  requireConfig();
  const session = await authSession();
  let response: Response;
  try {
    response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: publishableKey!,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new Error('No network connection. Check your connection and try again.');
  }
  const result = await readBody(response);
  if (!response.ok) {
    throw new Error(errorMessage(result, `Could not reach live matching (${response.status}).`));
  }
  return result as T;
}
