import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Screen } from '../components/Screen';
import { syncSavedProfile } from '../services/matching';
import { loadProfile, saveProfileIdentity } from '../storage/profile';
import { phoneValidationMessage, validatePhone } from '../utils/phone';
import { PrivacyPolicyScreen } from './PrivacyPolicyScreen';

type Props = {
  onBack: () => void;
};

const NAME_MAX = 40;

export function ProfileScreen({ onBack }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadProfile();
        if (cancelled) return;
        setName(saved.name);
        if (saved.phone) setPhone(saved.phone);
      } catch {
        if (!cancelled) setSaveError('Could not read your saved profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showPrivacy) {
        setShowPrivacy(false);
        return true;
      }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, showPrivacy]);

  const onSave = async () => {
    const trimmed = name.trim();
    let nextNameError: string | null = null;
    if (!trimmed) nextNameError = 'Enter your first name.';
    else if (trimmed.length > NAME_MAX) nextNameError = 'Use 40 characters or fewer.';

    const phoneResult = validatePhone(phone);
    const nextPhoneError = phoneResult.ok
      ? null
      : phoneResult.reason === 'empty'
        ? 'Enter your WhatsApp number.'
        : phoneValidationMessage(phoneResult);

    setNameError(nextNameError);
    setPhoneError(nextPhoneError);
    setStatus(null);
    setSaveError(null);
    if (nextNameError || nextPhoneError || !phoneResult.ok) return;

    setSaving(true);
    try {
      await saveProfileIdentity(trimmed, phoneResult.e164);
      setName(trimmed);
      setPhone(phoneResult.e164);
    } catch {
      setSaveError('Could not securely save your profile.');
      setSaving(false);
      return;
    }

    let shareLocation = false;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      shareLocation = perm.status === 'granted';
    } catch {
      shareLocation = false;
    }
    try {
      await syncSavedProfile({ firstName: trimmed, phoneE164: phoneResult.e164, shareLocation });
      setStatus('Saved. Your name and WhatsApp number are shared only after you and another person both tap Interested.');
    } catch {
      setSaveError('Saved on this phone. Live matching could not be updated. Check your connection and save again.');
    } finally {
      setSaving(false);
    }
  };

  if (showPrivacy) {
    return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Profile / safety</Text>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setNameError(null);
            setStatus(null);
          }}
          autoComplete="given-name"
          textContentType="givenName"
          accessibilityLabel="First name"
          maxLength={NAME_MAX}
        />
        {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
        <Text style={styles.label}>Phone (WhatsApp)</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setPhoneError(null);
              setStatus(null);
            }}
            accessibilityLabel="WhatsApp phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            importantForAutofill="yes"
            placeholder="+1…"
          />
          {loading ? <ActivityIndicator color="#2F6F4E" style={styles.spinner} /> : null}
        </View>
        {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
        <Pressable
          style={[styles.save, saving && styles.saveDisabled]}
          disabled={saving}
          onPress={() => void onSave()}
          accessibilityRole="button"
          accessibilityLabel="Save profile"
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Pressable
          style={styles.secondary}
          onPress={() => setShowPrivacy(true)}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={styles.secondaryText}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.hint}>
          Save stores your first name and WhatsApp number on this phone and with live matching. Your number is shown
          only after you and the other person both tap Interested. Location is requested when you broadcast, including
          an option to allow it all the time while a request is active.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, paddingBottom: 40 },
  back: { color: '#2F6F4E', fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1C2A1F' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#1C2A1F' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#D7DED9' },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  phoneInput: { flex: 1 },
  spinner: { marginLeft: 10 },
  save: {
    marginTop: 16,
    backgroundColor: '#2F6F4E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E4EFE8',
  },
  secondaryText: { color: '#2F6F4E', fontWeight: '600' },
  status: { marginTop: 8, color: '#2F6F4E' },
  error: { marginTop: 8, color: '#A33' },
  hint: { marginTop: 24, color: '#5A655C', lineHeight: 20 },
});
