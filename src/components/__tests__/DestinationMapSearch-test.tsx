import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DestinationMapSearch } from '../DestinationMapSearch';
import * as search from '../../services/destinationSearch';

jest.mock('../../services/destinationSearch', () => ({
  searchDestinations: jest.fn(async () => [
    {
      id: 'hit-1',
      label: 'Some Other Park',
      lat: 1,
      lng: 2,
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=1,2',
    },
  ]),
  PRINCETON_JUNCTION: { lat: 40.3174, lng: -74.6202 },
}));

describe('<DestinationMapSearch />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not attach the first search hit unless the user picks it', async () => {
    const onChange = jest.fn();
    await render(<DestinationMapSearch value="West Windsor Community Park" onChange={onChange} />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(400);
    });
    expect(search.searchDestinations).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByPlaceholderText('Search on Google Maps'), 'Market');
    expect(onChange).toHaveBeenCalledWith({ label: 'Market' });
    expect(onChange.mock.calls[0][0].lat).toBeUndefined();
  });
});
