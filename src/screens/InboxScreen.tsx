import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NearbyCard } from '../types';

type Props = {
  items: NearbyCard[];
  status: string | null;
  onRefresh: () => void;
  onBack: () => void;
  onInterested: (card: NearbyCard) => void;
  onDecline: (id: string) => void;
};

export function InboxScreen({ items, status, onRefresh, onBack, onInterested, onDecline }: Props) {
  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Nearby inbox</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Pressable style={styles.refresh} onPress={onRefresh}><Text style={styles.refreshText}>Refresh</Text></Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {items.length === 0 ? <Text style={styles.empty}>No nearby requests right now.</Text> : null}
        {items.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.name}>
              {c.firstName} · ~{c.distanceM}m
            </Text>
            <Text style={styles.body}>
              {c.role === 'need' ? 'Needs ride' : 'Has seats'} to {c.destination} · {c.seats} seat(s)
            </Text>
            <View style={styles.row}>
              <Pressable style={styles.yes} onPress={() => onInterested(c)}>
                <Text style={styles.yesText}>Interested</Text>
              </Pressable>
              <Pressable style={styles.no} onPress={() => onDecline(c.id)}>
                <Text style={styles.noText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F7F4EF' },
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  empty: { color: '#5A655C' },
  status: { color: '#8A4B12', marginBottom: 10, lineHeight: 20 },
  refresh: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E4EDE7', marginBottom: 12 },
  refreshText: { color: '#2F6F4E', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  name: { fontWeight: '700', color: '#1C2A1F' },
  body: { color: '#5A655C', marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  yes: { flex: 1, backgroundColor: '#2F6F4E', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  yesText: { color: '#fff', fontWeight: '700' },
  no: { flex: 1, backgroundColor: '#EEE', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  noText: { color: '#444', fontWeight: '600' },
});
