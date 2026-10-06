import { searchDestinations } from '../destinationSearch';

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn<Promise<Response>, [string]>();
const ORIGINAL_ENV = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  else process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = ORIGINAL_ENV;
});

function photonFeature(name: string, lng: number, lat: number, extra: Record<string, unknown> = {}) {
  return { geometry: { coordinates: [lng, lat] }, properties: { osm_id: name.length, name, city: 'West Windsor', state: 'NJ', ...extra } };
}

describe('searchDestinations without a Google key (Photon)', () => {
  test('returns nothing for queries shorter than two characters without a network call', async () => {
    await expect(searchDestinations(' a ')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('maps Photon features to hits', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ features: [photonFeature('MarketFair Mall', -74.66, 40.31, { street: 'US-1' })] }),
    );
    const hits = await searchDestinations('MarketFair');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('photon.komoot.io');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      label: 'MarketFair Mall',
      subtitle: 'US-1, West Windsor, NJ',
      lat: 40.31,
      lng: -74.66,
    });
    expect(hits[0].googleMapsUrl).toContain('40.31');
  });

  test('rejects on a non-2xx HTTP response instead of parsing an error page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }));
    await expect(searchDestinations('Princeton')).rejects.toThrow(/503/);
  });

  test('rejects when the payload is not shaped like a Photon response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }));
    await expect(searchDestinations('Princeton')).rejects.toThrow(/malformed/i);
  });

  test('skips features with missing or out-of-range coordinates', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        features: [
          photonFeature('Good', -74.6, 40.3),
          { geometry: {}, properties: { name: 'No geometry' } },
          photonFeature('Bad lat', -74.6, 123),
          { geometry: { coordinates: ['x', 'y'] }, properties: { name: 'Strings' } },
        ],
      }),
    );
    const hits = await searchDestinations('anything');
    expect(hits.map((h) => h.label)).toEqual(['Good']);
  });
});

describe('searchDestinations with a Google key', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  });

  const predictions = ['a', 'b', 'c'].map((id) => ({
    description: `Place ${id}`,
    place_id: `pid-${id}`,
    structured_formatting: { main_text: `Place ${id}`, secondary_text: 'NJ' },
  }));

  function detail(id: string, lat = 40.3, lng = -74.6) {
    return { status: 'OK', result: { name: `Place ${id}`, formatted_address: `${id} Main St`, geometry: { location: { lat, lng } } } };
  }

  test('fetches place details concurrently and preserves autocomplete order', async () => {
    const gates = predictions.map(() => deferred<Response>());
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/autocomplete/')) return Promise.resolve(jsonResponse({ status: 'OK', predictions }));
      const idx = predictions.findIndex((p) => url.includes(p.place_id));
      return gates[idx].promise;
    });

    const pending = searchDestinations('Place');
    // Let the autocomplete response settle and the detail fetches start.
    await new Promise((r) => setTimeout(r, 0));
    const detailCalls = fetchMock.mock.calls.filter(([u]) => u.includes('/details/'));
    expect(detailCalls).toHaveLength(3);

    // Resolve in reverse order to prove ranking does not depend on arrival order.
    gates[2].resolve(jsonResponse(detail('c')));
    gates[1].resolve(jsonResponse(detail('b')));
    gates[0].resolve(jsonResponse(detail('a')));

    const hits = await pending;
    expect(hits.map((h) => h.id)).toEqual(['pid-a', 'pid-b', 'pid-c']);
    expect(hits[0]).toMatchObject({ label: 'Place a', subtitle: 'a Main St', lat: 40.3, lng: -74.6 });
  });

  test('drops a single failed details lookup without losing the others', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/autocomplete/')) return Promise.resolve(jsonResponse({ status: 'OK', predictions }));
      if (url.includes('pid-b')) return Promise.resolve(jsonResponse({}, { ok: false, status: 500 }));
      if (url.includes('pid-c')) return Promise.reject(new Error('network down'));
      return Promise.resolve(jsonResponse(detail('a')));
    });
    const hits = await searchDestinations('Place');
    expect(hits.map((h) => h.id)).toEqual(['pid-a']);
  });

  test('ignores details responses with a non-OK status or bad coordinates', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/autocomplete/')) return Promise.resolve(jsonResponse({ status: 'OK', predictions }));
      if (url.includes('pid-a')) return Promise.resolve(jsonResponse({ status: 'NOT_FOUND' }));
      if (url.includes('pid-b')) return Promise.resolve(jsonResponse(detail('b', Number.NaN, -74.6)));
      return Promise.resolve(jsonResponse(detail('c')));
    });
    const hits = await searchDestinations('Place');
    expect(hits.map((h) => h.id)).toEqual(['pid-c']);
  });

  test('falls back to Photon when the Google request fails with an HTTP error', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 403 }))
      .mockResolvedValueOnce(jsonResponse({ features: [photonFeature('Fallback', -74.6, 40.3)] }));
    const hits = await searchDestinations('Fallback');
    expect(hits.map((h) => h.label)).toEqual(['Fallback']);
    expect(fetchMock.mock.calls[1][0]).toContain('photon.komoot.io');
  });

  test('falls back to Photon when Google returns an API-level error status', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'REQUEST_DENIED' }))
      .mockResolvedValueOnce(jsonResponse({ features: [] }));
    await expect(searchDestinations('anything')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('ZERO_RESULTS yields an empty list without extra calls', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ZERO_RESULTS' }));
    await expect(searchDestinations('zzzz')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
