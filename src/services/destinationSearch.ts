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
  const json = (await res.json()) as {
    status: string;
    predictions?: { description: string; place_id: string; structured_formatting?: { main_text?: string; secondary_text?: string } }[];
  };
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places: ${json.status}`);
  }
  const preds = json.predictions || [];
  const hits: DestinationHit[] = [];
  for (const p of preds.slice(0, 6)) {
    const detailUrl =
      'https://maps.googleapis.com/maps/api/place/details/json?' +
      new URLSearchParams({
        place_id: p.place_id,
        fields: 'geometry,name,formatted_address',
        key,
      }).toString();
    const dRes = await fetch(detailUrl);
    const dJson = (await dRes.json()) as {
      result?: { geometry?: { location?: { lat: number; lng: number } }; name?: string; formatted_address?: string };
    };
    const loc = dJson.result?.geometry?.location;
    if (!loc) continue;
    const label = dJson.result?.name || p.structured_formatting?.main_text || p.description;
    hits.push({
      id: p.place_id,
      label,
      subtitle: dJson.result?.formatted_address || p.structured_formatting?.secondary_text,
      lat: loc.lat,
      lng: loc.lng,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}&query_place_id=${p.place_id}`,
    });
  }
  return hits;
}

async function searchPhoton(query: string): Promise<DestinationHit[]> {
  const url =
    'https://photon.komoot.io/api/?' +
    new URLSearchParams({
      q: query,
      lat: String(PJ.lat),
      lon: String(PJ.lng),
      limit: '6',
      lang: 'en',
    }).toString();
  const res = await fetch(url);
  const json = (await res.json()) as {
    features?: {
      geometry: { coordinates: [number, number] };
      properties: {
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
  return (json.features || []).map((f, i) => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;
    const label =
      p.name ||
      [p.housenumber, p.street].filter(Boolean).join(' ') ||
      query;
    const subtitle = [p.street && p.name ? p.street : null, p.city, p.state]
      .filter(Boolean)
      .join(', ');
    return {
      id: String(p.osm_id ?? i),
      label,
      subtitle: subtitle || undefined,
      lat,
      lng,
      googleMapsUrl: mapsUrl(label, lat, lng),
    };
  });
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
