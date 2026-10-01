import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DestinationMapSearch } from '../components/DestinationMapSearch';
import { RadiusM, Role } from '../types';

type Props = {
  role: Role;
  onBack: () => void;
  onBroadcast: (payload: {
    destination: string;
    destinationLat?: number;
    destinationLng?: number;
    radiusM: RadiusM;
    windowMin: number;
    note: string;
  }) => void | Promise<void>;
};

const RADII: RadiusM[] = [100, 500, 1000];
const WINDOWS = [10, 15, 30];

export function CreateRequestScreen({ role, onBack, onBroadcast }: Props) {
  const [destination, setDestination] = useState('West Windsor Community Park');
  const [destinationLat, setDestinationLat] = useState<number | undefined>();
  const [destinationLng, setDestinationLng] = useState<number | undefined>();
  const [radiusM, setRadiusM] = useState<RadiusM>(100);
  const [windowMin, setWindowMin] = useState(15);
  const [note, setNote] = useState('Just got off the NYC train at Princeton Junction');
  const [broadcasting, setBroadcasting] = useState(false);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>{role === 'need' ? 'Need a ride' : 'Have seats'}</Text>
      <Text style={styles.label}>Destination</Text>
      <DestinationMapSearch
        value={destination}
        onChange={({ label, lat, lng }) => {
          setDestination(label);
          setDestinationLat(lat);
          setDestinationLng(lng);
        }}
      />
      <Text style={styles.label}>Radius</Text>
      <View style={styles.row}>
        {RADII.map((r) => (
          <Pressable key={r} style={[styles.chip, radiusM === r && styles.chipOn]} onPress={() => setRadiusM(r)}>
            <Text style={[styles.chipText, radiusM === r && styles.chipTextOn]}>{r < 1000 ? `${r}m` : '1km'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Window</Text>
      <View style={styles.row}>
        {WINDOWS.map((w) => (
          <Pressable key={w} style={[styles.chip, windowMin === w && styles.chipOn]} onPress={() => setWindowMin(w)}>
            <Text style={[styles.chipText, windowMin === w && styles.chipTextOn]}>{w} min</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Note</Text>
      <TextInput style={[styles.input, styles.note]} value={note} onChangeText={setNote} multiline />
      <Pressable
        style={[styles.broadcast, (!destination.trim() || broadcasting) && styles.broadcastDisabled]}
        disabled={!destination.trim() || broadcasting}
        onPress={async () => {
          setBroadcasting(true);
          try {
            await onBroadcast({
              destination: destination.trim(),
              destinationLat,
              destinationLng,
              radiusM,
              windowMin,
              note: note.trim(),
            });
          } finally {
            setBroadcasting(false);
          }
        }}
      >
        <Text style={styles.broadcastText}>{broadcasting ? 'Publishing…' : 'Broadcast'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F4EF' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#1C2A1F' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#D7DED9' },
  note: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E4EDE7' },
  chipOn: { backgroundColor: '#2F6F4E' },
  chipText: { color: '#1C2A1F', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  broadcast: { marginTop: 28, backgroundColor: '#2F6F4E', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  broadcastDisabled: { opacity: 0.5 },
  broadcastText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
