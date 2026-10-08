import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncSavedProfile } from '../../services/matching';
import { PROFILE_KEYS } from '../../storage/profile';
import { ProfileScreen } from '../ProfileScreen';

jest.mock('../../services/matching', () => ({
  syncSavedProfile: jest.fn(async () => undefined),
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

function wrap(ui: React.ReactElement) {
  return <SafeAreaProvider>{ui}</SafeAreaProvider>;
}

async function renderProfile() {
  await render(wrap(<ProfileScreen onBack={() => {}} />));
  await screen.findByLabelText('Save profile');
}

describe('<ProfileScreen /> save', () => {
  test('does not offer a contacts button or save while typing', async () => {
    await renderProfile();
    expect(screen.queryByLabelText('Use number from this phone')).toBeNull();
    expect(screen.queryByText(/contacts/i)).toBeNull();
    const name = screen.getByLabelText('First name');
    await fireEvent.changeText(name, 'Sudeep');
    await fireEvent(name, 'blur');
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.name)).toBeNull();
  });

  test('saves a valid name and WhatsApp number and shows a confirmation', async () => {
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Sudeep');
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '(609) 555-0101');
    await fireEvent.press(screen.getByLabelText('Save profile'));
    await screen.findByText(/Saved\./);
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.name)).toBe('Sudeep');
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.whatsapp)).toBe('1');
    });
    expect(syncSavedProfile).toHaveBeenCalledWith({
      firstName: 'Sudeep',
      phoneE164: '+16095550101',
      shareLocation: true,
    });
  });

  test('shows an error and does not save an invalid number', async () => {
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Sudeep');
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '609555');
    await fireEvent.press(screen.getByLabelText('Save profile'));
    expect(screen.getByText(/too short/i)).toBeTruthy();
    expect(screen.queryByText(/^Saved\./)).toBeNull();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.name)).toBeNull();
    expect(syncSavedProfile).not.toHaveBeenCalled();
  });

  test('shows an error when the name is missing', async () => {
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '+16095550101');
    await fireEvent.press(screen.getByLabelText('Save profile'));
    expect(screen.getByText('Enter your first name.')).toBeTruthy();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
  });

  test('reports a save failure instead of failing silently', async () => {
    await renderProfile();
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Sudeep');
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '+16095550101');
    await fireEvent.press(screen.getByLabelText('Save profile'));
    await screen.findByText('Could not securely save your profile.');
    expect(screen.queryByText(/^Saved\./)).toBeNull();
  });

  test('keeps the on-device save and shows an error when live matching cannot be updated', async () => {
    (syncSavedProfile as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await renderProfile();
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Sudeep');
    await fireEvent.changeText(screen.getByLabelText('WhatsApp phone number'), '+16095550101');
    await fireEvent.press(screen.getByLabelText('Save profile'));
    await screen.findByText(/Saved on this phone/);
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
  });

  test('restores a persisted number', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.name, 'Sudeep');
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await render(wrap(<ProfileScreen onBack={() => {}} />));
    expect(await screen.findByDisplayValue('Sudeep')).toBeTruthy();
    expect(screen.getByDisplayValue('+16095550101')).toBeTruthy();
  });

  test('opens the in-app privacy policy', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Privacy Policy'));
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText(/no email sign-in and no in-app payments/i)).toBeTruthy();
    expect(screen.getByText(/does not read your contacts/i)).toBeTruthy();
  });
});
