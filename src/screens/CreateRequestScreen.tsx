import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DestinationMapSearch } from '../components/DestinationMapSearch';
import { Screen } from '../components/Screen';
import { DESTINATION_MAX_LENGTH, NOTE_MAX_LENGTH } from '../constants/limits';
import { RadiusM, Role } from '../types';

export type RequestDraft = {
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  radiusM: RadiusM;
  windowMin: number;
  note: string;
};

export const DEFAULT_DRAFT: RequestDraft = {
  destination: 'West Windsor Community Park',
  radiusM: 500,
  windowMin: 15,
  note: 'Just got off the NYC train at Princeton Junction',
};

type Props = {
  role: Role;
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  onBack: () => void;
  onProfile: () => void;
  onBroadcast: (payload: {
    destination: string;
    destinationLat?: number;
    destinationLng?: number;
    radiusM: RadiusM;
    windowMin: number;
    note: string;
  }) => void;
};

const RADII: RadiusM[] = [100, 500, 1000];
const WINDOWS = [10, 15, 30];

export function CreateRequestScreen({ role, draft, onDraftChange, onBack, onProfile, onBroadcast }: Props) {
  const { destination, destinationLat, destinationLng, radiusM, windowMin, note } = draft;

  const dest = destination.trim();
  const canBroadcast = dest.length > 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Pressable onPress={onProfile} hitSlop={12} accessibilityRole="button" accessibilityLabel="Profile">
            <Text style={styles.link}>Profile</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{role === 'need' ? 'Need a ride' : 'Have seats'}</Text>
        <Text style={styles.label}>Destination</Text>
        <DestinationMapSearch
          value={destination}
          maxLength={DESTINATION_MAX_LENGTH}
          onChange={({ label, lat, lng }) => {
            onDraftChange({
              ...draft,
              destination: label.slice(0, DESTINATION_MAX_LENGTH),
              destinationLat: lat,
              destinationLng: lng,
            });
          }}
        />
        <Text style={styles.label}>Radius</Text>
        <View style={styles.row}>
          {RADII.map((r) => (
            <Pressable
              key={r}
              style={[styles.chip, radiusM === r && styles.chipOn]}
              onPress={() => onDraftChange({ ...draft, radiusM: r })}
              accessibilityRole="button"
              accessibilityLabel={`Radius ${r < 1000 ? `${r} meters` : '1 kilometer'}`}
              accessibilityState={{ selected: radiusM === r }}
            >
              <Text style={[styles.chipText, radiusM === r && styles.chipTextOn]}>{r < 1000 ? `${r}m` : '1km'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Window</Text>
        <View style={styles.row}>
          {WINDOWS.map((w) => (
            <Pressable
              key={w}
              style={[styles.chip, windowMin === w && styles.chipOn]}
              onPress={() => onDraftChange({ ...draft, windowMin: w })}
              accessibilityRole="button"
              accessibilityLabel={`${w} minute window`}
              accessibilityState={{ selected: windowMin === w }}
            >
              <Text style={[styles.chipText, windowMin === w && styles.chipTextOn]}>{w} min</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.note]}
          value={note}
          onChangeText={(t) => onDraftChange({ ...draft, note: t.slice(0, NOTE_MAX_LENGTH) })}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          accessibilityLabel="Trip note"
        />
        <Text style={styles.counter}>
          {note.length}/{NOTE_MAX_LENGTH}
        </Text>
        <Pressable
          style={[styles.broadcast, !canBroadcast && styles.broadcastDisabled]}
          disabled={!canBroadcast}
          onPress={() =>
            onBroadcast({
              destination: dest,
              destinationLat,
              destinationLng,
              radiusM,
              windowMin,
              note: note.trim().slice(0, NOTE_MAX_LENGTH),
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Broadcast"
        >
          <Text style={styles.broadcastText}>Broadcast</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 4, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  link: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#1C2A1F' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#D7DED9' },
  note: { minHeight: 80, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', color: '#5A655C', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E4EDE7' },
  chipOn: { backgroundColor: '#2F6F4E' },
  chipText: { color: '#1C2A1F', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  broadcast: { marginTop: 28, backgroundColor: '#2F6F4E', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  broadcastDisabled: { opacity: 0.5 },
  broadcastText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
