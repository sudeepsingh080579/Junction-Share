import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { NearbyCard } from '../types';
import { minutesLeft } from '../utils/expiry';

type Props = {
  items: NearbyCard[];
  now: number;
  note?: string | null;
  hasActiveRequest?: boolean;
  onBack: () => void;
  onInterested: (card: NearbyCard) => void;
  onDecline: (id: string) => void;
};

export function InboxScreen({ items, now, note, hasActiveRequest = false, onBack, onInterested, onDecline }: Props) {
  return (
    <Screen>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Nearby inbox</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        {items.length === 0 ? (
          <Text style={styles.empty}>
            {hasActiveRequest
              ? 'No one nearby has an active request right now. This inbox refreshes while it is open.'
              : 'Broadcast a request to see people near you. You will only see requests from the opposite role inside your radius.'}
          </Text>
        ) : null}
        {items.map((c) => {
          const left = minutesLeft(c.createdAt, c.windowMin, now);
          return (
            <View key={c.id} style={styles.card}>
              <Text style={styles.name}>
                {c.firstName} · ~{c.distanceM}m
              </Text>
              <Text style={styles.body}>
                {c.role === 'need' ? 'Needs ride' : 'Has seats'} to {c.destination} · {c.seats} seat(s)
              </Text>
              <Text style={styles.meta}>{left > 0 ? `${left} min left` : 'expiring…'}</Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.yes}
                  onPress={() => onInterested(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Interested in ${c.firstName}`}
                >
                  <Text style={styles.yesText}>Interested</Text>
                </Pressable>
                <Pressable
                  style={styles.no}
                  onPress={() => onDecline(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${c.firstName}`}
                >
                  <Text style={styles.noText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  list: { paddingBottom: 40 },
  empty: { color: '#5A655C', lineHeight: 22 },
  note: { color: '#A33', lineHeight: 22, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  name: { fontWeight: '700', color: '#1C2A1F' },
  body: { color: '#5A655C', marginTop: 4 },
  meta: { color: '#5A655C', fontSize: 12, marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  yes: { flex: 1, backgroundColor: '#2F6F4E', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  yesText: { color: '#fff', fontWeight: '700' },
  no: { flex: 1, backgroundColor: '#EEE', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  noText: { color: '#444', fontWeight: '600' },
});
