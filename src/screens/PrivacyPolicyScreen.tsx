import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { PRIVACY_EFFECTIVE, PRIVACY_SECTIONS } from '../content/privacyPolicy';

type Props = { onBack: () => void };

export function PrivacyPolicyScreen({ onBack }: Props) {
  return (
    <Screen>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.meta}>Effective {PRIVACY_EFFECTIVE} · FutureStack Services</Text>
        {PRIVACY_SECTIONS.map((section) => (
          <React.Fragment key={section.heading}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  content: { paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1C2A1F', marginBottom: 6 },
  meta: { color: '#5A655C', marginBottom: 16 },
  heading: { fontWeight: '700', color: '#1C2A1F', marginTop: 16, marginBottom: 6 },
  body: { color: '#5A655C', lineHeight: 22 },
});
