import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { NearbyCard, RideRequest } from '../types';

type Props = {
  match: NearbyCard;
  request?: RideRequest | null;
  onBack: () => void;
};

export function MatchScreen({ match, request, onBack }: Props) {
  const wa = `https://wa.me/${match.phoneE164}?text=${encodeURIComponent(
    `Hi ${match.firstName}, saw your JunctionShare ping about ${match.destination}. Still good for a carpool?`,
  )}`;

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Match</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{match.firstName}</Text>
        <Text style={styles.body}>~{match.distanceM}m away</Text>
        <Text style={styles.body}>Going to {match.destination}</Text>
        {request ? <Text style={styles.body}>Your trip: {request.destination}</Text> : null}
      </View>
      {match.phoneE164 ? <Pressable style={styles.wa} onPress={async () => {
          try {
            await Linking.openURL(wa);
          } catch {
            Alert.alert('Unable to open WhatsApp', 'Check that WhatsApp or a browser is available, then try again.');
          }
        }}>
        <Text style={styles.waText}>Chat on WhatsApp</Text>
      </Pressable> : <Text style={styles.hint}>You matched, but WhatsApp contact is disabled because one or both people have not opted in.</Text>}
      {match.phoneE164 ? <Text style={styles.hint}>WhatsApp contact is shared only after both people express interest and opt in.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F7F4EF' },
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '700', color: '#1C2A1F' },
  body: { color: '#5A655C', marginTop: 6 },
  wa: { backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  waText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  hint: { marginTop: 12, color: '#5A655C', textAlign: 'center' },
});
