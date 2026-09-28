import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  DestinationHit,
  PRINCETON_JUNCTION,
  searchDestinations,
} from '../services/destinationSearch';
import Constants from 'expo-constants';

type Props = {
  value: string;
  onChange: (next: { label: string; lat?: number; lng?: number; googleMapsUrl?: string }) => void;
};

function googleMapsBrowseUrl(lat: number, lng: number, label?: string): string {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;
  const key =
    (typeof process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY === 'string' &&
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.trim()) ||
    (typeof extra.googleMapsApiKey === 'string' ? extra.googleMapsApiKey.trim() : '');

  // Prefer official Embed API when a key is present (Google Maps, not Apple).
  if (key) {
    const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${q}&zoom=14`;
  }

  // Key-free Google Maps mobile page (still Google Maps UI / tiles).
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} @${lat},${lng}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function DestinationMapSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<DestinationHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DestinationHit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapUri = useMemo(() => {
    const lat = selected?.lat ?? PRINCETON_JUNCTION.lat;
    const lng = selected?.lng ?? PRINCETON_JUNCTION.lng;
    return googleMapsBrowseUrl(lat, lng, selected?.label || query || 'Princeton Junction');
  }, [selected, query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value.trim() || selected) return;
      try {
        const results = await searchDestinations(value);
        if (cancelled || !results.length) return;
        const h = results[0];
        setSelected(h);
        onChange({
          label: value,
          lat: h.lat,
          lng: h.lng,
          googleMapsUrl: h.googleMapsUrl,
        });
      } catch {
        // Keep Princeton Junction Google Maps view until the user searches.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    if (selected && q === selected.label) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const results = await searchDestinations(q);
        if (!cancelled) setHits(results);
      } catch {
        if (!cancelled) setError('Google Maps search failed — try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, selected]);

  const openGoogleMaps = async () => {
    const url =
      selected?.googleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Princeton Junction')}`;
    await Linking.openURL(url);
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.flex]}
          value={query}
          placeholder="Search on Google Maps"
          onChangeText={(t) => {
            setSelected(null);
            setQuery(t);
            onChange({ label: t });
          }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading ? <ActivityIndicator color="#2F6F4E" style={styles.spinner} /> : null}
      </View>
      {hits.length > 0 ? (
        <View style={styles.dropdown}>
          {hits.map((h) => (
            <Pressable
              key={h.id}
              style={styles.hit}
              onPress={() => {
                setSelected(h);
                setQuery(h.label);
                setHits([]);
                onChange({
                  label: h.label,
                  lat: h.lat,
                  lng: h.lng,
                  googleMapsUrl: h.googleMapsUrl,
                });
              }}
            >
              <Text style={styles.hitTitle}>{h.label}</Text>
              {h.subtitle ? <Text style={styles.hitSub}>{h.subtitle}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.mapWrap}>
        <WebView
          key={mapUri}
          source={{ uri: mapUri }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          setSupportMultipleWindows={false}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator color="#2F6F4E" />
              <Text style={styles.mapLoadingText}>Loading Google Maps…</Text>
            </View>
          )}
        />
      </View>
      <Pressable style={styles.gmaps} onPress={openGoogleMaps}>
        <Text style={styles.gmapsText}>Open in Google Maps app</Text>
      </Pressable>
      <Text style={styles.hint}>
        Google Maps preview. Search picks a place, then you can open it in the Google Maps app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D7DED9',
  },
  spinner: { marginLeft: 8 },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DED9',
    marginTop: 6,
    overflow: 'hidden',
    zIndex: 2,
  },
  hit: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5EAE6',
  },
  hitTitle: { color: '#1C2A1F', fontWeight: '600' },
  hitSub: { color: '#5A655C', marginTop: 2, fontSize: 13 },
  error: { color: '#A33', marginTop: 6 },
  mapWrap: {
    height: 220,
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7DED9',
    backgroundColor: '#E8EEE9',
  },
  map: { flex: 1, backgroundColor: '#E8EEE9' },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEE9',
  },
  mapLoadingText: { marginTop: 8, color: '#5A655C', fontSize: 13 },
  gmaps: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#E4EFE8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gmapsText: { color: '#2F6F4E', fontWeight: '600' },
  hint: { marginTop: 8, color: '#5A655C', fontSize: 12, lineHeight: 16 },
});
