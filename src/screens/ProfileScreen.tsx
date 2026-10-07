import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import { Screen } from '../components/Screen';
import { ensureForegroundLocation } from '../services/locationPermission';
import {
  DEFAULT_PROFILE,
  loadProfile,
  saveLocationOptIn,
  saveProfileName,
  saveProfilePhone,
  saveWhatsappOptIn,
} from '../storage/profile';
import { isValidPhone, phoneValidationMessage, toDisplayPhone, validatePhone } from '../utils/phone';
import { PrivacyPolicyScreen } from './PrivacyPolicyScreen';

type Props = {
  onBack: () => void;
};

function pickBestPhone(numbers: Contacts.PhoneNumber[] | undefined): string | null {
  if (!numbers?.length) return null;
  // Prefer a number that validates; contacts often carry landlines or partial entries first.
  const ranked = [...numbers].sort((a, b) => {
    const aMobile = /mobile|iphone|whatsapp|cell/i.test(a.label || '') ? 0 : 1;
    const bMobile = /mobile|iphone|whatsapp|cell/i.test(b.label || '') ? 0 : 1;
    return aMobile - bMobile;
  });
  for (const n of ranked) {
    const display = toDisplayPhone(n.number || '');
    if (display) return display;
  }
  return null;
}

export function ProfileScreen({ onBack }: Props) {
  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [phone, setPhone] = useState('+1');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [locationOptIn, setLocationOptIn] = useState(DEFAULT_PROFILE.locationOptIn);
  const [whatsappOptIn, setWhatsappOptIn] = useState(DEFAULT_PROFILE.whatsappOptIn);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const persistPhone = useCallback(async (value: string) => {
    setPhone(value);
    // Keep the message quiet while the user is still typing; it is surfaced on blur.
    setPhoneError(null);
    const v = validatePhone(value);
    if (!v.ok) return;
    try {
      await saveProfilePhone(v.e164);
    } catch {
      setStatus('Could not securely save this number.');
    }
  }, []);

  const validatePhoneOnBlur = useCallback(() => {
    const v = validatePhone(phone);
    setPhoneError(phoneValidationMessage(v));
  }, [phone]);

  const fillFromContactPicker = useCallback(async () => {
    const { status: perm } = await Contacts.requestPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('Contacts permission needed to auto-fill your WhatsApp number.');
      return false;
    }

    try {
      const picked = await Contacts.presentContactPickerAsync();
      if (picked) {
        const fromPick = pickBestPhone(picked.phoneNumbers);
        if (fromPick) {
          await persistPhone(fromPick);
          setStatus('WhatsApp number filled from your phone.');
          return true;
        }
        setStatus('That contact has no valid phone number.');
        return false;
      }
    } catch {
      // Picker unavailable on some builds — fall through to name match.
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      pageSize: 200,
      sort: Contacts.SortTypes.FirstName,
    });

    const needle = name.trim().toLowerCase();
    const named =
      data.find((c) => {
        const full = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
        return needle && (full === needle || full.startsWith(needle) || (c.firstName || '').toLowerCase() === needle);
      }) || null;

    const fromNamed = pickBestPhone(named?.phoneNumbers);
    if (fromNamed) {
      await persistPhone(fromNamed);
      setStatus('WhatsApp number filled from your contacts.');
      return true;
    }

    setStatus('No phone found — tap the field for the keyboard suggestion, or try Use from Contacts again.');
    return false;
  }, [name, persistPhone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadProfile();
        if (cancelled) return;
        setName(saved.name);
        setLocationOptIn(saved.locationOptIn);
        setWhatsappOptIn(saved.whatsappOptIn);

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

  const onChangeName = async (value: string) => {
    setName(value);
    try {
      await saveProfileName(value);
    } catch {
      setStatus('Could not save your profile securely.');
    }
  };

  const onToggleLocation = async (value: boolean) => {
    if (value) {
      const access = await ensureForegroundLocation();
      if (!access.ok) {
        setStatus(
          access.reason === 'denied'
            ? 'Location permission is needed to share your position while requesting.'
            : 'Location could not be read on this device.',
        );
        return;
      }
    }
    setLocationOptIn(value);
    try {
      await saveLocationOptIn(value);
    } catch {
      setLocationOptIn(!value);
      setStatus('Could not save this privacy setting.');
    }
  };

  const onToggleWhatsapp = async (value: boolean) => {
    if (value && !isValidPhone(phone)) {
      setPhoneError(phoneValidationMessage(validatePhone(phone)) ?? 'Add a valid WhatsApp number first.');
      setStatus('Add a valid WhatsApp number before turning on alerts.');
      return;
    }
    setWhatsappOptIn(value);
    try {
      await saveWhatsappOptIn(value);
    } catch {
      setWhatsappOptIn(!value);
      setStatus('Could not save this privacy setting.');
    }
  };

  if (showPrivacy) {
    return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Profile / safety</Text>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          autoComplete="given-name"
          textContentType="givenName"
          accessibilityLabel="First name"
        />
        <Text style={styles.label}>Phone (WhatsApp)</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(t) => persistPhone(t)}
            onBlur={validatePhoneOnBlur}
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
        <View style={styles.row}>
          <Text style={styles.toggleLabel}>Share location while requesting</Text>
          <Switch
            value={locationOptIn}
            onValueChange={onToggleLocation}
            accessibilityLabel="Share location while requesting"
          />
        </View>
        <Text style={styles.toggleHint}>Off by default. Required to broadcast a request to nearby riders.</Text>
        <View style={styles.row}>
          <Text style={styles.toggleLabel}>WhatsApp nearby alerts</Text>
          <Switch value={whatsappOptIn} onValueChange={onToggleWhatsapp} accessibilityLabel="WhatsApp nearby alerts" />
        </View>
        <Text style={styles.toggleHint}>Off by default. Needs a valid WhatsApp number.</Text>
        <Pressable
          style={styles.secondary}
          onPress={() => setShowPrivacy(true)}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={styles.secondaryText}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.hint}>
          Use the contacts button only when you want JunctionShare to fill your WhatsApp number from this phone.
          {Platform.OS === 'ios' ? ' iPhone' : ' Android'} will not let apps silently read the SIM line. Saved securely
          on device.
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  toggleLabel: { color: '#1C2A1F', flex: 1, paddingRight: 12 },
  toggleHint: { color: '#5A655C', fontSize: 12, marginTop: 4 },
  hint: { marginTop: 24, color: '#5A655C', lineHeight: 20 },
});
