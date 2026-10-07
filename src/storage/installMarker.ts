import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { ACTIVE_REQUEST_KEY } from './activeRequest';
import { PROFILE_KEYS } from './profile';

/** Document-directory file. Uninstall removes it; the iOS keychain does not. */
export const INSTALL_MARKER = 'js_install_marker_v1';

const SECURE_KEYS = [ACTIVE_REQUEST_KEY, ...Object.values(PROFILE_KEYS)];

async function wipeSecureStore(): Promise<void> {
  await Promise.all(SECURE_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
}

/**
 * iOS Keychain entries survive uninstall. A missing marker means this is a new
 * install, so drop leftover profile and request data before the UI reads them.
 * Returns true when a wipe ran.
 */
export async function clearSecureStoreOnFreshInstall(): Promise<boolean> {
  try {
    const marker = new File(Paths.document, INSTALL_MARKER);
    if (marker.exists) return false;
    await wipeSecureStore();
    marker.create();
    marker.write('1');
    return true;
  } catch {
    return false;
  }
}
