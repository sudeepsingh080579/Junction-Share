import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import App from '../../App';
import { prepareBroadcastLocation, startRequestTracking, stopRequestTracking } from '../services/location';
import {
  declineRequest,
  endActiveRequest,
  expressInterest,
  fetchNearbyRequests,
  publishLiveRequest,
} from '../services/matching';
import { PROFILE_KEYS } from '../storage/profile';

jest.mock('../components/DestinationMapSearch', () => {
  // Jest mock factories cannot use ESM imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return {
    DestinationMapSearch: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (next: { label: string; lat?: number; lng?: number }) => void;
    }) =>
      ReactLib.createElement(RN.TextInput, {
        accessibilityLabel: 'Destination search',
        value,
        onChangeText: (t: string) => onChange({ label: t }),
      }),
  };
});

jest.mock('../services/location', () => ({
  prepareBroadcastLocation: jest.fn(),
  readCurrentCoordinates: jest.fn(async () => null),
  startRequestTracking: jest.fn(async () => undefined),
  stopRequestTracking: jest.fn(async () => undefined),
}));

jest.mock('../services/matching', () => ({
  publishLiveRequest: jest.fn(),
  fetchNearbyRequests: jest.fn(async () => []),
  fetchMutualMatches: jest.fn(async () => []),
  fetchRemoteActiveRequest: jest.fn(async () => null),
  expressInterest: jest.fn(),
  declineRequest: jest.fn(async () => undefined),
  endActiveRequest: jest.fn(async () => undefined),
  updateMyLocation: jest.fn(async () => undefined),
}));

const nearby = {
  id: 'near-1',
  firstName: 'Alex',
  distanceM: 80,
  destination: 'Nassau Park',
  role: 'offer' as const,
  seats: 2,
  phoneE164: '',
  createdAt: Date.now(),
  windowMin: 30,
};

async function clearProfile() {
  for (const key of Object.values(PROFILE_KEYS)) {
    await SecureStore.deleteItemAsync(key);
  }
  await SecureStore.deleteItemAsync('js_active_request');
}

async function saveReadyProfile() {
  await SecureStore.setItemAsync(PROFILE_KEYS.name, 'Sudeep');
  await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
}

