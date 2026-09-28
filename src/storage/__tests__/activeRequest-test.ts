import * as SecureStore from 'expo-secure-store';
import {
  ACTIVE_REQUEST_KEY,
  clearActiveRequest,
  loadActiveRequest,
  parseRideRequest,
  saveActiveRequest,
} from '../activeRequest';
import { RideRequest } from '../../types';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const request: RideRequest = {
  id: 'r1',
  role: 'need',
  destination: 'MarketFair Mall',
  destinationLat: 40.31,
  destinationLng: -74.66,
  radiusM: 500,
  windowMin: 15,
  note: 'Off the 6:12 train',
  createdAt: T0,
};

beforeEach(async () => {
  await SecureStore.deleteItemAsync(ACTIVE_REQUEST_KEY);
  jest.clearAllMocks();
});

describe('parseRideRequest', () => {
  test('accepts a well-formed request', () => {
    expect(parseRideRequest(request)).toEqual(request);
  });

  test('defaults a missing note to an empty string', () => {
    const { note: _note, ...withoutNote } = request;
    expect(parseRideRequest(withoutNote)?.note).toBe('');
  });

  test.each([
    ['null', null],
    ['string', 'nope'],
    ['missing id', { ...request, id: '' }],
    ['bad role', { ...request, role: 'driver' }],
    ['blank destination', { ...request, destination: '   ' }],
    ['unsupported radius', { ...request, radiusM: 250 }],
    ['zero window', { ...request, windowMin: 0 }],
    ['non-numeric createdAt', { ...request, createdAt: 'yesterday' }],
    ['NaN latitude', { ...request, destinationLat: Number.NaN }],
  ])('rejects %s', (_label, raw) => {
    expect(parseRideRequest(raw)).toBeNull();
  });
});

describe('loadActiveRequest / saveActiveRequest', () => {
  test('round-trips a live request', async () => {
    await saveActiveRequest(request);
    await expect(loadActiveRequest(T0 + 5 * MIN)).resolves.toEqual(request);
  });

  test('drops and clears a request that expired while the app was closed', async () => {
    await saveActiveRequest(request);
    await expect(loadActiveRequest(T0 + 15 * MIN)).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(ACTIVE_REQUEST_KEY)).resolves.toBeNull();
  });

  test('drops and clears malformed JSON', async () => {
    await SecureStore.setItemAsync(ACTIVE_REQUEST_KEY, '{not json');
    await expect(loadActiveRequest(T0)).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(ACTIVE_REQUEST_KEY)).resolves.toBeNull();
  });

  test('drops a structurally invalid payload', async () => {
    await SecureStore.setItemAsync(ACTIVE_REQUEST_KEY, JSON.stringify({ ...request, radiusM: 42 }));
    await expect(loadActiveRequest(T0)).resolves.toBeNull();
  });

  test('resolves null when nothing is stored', async () => {
    await expect(loadActiveRequest(T0)).resolves.toBeNull();
  });

  test('resolves null when the keychain read fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain locked'));
    await expect(loadActiveRequest(T0)).resolves.toBeNull();
  });

  test('clearActiveRequest swallows delete failures', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('nope'));
    await expect(clearActiveRequest()).resolves.toBeUndefined();
  });
});
