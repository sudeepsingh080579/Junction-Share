import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { ProfileScreen } from '../ProfileScreen';
import { PROFILE_KEYS } from '../../storage/profile';

jest.mock('expo-contacts/legacy', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  presentContactPickerAsync: jest.fn(),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name' },
  SortTypes: { FirstName: 'firstName' },
}));

async function clearStore() {
  for (const key of Object.values(PROFILE_KEYS)) {
    await SecureStore.deleteItemAsync(key);
  }
}

beforeEach(async () => {
  await clearStore();
  jest.clearAllMocks();
});

async function renderFreshProfile() {
  await render(<ProfileScreen onBack={() => {}} />);
  // The initial keychain read finds no number and the (denied) contacts prompt settles here.
  await screen.findByText(/Contacts permission needed/);
}

describe('<ProfileScreen /> privacy defaults', () => {
  test('both privacy toggles are off for a fresh install', async () => {
    await renderFreshProfile();
    expect(screen.getByLabelText('Share location while requesting').props.value).toBe(false);
    expect(screen.getByLabelText('WhatsApp nearby alerts').props.value).toBe(false);
  });

  test('does not display a hardcoded name', async () => {
    await renderFreshProfile();
    expect(screen.getByDisplayValue('')).toBeTruthy();
  });

  test('restores persisted opt-ins and number', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.location, '1');
    await SecureStore.setItemAsync(PROFILE_KEYS.whatsapp, '1');
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await render(<ProfileScreen onBack={() => {}} />);
    await screen.findByText('Using saved WhatsApp number.');
    expect(screen.getByLabelText('Share location while requesting').props.value).toBe(true);
    expect(screen.getByLabelText('WhatsApp nearby alerts').props.value).toBe(true);
    expect(screen.getByDisplayValue('+16095550101')).toBeTruthy();
  });

  test('turning on location sharing persists explicit consent', async () => {
    await renderFreshProfile();
    await fireEvent(screen.getByLabelText('Share location while requesting'), 'valueChange', true);
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.location)).toBe('1');
    });
    expect(screen.getByLabelText('Share location while requesting').props.value).toBe(true);
  });

  test('refuses to enable WhatsApp alerts without a valid number', async () => {
    await renderFreshProfile();
    await fireEvent(screen.getByLabelText('WhatsApp nearby alerts'), 'valueChange', true);
    expect(screen.getByLabelText('WhatsApp nearby alerts').props.value).toBe(false);
    expect(screen.getByText('Add a valid WhatsApp number before turning on alerts.')).toBeTruthy();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.whatsapp)).toBeNull();
  });
});

describe('<ProfileScreen /> phone validation', () => {
  test('shows an error for an invalid number on blur and does not save it', async () => {
    await renderFreshProfile();
    const input = screen.getByLabelText('WhatsApp phone number');
    await fireEvent.changeText(input, '609555');
    await fireEvent(input, 'blur');
    expect(screen.getByText(/too short/i)).toBeTruthy();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
  });

  test('saves a valid number as E.164 and clears the error', async () => {
    await renderFreshProfile();
    const input = screen.getByLabelText('WhatsApp phone number');
    await fireEvent.changeText(input, '609555');
    await fireEvent(input, 'blur');
    expect(screen.getByText(/too short/i)).toBeTruthy();

    await fireEvent.changeText(input, '(609) 555-0101');
    await fireEvent(input, 'blur');
    expect(screen.queryByText(/too short/i)).toBeNull();
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
    });
  });

  test('reports a save failure instead of failing silently', async () => {
    await renderFreshProfile();
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '+16095550101');
    await screen.findByText('Could not securely save this number.');
  });
});
