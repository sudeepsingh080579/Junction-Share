import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

function wrap(ui: React.ReactElement) {
  return <SafeAreaProvider>{ui}</SafeAreaProvider>;
}

async function renderFreshProfile() {
  await render(wrap(<ProfileScreen onBack={() => {}} />));
  await screen.findByLabelText('Use number from this phone');
}

describe('<ProfileScreen /> privacy defaults', () => {
  test('does not show location sharing or WhatsApp alert switches', async () => {
    await renderFreshProfile();
    expect(screen.queryByLabelText('Share location while requesting')).toBeNull();
    expect(screen.queryByLabelText('WhatsApp nearby alerts')).toBeNull();
  });

  test('does not display a hardcoded name', async () => {
    await renderFreshProfile();
    expect(screen.getByDisplayValue('')).toBeTruthy();
  });

  test('does not prompt for contacts until the user asks', async () => {
    await renderFreshProfile();
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(/Contacts permission needed/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Use number from this phone'));
    await screen.findByText(/Contacts permission needed/);
  });

  test('a cancelled contact picker does not read the address book', async () => {
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Contacts.presentContactPickerAsync as jest.Mock).mockResolvedValueOnce(null);
    await renderFreshProfile();
    await fireEvent.press(screen.getByLabelText('Use number from this phone'));
    await screen.findByText('No contact selected.');
    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
  });

  test('saves only the contact the user picked', async () => {
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Contacts.presentContactPickerAsync as jest.Mock).mockResolvedValueOnce({
      phoneNumbers: [{ number: '(609) 555-0101', label: 'mobile' }],
    });
    await renderFreshProfile();
    await fireEvent.press(screen.getByLabelText('Use number from this phone'));
    await screen.findByText(/contact you picked/);
    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
  });

  test('opens the in-app privacy policy', async () => {
    await renderFreshProfile();
    await fireEvent.press(screen.getByLabelText('Privacy Policy'));
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText(/no accounts or in-app payments/i)).toBeTruthy();
  });

  test('restores a persisted number', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await render(wrap(<ProfileScreen onBack={() => {}} />));
    await screen.findByText('Using saved WhatsApp number.');
    expect(screen.getByDisplayValue('+16095550101')).toBeTruthy();
  });

  test('saves the first name on blur, not on each keystroke', async () => {
    await renderFreshProfile();
    const input = screen.getByLabelText('First name');
    await fireEvent.changeText(input, 'Sudeep');
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.name)).toBeNull();
    await fireEvent(input, 'blur');
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.name)).toBe('Sudeep');
    });
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
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
    await fireEvent(input, 'blur');
    expect(screen.queryByText(/too short/i)).toBeNull();
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
    });
  });

  test('deletes the saved number and turns alerts off when the field is cleared', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await SecureStore.setItemAsync(PROFILE_KEYS.whatsapp, '1');
    await render(wrap(<ProfileScreen onBack={() => {}} />));
    const input = await screen.findByDisplayValue('+16095550101');
    await fireEvent.changeText(input, '');
    await fireEvent(input, 'blur');
    await waitFor(async () => {
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
      expect(await SecureStore.getItemAsync(PROFILE_KEYS.whatsapp)).toBe('0');
    });
  });

  test('reports a save failure instead of failing silently', async () => {
    await renderFreshProfile();
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
    const input = screen.getByLabelText('WhatsApp phone number');
    await fireEvent.changeText(input, '+16095550101');
    await fireEvent(input, 'blur');
    await screen.findByText('Could not securely save this number.');
  });
});
