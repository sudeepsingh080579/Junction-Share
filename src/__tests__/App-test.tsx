import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import App from '../../App';
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
        onChangeText: (t: string) => onChange({ label: t, lat: 40.3, lng: -74.6 }),
      }),
  };
});

jest.mock('expo-contacts/legacy', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  presentContactPickerAsync: jest.fn(),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name' },
  SortTypes: { FirstName: 'firstName' },
}));

async function clearProfile() {
  for (const key of Object.values(PROFILE_KEYS)) {
    await SecureStore.deleteItemAsync(key);
  }
}

beforeEach(async () => {
  await clearProfile();
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
});

afterEach(() => {
  (Alert.alert as jest.Mock | undefined)?.mockRestore?.();
});

describe('JunctionShare production flow', () => {
  test('home shows demo nearby riders and the main CTAs', async () => {
    await render(<App />);
    await screen.findByText('JunctionShare');
    expect(screen.getByLabelText('Need a ride')).toBeTruthy();
    expect(screen.getByLabelText('Have seats')).toBeTruthy();
    expect(screen.getByText(/3 nearby/)).toBeTruthy();
    expect(screen.getByText(/demo nearby riders/i)).toBeTruthy();
  });

  test('broadcast is blocked until location sharing is opted in', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await screen.findByLabelText('Broadcast');
    await fireEvent.press(screen.getByLabelText('Broadcast'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location sharing is off',
        expect.any(String),
        expect.any(Array),
      );
    });
    expect(screen.queryByText(/Your active request/)).toBeNull();
  });

  test('broadcasts after location opt-in, matches from inbox, and can end the request', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Profile'));
    await screen.findByLabelText('Share location while requesting');
    await fireEvent(screen.getByLabelText('Share location while requesting'), 'valueChange', true);
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.location)).toBe('1');
    });
    await fireEvent.press(screen.getByLabelText('Back'));

    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await screen.findByLabelText('Broadcast');
    await fireEvent.press(screen.getByLabelText('Broadcast'));
    await screen.findByText(/Your active request/);
    expect(screen.getByText(/West Windsor Community Park/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Nearby requests'));
    await screen.findByText('Nearby inbox');
    await fireEvent.press(screen.getByLabelText('Decline Sam'));
    expect(screen.queryByText(/Sam ·/)).toBeNull();

    await fireEvent.press(screen.getByLabelText('Interested in Alex'));
    await screen.findByText('Match');
    expect(screen.getByLabelText('Chat on WhatsApp')).toBeTruthy();
    expect(screen.getByText(/Your trip: West Windsor Community Park/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Back'));
    await fireEvent.press(screen.getByLabelText('Back'));
    await fireEvent.press(screen.getByLabelText('End active request'));
    expect(screen.queryByText(/Your active request/)).toBeNull();
  });

  test('Have seats uses the offer role on the create screen', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Have seats'));
    await screen.findByText('Have seats');
    expect(screen.getByLabelText('Broadcast')).toBeTruthy();
  });
});