beforeEach(async () => {
  await clearProfile();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  (prepareBroadcastLocation as jest.Mock).mockResolvedValue({
    ok: true,
    latitude: 40.316,
    longitude: -74.623,
    background: 'granted',
  });
  (publishLiveRequest as jest.Mock).mockImplementation(async (input) => ({
    id: 'live-1',
    role: input.role,
    destination: input.destination,
    destinationLat: input.destinationLat,
    destinationLng: input.destinationLng,
    radiusM: input.radiusM,
    windowMin: input.windowMin,
    note: input.note,
    createdAt: Date.now(),
  }));
  (fetchNearbyRequests as jest.Mock).mockResolvedValue([nearby]);
  (expressInterest as jest.Mock).mockResolvedValue({
    matched: true,
    match: { ...nearby, phoneE164: '16095550101' },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function latestBackHandler(): () => boolean | null | undefined {
  const handlers = (BackHandler.addEventListener as jest.Mock).mock.calls.map((call) => call[1] as () => boolean);
  const handler = handlers.at(-1);
  if (!handler) throw new Error('no back handler');
  return handler;
}

describe('JunctionShare production flow', () => {
  test('home starts with an empty nearby inbox', async () => {
    await render(<App />);
    await screen.findByText('JunctionShare');
    expect(screen.getByLabelText('Need a ride')).toBeTruthy();
    expect(screen.getByLabelText('Have seats')).toBeTruthy();
    expect(screen.getByText(/0 nearby/)).toBeTruthy();
    expect(screen.queryByText(/demo/i)).toBeNull();
  });

  test('broadcasts a live request, matches from the inbox, and can end the request', async () => {
    await saveReadyProfile();
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await screen.findByLabelText('Broadcast');
    await fireEvent.press(screen.getByLabelText('Broadcast'));
    await screen.findByText(/Your active request/);
    expect(screen.getByText(/West Windsor Community Park/)).toBeTruthy();
    expect(publishLiveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 40.316, longitude: -74.623, role: 'need' }),
    );
    expect(startRequestTracking).toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Nearby requests'));
    await screen.findByText(/Alex ·/);
    await fireEvent.press(screen.getByLabelText('Interested in Alex'));
    await screen.findByText('Match');
    expect(screen.getByLabelText('Chat on WhatsApp')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Back'));
    await fireEvent.press(screen.getByLabelText('Back'));
    await fireEvent.press(screen.getByLabelText('End active request'));
    await screen.findByText(/0 nearby/);
    expect(screen.queryByText(/Your active request/)).toBeNull();
    expect(endActiveRequest).toHaveBeenCalled();
    expect(stopRequestTracking).toHaveBeenCalled();
  });

  test('declines a nearby request', async () => {
    await saveReadyProfile();
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await fireEvent.press(await screen.findByLabelText('Broadcast'));
    await screen.findByText(/Your active request/);
    await fireEvent.press(screen.getByLabelText('Nearby requests'));
    await screen.findByText(/Alex ·/);
    await fireEvent.press(screen.getByLabelText('Decline Alex'));
    await screen.findByText(/No one nearby/);
    expect(screen.queryByText(/Alex ·/)).toBeNull();
    expect(declineRequest).toHaveBeenCalledWith('near-1');
  });

  test('asks for a profile before location when name and number are missing', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await fireEvent.press(await screen.findByLabelText('Broadcast'));
    await screen.findByLabelText('Broadcast');
    expect(Alert.alert).toHaveBeenCalledWith('Add your profile', expect.any(String), expect.any(Array));
    expect(prepareBroadcastLocation).not.toHaveBeenCalled();
    expect(publishLiveRequest).not.toHaveBeenCalled();
  });

  test('explains a denied location and leaves the rest of the app available', async () => {
    await saveReadyProfile();
    (prepareBroadcastLocation as jest.Mock).mockResolvedValue({
      ok: false,
      openSettings: true,
      message: 'Location is needed to show your request to nearby riders. Allow location in Settings, then broadcast again.',
    });
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await fireEvent.press(await screen.findByLabelText('Broadcast'));
    await screen.findByLabelText('Broadcast');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Location needed',
      expect.stringMatching(/Settings/),
      expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })]),
    );
    expect(publishLiveRequest).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(await screen.findByText('JunctionShare')).toBeTruthy();
  });

  test('stays on create when the network fails', async () => {
    await saveReadyProfile();
    (publishLiveRequest as jest.Mock).mockRejectedValue(new Error('No network connection. Check your connection and try again.'));
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Have seats'));
    await fireEvent.press(await screen.findByLabelText('Broadcast'));
    await screen.findByLabelText('Broadcast');
    expect(Alert.alert).toHaveBeenCalledWith('Broadcast unavailable', expect.stringMatching(/No network connection/));
    expect(screen.queryByText(/Your active request/)).toBeNull();
  });

  test('keeps the create draft when Profile is opened and system Back returns there', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    await render(<App />);
    const appBack = addListener.mock.calls[0][1] as () => boolean;

    await fireEvent.press(screen.getByLabelText('Need a ride'));
    const destination = await screen.findByLabelText('Destination search');
    await fireEvent.changeText(destination, 'MarketFair Mall');

    await fireEvent.press(screen.getByLabelText('Profile'));
    await screen.findByText('Profile / safety');
    const profileBack = addListener.mock.calls.at(-1)?.[1] as () => boolean;
    await act(async () => {
      expect(profileBack()).toBe(true);
    });
    await screen.findByLabelText('Destination search');
    expect(screen.getByDisplayValue('MarketFair Mall')).toBeTruthy();

    await act(async () => {
      expect(appBack()).toBe(true);
    });
    await screen.findByText('JunctionShare');
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    expect(screen.getByDisplayValue('MarketFair Mall')).toBeTruthy();
  });

  test('system Back on Home does not trap the app', async () => {
    jest.spyOn(BackHandler, 'addEventListener');
    await render(<App />);
    await screen.findByText('JunctionShare');
    expect(latestBackHandler()()).toBe(false);
  });
});
