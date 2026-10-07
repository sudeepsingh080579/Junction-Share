import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
        onChangeText: (t: string) => onChange({ label: t }),
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
  await SecureStore.deleteItemAsync('js_active_request');
}

beforeEach(async () => {
  await clearProfile();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
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
  test('home shows demo nearby riders and the main CTAs', async () => {
    await render(<App />);
    await screen.findByText('JunctionShare');
    expect(screen.getByLabelText('Need a ride')).toBeTruthy();
    expect(screen.getByLabelText('Have seats')).toBeTruthy();
    expect(screen.getByText(/3 nearby/)).toBeTruthy();
    expect(screen.getByText(/demo nearby riders/i)).toBeTruthy();
  });

  test('broadcasts without a location opt-in, matches from inbox, and can end the request', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Need a ride'));
    await screen.findByLabelText('Broadcast');
    await fireEvent.press(screen.getByLabelText('Broadcast'));
    await screen.findByText(/Your active request/);
    expect(screen.getByText(/West Windsor Community Park/)).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalledWith('Location sharing is off', expect.anything(), expect.anything());

    await fireEvent.press(screen.getByLabelText('Nearby requests'));
    await screen.findByText('Nearby inbox');
    expect(screen.getByText(/Sam ·/)).toBeTruthy();
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

  test('Have seats uses the offer role on the create screen', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Have seats'));
    await screen.findByText('Have seats');
    expect(screen.getByLabelText('Broadcast')).toBeTruthy();
  });
});
