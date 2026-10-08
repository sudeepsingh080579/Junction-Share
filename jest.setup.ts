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

jest.mock('expo-file-system', () => {
  const files = new Map<string, string>([['js_install_marker_v1', '1']]);
  class File {
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists() {
      return files.has(this.name);
    }
    create() {
      if (files.has(this.name)) throw new Error('exists');
      files.set(this.name, '');
    }
    write(value: string) {
      files.set(this.name, value);
    }
    delete() {
      files.delete(this.name);
    }
  }
  return {
    File,
    Paths: { document: { uri: 'file:///doc' } },
    __files: files,
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { WebView: () => React.createElement(View, { testID: 'webview' }) };
});

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => true),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 40.316, longitude: -74.623 } })),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
}));

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
