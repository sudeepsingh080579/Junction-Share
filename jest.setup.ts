// In-memory stand-in for the device keychain so screens that persist profile
// data can be exercised without native modules.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __reset: () => store.clear(),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { WebView: () => React.createElement(View, { testID: 'webview' }) };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});
