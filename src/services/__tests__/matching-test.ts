import * as SecureStore from 'expo-secure-store';
import { PROFILE_KEYS } from '../../storage/profile';
import {
  declineRequest,
  endActiveRequest,
  expressInterest,
  fetchMutualMatches,
  fetchNearbyRequests,
  fetchRemoteActiveRequest,
  publishLiveRequest,
  syncSavedProfile,
  updateMyLocation,
} from '../matching';

jest.mock('../supabase', () => {
  const state = { configured: true };
  return {
    get supabaseConfigured() {
      return state.configured;
    },
    supabaseRequest: jest.fn(),
    __setConfigured(value: boolean) {
      state.configured = value;
    },
  };
});

const supabase = jest.requireMock('../supabase') as {
  supabaseRequest: jest.Mock;
  __setConfigured: (value: boolean) => void;
};

const publishInput = {
  role: 'need' as const,
  destination: 'West Windsor Community Park',
  radiusM: 500 as const,
  windowMin: 15,
  note: 'At the station',
  latitude: 40.316,
  longitude: -74.623,
};

beforeEach(async () => {
  supabase.__setConfigured(true);
  supabase.supabaseRequest.mockReset();
  for (const key of Object.values(PROFILE_KEYS)) {
    await SecureStore.deleteItemAsync(key);
  }
});

describe('live request service', () => {
  test('publish saves the profile, publishes coordinates, and returns the server request', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.name, 'Sudeep');
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    supabase.supabaseRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ request_id: 'req-1', created_at: '2026-10-08T12:00:00.000Z' }])
      .mockResolvedValueOnce({ accepted: 0, failed: 0 });

    const request = await publishLiveRequest(publishInput);

    expect(request).toMatchObject({
      id: 'req-1',
      role: 'need',
      destination: 'West Windsor Community Park',
      createdAt: Date.parse('2026-10-08T12:00:00.000Z'),
    });
    expect(supabase.supabaseRequest).toHaveBeenNthCalledWith(
      1,
      '/rest/v1/rpc/save_my_profile',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_first_name: 'Sudeep',
          p_phone_e164: '+16095550101',
          p_share_location: true,
          p_whatsapp_opt_in: true,
          p_whatsapp_alerts_opt_in: false,
        }),
      }),
    );
    expect(supabase.supabaseRequest).toHaveBeenNthCalledWith(
      2,
      '/rest/v1/rpc/publish_request',
      expect.objectContaining({
        body: expect.stringContaining('"p_latitude":40.316'),
      }),
    );
    await Promise.resolve();
    expect(supabase.supabaseRequest).toHaveBeenCalledWith(
      '/functions/v1/notify-nearby',
      expect.objectContaining({ body: JSON.stringify({ request_id: 'req-1' }) }),
    );
  });

  test('publish fails closed when live matching is not configured and does not call the network', async () => {
    supabase.__setConfigured(false);
    await expect(publishLiveRequest(publishInput)).rejects.toThrow(/not available/);
    expect(supabase.supabaseRequest).not.toHaveBeenCalled();
  });

  test('publish requires a saved name and WhatsApp number', async () => {
    await expect(publishLiveRequest(publishInput)).rejects.toThrow(/Profile/);
    expect(supabase.supabaseRequest).not.toHaveBeenCalled();
  });

  test('nearby cards hide phone numbers', async () => {
    supabase.supabaseRequest.mockResolvedValueOnce([
      {
        request_id: 'near-1',
        first_name: 'Alex',
        distance_m: 42.2,
        destination: 'Nassau Park',
        role: 'offer',
        seats: 2,
        created_at: '2026-10-08T12:00:00.000Z',
        window_min: 30,
      },
    ]);
    const cards = await fetchNearbyRequests();
    expect(cards[0]).toMatchObject({ id: 'near-1', firstName: 'Alex', distanceM: 42, phoneE164: '' });
  });

  test('mutual matches include a WhatsApp number only when the server returns one', async () => {
    supabase.supabaseRequest.mockResolvedValueOnce([
      {
        request_id: 'near-1',
        first_name: 'Alex',
        phone_e164: '+16095550101',
        distance_m: 10,
        destination: 'Nassau Park',
        role: 'offer',
        seats: 1,
        created_at: '2026-10-08T12:00:00.000Z',
        window_min: 15,
      },
    ]);
    const cards = await fetchMutualMatches();
    expect(cards[0].phoneE164).toBe('16095550101');
  });

  test('express interest returns a match only when both people are interested', async () => {
    supabase.supabaseRequest.mockResolvedValueOnce([
      {
        matched: false,
        request_id: 'near-1',
        first_name: 'Alex',
        phone_e164: null,
        distance_m: 10,
        destination: 'Nassau Park',
        role: 'offer',
        seats: 1,
        created_at: '2026-10-08T12:00:00.000Z',
        window_min: 15,
      },
    ]);
    await expect(expressInterest('near-1')).resolves.toEqual({ matched: false });

    supabase.supabaseRequest.mockResolvedValueOnce([
      {
        matched: true,
        request_id: 'near-1',
        first_name: 'Alex',
        phone_e164: '+16095550101',
        distance_m: 10,
        destination: 'Nassau Park',
        role: 'offer',
        seats: 1,
        created_at: '2026-10-08T12:00:00.000Z',
        window_min: 15,
      },
    ]);
    const matched = await expressInterest('near-1');
    expect(matched.matched).toBe(true);
    expect(matched.match?.phoneE164).toBe('16095550101');
  });

  test('decline, end, location update, and profile sync call the matching RPCs', async () => {
    supabase.supabaseRequest.mockResolvedValue(null);
    await declineRequest('near-1');
    await endActiveRequest();
    await updateMyLocation(40.1, -74.6);
    await syncSavedProfile({ firstName: 'Sudeep', phoneE164: '+16095550101', shareLocation: false });
    expect(supabase.supabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/rpc/decline_request',
      expect.objectContaining({ body: JSON.stringify({ p_request_id: 'near-1' }) }),
    );
    expect(supabase.supabaseRequest).toHaveBeenCalledWith('/rest/v1/rpc/end_my_request', expect.anything());
    expect(supabase.supabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/rpc/update_my_location',
      expect.objectContaining({ body: JSON.stringify({ p_latitude: 40.1, p_longitude: -74.6 }) }),
    );
  });

  test('a network failure from the client is surfaced', async () => {
    supabase.supabaseRequest.mockRejectedValueOnce(new Error('No network connection. Check your connection and try again.'));
    await expect(fetchNearbyRequests()).rejects.toThrow(/No network connection/);
  });

  test('an empty active-request response restores nothing', async () => {
    supabase.supabaseRequest.mockResolvedValueOnce([]);
    await expect(fetchRemoteActiveRequest()).resolves.toBeNull();
  });

  test('end and sync do nothing when live matching is not configured', async () => {
    supabase.__setConfigured(false);
    await endActiveRequest();
    await syncSavedProfile({ firstName: 'Sudeep', phoneE164: '+16095550101', shareLocation: true });
    expect(supabase.supabaseRequest).not.toHaveBeenCalled();
  });
});
