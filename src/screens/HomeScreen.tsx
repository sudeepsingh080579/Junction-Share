import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NearbyCard, RideRequest } from '../types';
import { minutesLeft } from '../utils/expiry';

type Props = {
  active?: RideRequest | null;
  /** Shared clock from App prune tick (for remaining-time label). */
  now?: number;
  inbox: NearbyCard[];
  onNeed: () => void;
  onOffer: () => void;
  onOpenInbox: () => void;
  onProfile: () => void;
};

export function HomeScreen({ active, now = Date.now(), inbox, onNeed, onOffer, onOpenInbox, onProfile }: Props) {
  const left = active ? minutesLeft(active.createdAt, active.windowMin, now) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>JunctionShare</Text>
        <Pressable onPress={onProfile} hitSlop={12}>
          <Text style={styles.link}>Profile</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>Princeton Junction → West Windsor last-mile carpool</Text>

      <Pressable style={[styles.btn, styles.primary]} onPress={onNeed}>
        <Text style={styles.btnText}>Need a ride</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.secondary]} onPress={onOffer}>
        <Text style={styles.btnTextDark}>Have seats</Text>
      </Pressable>

      {active ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your active request</Text>
          <Text style={styles.cardBody}>
            {active.role === 'need' ? 'Need ride' : 'Offering seats'} to {active.destination} · {active.radiusM}m ·{' '}
            {left > 0 ? `${left} min left` : 'expiring…'}
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.inbox} onPress={onOpenInbox}>
        <Text style={styles.cardTitle}>Nearby requests</Text>
        <Text style={styles.cardBody}>{inbox.length} nearby · tap to review</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F7F4EF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1C2A1F' },
  link: { color: '#2F6F4E', fontWeight: '600' },
  sub: { marginTop: 6, marginBottom: 24, color: '#5A655C' },
  btn: { borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  primary: { backgroundColor: '#2F6F4E' },
  secondary: { backgroundColor: '#E4EDE7', borderWidth: 1, borderColor: '#2F6F4E' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnTextDark: { color: '#1C2A1F', fontSize: 17, fontWeight: '700' },
  card: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  inbox: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  cardTitle: { fontWeight: '700', color: '#1C2A1F', marginBottom: 4 },
  cardBody: { color: '#5A655C' },
});
