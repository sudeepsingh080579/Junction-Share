import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NearbyCard } from '../../types';
import { MatchScreen } from '../MatchScreen';

const MATCH: NearbyCard = {
  id: 'near-1',
  firstName: 'Alex',
  distanceM: 40,
  destination: 'West Windsor Community Park',
  role: 'offer',
  seats: 1,
  phoneE164: '16095550101',
  createdAt: 1_700_000_000_000,
  windowMin: 30,
};

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
  test('opens a wa.me link for the matched number', async () => {
    await render(wrap(<MatchScreen match={MATCH} onBack={() => {}} />));
    await fireEvent.press(screen.getByLabelText('Chat on WhatsApp'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/16095550101?text='));
    });
  });

  test('alerts when the match has no routable number', async () => {
    await render(
      wrap(
        <MatchScreen
          match={{ ...MATCH, phoneE164: '' }}
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
