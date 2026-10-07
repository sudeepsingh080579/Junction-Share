import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MOCK_NEARBY } from '../../data/mockNearby';
import { MatchScreen } from '../MatchScreen';

function wrap(ui: React.ReactElement) {
  return <SafeAreaProvider>{ui}</SafeAreaProvider>;
}

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  (Linking.openURL as jest.Mock).mockClear();
  (Alert.alert as jest.Mock).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<MatchScreen />', () => {
  test('opens a wa.me link for a valid demo number', async () => {
    await render(wrap(<MatchScreen match={MOCK_NEARBY[0]} onBack={() => {}} />));
    await fireEvent.press(screen.getByLabelText('Chat on WhatsApp'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/16095550101?text='));
    });
  });

  test('alerts when the match has no routable number', async () => {
    await render(
      wrap(
        <MatchScreen
          match={{ ...MOCK_NEARBY[0], phoneE164: '' }}
          onBack={() => {}}
        />,
      ),
    );
    await fireEvent.press(screen.getByLabelText('Chat on WhatsApp'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('No WhatsApp number', expect.any(String));
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
