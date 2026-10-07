import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { ACTIVE_REQUEST_KEY } from '../activeRequest';
import { clearSecureStoreOnFreshInstall, INSTALL_MARKER } from '../installMarker';
import { PROFILE_KEYS } from '../profile';

type Files = Map<string, string>;

function files(): Files {
  return (FileSystem as unknown as { __files: Files }).__files;
}

beforeEach(async () => {
  files().set(INSTALL_MARKER, '1');
  await SecureStore.deleteItemAsync(PROFILE_KEYS.phone);
  await SecureStore.deleteItemAsync(ACTIVE_REQUEST_KEY);
});

describe('clearSecureStoreOnFreshInstall', () => {
  test('leaves secure storage alone when the install marker exists', async () => {
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await expect(clearSecureStoreOnFreshInstall()).resolves.toBe(false);
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBe('+16095550101');
  });

  test('wipes keychain leftovers when the marker is missing, then writes the marker', async () => {
    files().delete(INSTALL_MARKER);
    await SecureStore.setItemAsync(PROFILE_KEYS.phone, '+16095550101');
    await SecureStore.setItemAsync(ACTIVE_REQUEST_KEY, '{"id":"stale"}');
    await expect(clearSecureStoreOnFreshInstall()).resolves.toBe(true);
    expect(await SecureStore.getItemAsync(PROFILE_KEYS.phone)).toBeNull();
    expect(await SecureStore.getItemAsync(ACTIVE_REQUEST_KEY)).toBeNull();
    expect(files().has(INSTALL_MARKER)).toBe(true);
  });
});
