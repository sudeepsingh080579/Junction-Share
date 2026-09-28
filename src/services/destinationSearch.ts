import Constants from 'expo-constants';

export type DestinationHit = {
  id: string;
  label: string;
  subtitle?: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
};

const PJ = { lat: 40.3174, lng: -74.6202 };
const MAX_HITS = 6;

function googleKey(): string | undefined {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;
  const fromExtra = typeof extra.googleMapsApiKey === 'string' ? extra.googleMapsApiKey : undefined;
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const key = (fromEnv || fromExtra || '').trim();
  return key || undefined;
}

function mapsUrl(label: string, lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}&query_place=${encodeURIComponent(label)}`;
}

async function searchGooglePlaces(query: string): Promise<DestinationHit[]> {
  const key = googleKey();
  if (!key) return [];
  const url =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json?' +
    new URLSearchParams({
      input: query,
      key,
      location: `${PJ.lat},${PJ.lng}`,
      radius: '40000',
      components: 'country:us',
    }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const json = (await res.json()) as { status: string; predictions?: GooglePrediction[] };
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places: ${json.status}`);
  }
  const preds = (json.predictions || []).slice(0, MAX_HITS);
  // Details lookups are independent; fetch them concurrently and keep the
  // autocomplete ranking. A single failed lookup drops that hit only.
  const details = await Promise.all(
    preds.map(async (p): Promise<DestinationHit | null> => {
      try {
        return await fetchGooglePlaceDetail(p, key);
      } catch {
        return null;
      }
    }),
  );
  return details.filter((h): h is DestinationHit => h !== null);
}

type GooglePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

async function fetchGooglePlaceDetail(p: GooglePrediction, key: string): Promise<DestinationHit | null> {
  const detailUrl =
    'https://maps.googleapis.com/maps/api/place/details/json?' +
    new URLSearchParams({
      place_id: p.place_id,
      fields: 'geometry,name,formatted_address',
      key,
    }).toString();
  const dRes = await fetch(detailUrl);
  if (!dRes.ok) return null;
  const dJson = (await dRes.json()) as {
    status?: string;
    result?: { geometry?: { location?: { lat: number; lng: number } }; name?: string; formatted_address?: string };
  };
  if (dJson.status && dJson.status !== 'OK') return null;
  const loc = toCoord(dJson.result?.geometry?.location?.lat, dJson.result?.geometry?.location?.lng);
  if (!loc) return null;
  const label = dJson.result?.name || p.structured_formatting?.main_text || p.description;
  return {
    id: p.place_id,
    label,
    subtitle: dJson.result?.formatted_address || p.structured_formatting?.secondary_text,
    lat: loc.lat,
    lng: loc.lng,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}&query_place_id=${p.place_id}`,
  };
}

/** Accept only real, finite coordinates from third-party payloads. */
function toCoord(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  if (typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function searchPhoton(query: string): Promise<DestinationHit[]> {
  const url =
    'https://photon.komoot.io/api/?' +
    new URLSearchParams({
      q: query,
      lat: String(PJ.lat),
      lon: String(PJ.lng),
      limit: String(MAX_HITS),
      lang: 'en',
    }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const json = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: {
        osm_id?: number;
        name?: string;
        street?: string;
        housenumber?: string;
        city?: string;
        state?: string;
        country?: string;
        type?: string;
      };
    }[];
  };
  if (!Array.isArray(json.features)) throw new Error('Photon: malformed response');
  const hits: DestinationHit[] = [];
  json.features.forEach((f, i) => {
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const coord = toCoord(lat, lng);
    if (!coord) return;
    const p = f.properties ?? {};
    const label =
      p.name ||
      [p.housenumber, p.street].filter(Boolean).join(' ') ||
      query;
    const subtitle = [p.street && p.name ? p.street : null, p.city, p.state]
      .filter(Boolean)
      .join(', ');
    hits.push({
      id: String(p.osm_id ?? i),
      label,
      subtitle: subtitle || undefined,
      lat: coord.lat,
      lng: coord.lng,
      googleMapsUrl: mapsUrl(label, coord.lat, coord.lng),
    });
  });
  return hits;
}

/** Search destinations near Princeton Junction / West Windsor. Prefers Google Places when API key is set. */
export async function searchDestinations(query: string): Promise<DestinationHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (googleKey()) {
    try {
      return await searchGooglePlaces(q);
    } catch {
      return searchPhoton(q);
    }
  }
  return searchPhoton(q);
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(googleKey());
}

export { PJ as PRINCETON_JUNCTION };
