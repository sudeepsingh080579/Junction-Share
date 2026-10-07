import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { NearbyCard, RideRequest } from '../types';
import { minutesLeft } from '../utils/expiry';

type Props = {
  active?: RideRequest | null;
  /** Shared clock from App prune tick (for remaining-time label). Passed in so render stays pure. */
  now: number;
  inbox: NearbyCard[];
  onNeed: () => void;
  onOffer: () => void;
  onOpenInbox: () => void;
  onProfile: () => void;
  onEndRequest: () => void;
};

export function HomeScreen({
  active,
  now,
  inbox,
  onNeed,
  onOffer,
  onOpenInbox,
  onProfile,
  onEndRequest,
}: Props) {
  const left = active ? minutesLeft(active.createdAt, active.windowMin, now) : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>JunctionShare</Text>
        <Pressable onPress={onProfile} hitSlop={12} accessibilityRole="button" accessibilityLabel="Profile">
          <Text style={styles.link}>Profile</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>Princeton Junction → West Windsor last-mile carpool</Text>
      <Text style={styles.banner}>
        This release includes demo nearby riders so you can try matching while live geo matching rolls out.
      </Text>

      <Pressable
        style={[styles.btn, styles.primary]}
        onPress={onNeed}
        accessibilityRole="button"
        accessibilityLabel="Need a ride"
      >
        <Text style={styles.btnText}>Need a ride</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, styles.secondary]}
        onPress={onOffer}
        accessibilityRole="button"
        accessibilityLabel="Have seats"
      >
        <Text style={styles.btnTextDark}>Have seats</Text>
      </Pressable>

      {active ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your active request</Text>
          <Text style={styles.cardBody}>
            {active.role === 'need' ? 'Need ride' : 'Offering seats'} to {active.destination} · {active.radiusM}m ·{' '}
            {left > 0 ? `${left} min left` : 'expiring…'}
          </Text>
          <Pressable
            style={styles.end}
            onPress={onEndRequest}
            accessibilityRole="button"
            accessibilityLabel="End active request"
          >
            <Text style={styles.endText}>End request</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={styles.inbox}
        onPress={onOpenInbox}
        accessibilityRole="button"
        accessibilityLabel="Nearby requests"
      >
        <Text style={styles.cardTitle}>Nearby requests</Text>
        <Text style={styles.cardBody}>{inbox.length} nearby · tap to review</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C2A1F' },
  link: { color: '#2F6F4E', fontWeight: '600' },
  sub: { marginTop: 6, marginBottom: 10, color: '#5A655C' },
  banner: {
    marginBottom: 20,
    color: '#5A655C',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: '#E4EDE7',
    padding: 10,
    borderRadius: 10,
  },
  btn: { borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  primary: { backgroundColor: '#2F6F4E' },
  secondary: { backgroundColor: '#E4EDE7', borderWidth: 1, borderColor: '#2F6F4E' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnTextDark: { color: '#1C2A1F', fontSize: 17, fontWeight: '700' },
  card: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  inbox: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  cardTitle: { fontWeight: '700', color: '#1C2A1F', marginBottom: 4 },
  cardBody: { color: '#5A655C' },
  end: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#EEE' },
  endText: { color: '#444', fontWeight: '600' },
});
