import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { Screen } from '../components/Screen';
import {
  DEFAULT_PROFILE,
  deleteProfilePhone,
  loadProfile,
  saveProfileName,
  saveProfilePhone,
  saveWhatsappOptIn,
} from '../storage/profile';
import { phoneValidationMessage, validatePhone } from '../utils/phone';
import { PrivacyPolicyScreen } from './PrivacyPolicyScreen';

type Props = {
  onBack: () => void;
};

function pickBestPhone(numbers: Contacts.PhoneNumber[] | undefined): string | null {
  if (!numbers?.length) return null;
  const ranked = [...numbers].sort((a, b) => {
    const aMobile = /mobile|iphone|whatsapp|cell/i.test(a.label || '') ? 0 : 1;
    const bMobile = /mobile|iphone|whatsapp|cell/i.test(b.label || '') ? 0 : 1;
    return aMobile - bMobile;
  });
  for (const n of ranked) {
    const v = validatePhone(n.number || '');
    if (v.ok) return v.e164;
  }
  return null;
}

function fieldWasCleared(value: string): boolean {
  return value.trim() === '';
}

export function ProfileScreen({ onBack }: Props) {
  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [phone, setPhone] = useState('+1');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const commitPhone = useCallback(async (value: string) => {
    if (fieldWasCleared(value)) {
      setPhoneError(null);
      try {
        await deleteProfilePhone();
        await saveWhatsappOptIn(false);
      } catch {
        setStatus('Could not update the saved number.');
      }
      return;
    }
    const v = validatePhone(value);
    setPhoneError(phoneValidationMessage(v));
    if (!v.ok) return;
    try {
      await saveProfilePhone(v.e164);
      setPhone(v.e164);
    } catch {
      setStatus('Could not securely save this number.');
    }
  }, []);

  const fillFromContactPicker = useCallback(async () => {
    const { status: perm } = await Contacts.requestPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('Contacts permission needed to fill your WhatsApp number.');
      return false;
    }

    let picked: Awaited<ReturnType<typeof Contacts.presentContactPickerAsync>> = null;
    try {
      picked = await Contacts.presentContactPickerAsync();
    } catch {
      setStatus('Could not open the contact picker on this device.');
      return false;
    }

    if (!picked) {
      setStatus('No contact selected.');
      return false;
    }

    const fromPick = pickBestPhone(picked.phoneNumbers);
    if (!fromPick) {
      setStatus('That contact has no valid phone number.');
      return false;
    }

    setPhone(fromPick);
    setPhoneError(null);
    try {
      await saveProfilePhone(fromPick);
      setStatus('WhatsApp number filled from the contact you picked.');
      return true;
    } catch {
      setStatus('Could not securely save this number.');
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadProfile();
        if (cancelled) return;
        setName(saved.name);
        if (saved.phone) {
          setPhone(saved.phone);
          setStatus('Using saved WhatsApp number.');
        }
      } catch {
        if (!cancelled) setStatus('Could not read your saved profile.');
      } finally {
        if (!cancelled) setLoadingPhone(false);
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

  const onBlurName = async () => {
    try {
      await saveProfileName(name);
    } catch {
      setStatus('Could not save your profile securely.');
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
          onChangeText={setName}
          onBlur={() => void onBlurName()}
          autoComplete="given-name"
          textContentType="givenName"
          accessibilityLabel="First name"
        />
        <Text style={styles.label}>Phone (WhatsApp)</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setPhoneError(null);
            }}
            onBlur={() => void commitPhone(phone)}
            accessibilityLabel="WhatsApp phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            importantForAutofill="yes"
            placeholder="+1…"
          />
          {loadingPhone ? <ActivityIndicator color="#2F6F4E" style={styles.spinner} /> : null}
        </View>
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            setLoadingPhone(true);
            setStatus(null);
            try {
              await fillFromContactPicker();
            } catch {
              setStatus('Could not read contacts on this device.');
            } finally {
              setLoadingPhone(false);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Use number from this phone"
        >
          <Text style={styles.secondaryText}>Use number from this phone</Text>
        </Pressable>
        {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
        {status ? <Text style={styles.status}>{status}</Text> : null}
        <Pressable
          style={styles.secondary}
          onPress={() => setShowPrivacy(true)}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={styles.secondaryText}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.hint}>
          Tap the contacts button and pick your own card when you want JunctionShare to fill your WhatsApp number.
          Cancelling the picker does not read any other contacts.
          {Platform.OS === 'ios' ? ' iPhone' : ' Android'} will not let apps silently read the SIM line. The name and
          number you save stay on this device.
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
