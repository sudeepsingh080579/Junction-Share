export type Screen = 'home' | 'create' | 'inbox' | 'match' | 'profile';

/**
 * Screen to show after Android's system Back key.
 * `null` means the app should leave (we're already on Home).
 */
export function screenAfterBack(screen: Screen, profileFrom: Screen): Screen | null {
  switch (screen) {
    case 'home':
      return null;
    case 'create':
    case 'inbox':
      return 'home';
    case 'match':
      return 'inbox';
    case 'profile':
      return profileFrom === 'profile' ? 'home' : profileFrom;
    default:
      return 'home';
  }
}
