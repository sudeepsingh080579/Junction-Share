import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as SecureStore from 'expo-secure-store';
import { toDisplayPhone, toWhatsAppDigits } from '../utils/phone';

type Props = {
  onBack: () => void;
};

const KEYS = {
  name: 'js_profile_name',
  phone: 'js_profile_phone',
  location: 'js_profile_location_optin',
  whatsapp: 'js_profile_whatsapp_optin',
} as const;

function pickBestPhone(numbers: Contacts.PhoneNumber[] | undefined): string | null {
  if (!numbers?.length) return null;
  const mobile = numbers.find((n) => /mobile|iphone|whatsapp|cell/i.test(n.label || ''));
  const chosen = mobile || numbers[0];
  const digits = toWhatsAppDigits(chosen.number || '');
  return digits ? toDisplayPhone(digits) : null;
}

export function ProfileScreen({ onBack }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+1');
  const [locationOptIn, setLocationOptIn] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(true);

  const persistPhone = useCallback(async (value: string) => {
    setPhone(value);
    const digits = toWhatsAppDigits(value);
    if (digits) {
      try { await SecureStore.setItemAsync(KEYS.phone, toDisplayPhone(digits)); }
      catch { setStatus('Could not securely save this number.'); }
    }
  }, []);

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
        setStatus('That contact has no phone number.');
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
        const [savedName, savedPhone, savedLoc, savedWa] = await Promise.all([
          SecureStore.getItemAsync(KEYS.name),
          SecureStore.getItemAsync(KEYS.phone),
          SecureStore.getItemAsync(KEYS.location),
          SecureStore.getItemAsync(KEYS.whatsapp),
        ]);
        if (cancelled) return;
        if (savedName) setName(savedName);
        if (savedLoc != null) setLocationOptIn(savedLoc === '1');
        if (savedWa != null) setWhatsappOptIn(savedWa === '1');

        if (savedPhone && toWhatsAppDigits(savedPhone)) {
          setPhone(savedPhone);
          setStatus('Using saved WhatsApp number.');
        } else {
          // First open: open the system contact picker so the number comes from this phone.
          await fillFromContactPicker();
        }
      } finally {
        if (!cancelled) setLoadingPhone(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeName = async (value: string) => {
    setName(value);
    try { await SecureStore.setItemAsync(KEYS.name, value); } catch { setStatus('Could not save your profile securely.'); }
  };

  const onToggleLocation = async (value: boolean) => {
    setLocationOptIn(value);
    try { await SecureStore.setItemAsync(KEYS.location, value ? '1' : '0'); } catch { setLocationOptIn(!value); setStatus('Could not save this privacy setting.'); }
  };

  const onToggleWhatsapp = async (value: boolean) => {
    setWhatsappOptIn(value);
    try { await SecureStore.setItemAsync(KEYS.whatsapp, value ? '1' : '0'); } catch { setWhatsappOptIn(!value); setStatus('Could not save this privacy setting.'); }
  };

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
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
      />
      <Text style={styles.label}>Phone (WhatsApp)</Text>
      <View style={styles.phoneRow}>
        <TextInput
          style={[styles.input, styles.phoneInput]}
          value={phone}
          onChangeText={(t) => persistPhone(t)}
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
          } finally {
            setLoadingPhone(false);
          }
        }}
      >
        <Text style={styles.secondaryText}>Use number from this phone</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Share location while requesting</Text>
        <Switch value={locationOptIn} onValueChange={onToggleLocation} />
      </View>
      <View style={styles.row}>
        <Text style={styles.toggleLabel}>WhatsApp nearby alerts</Text>
        <Switch value={whatsappOptIn} onValueChange={onToggleWhatsapp} />
      </View>
      <Text style={styles.hint}>
        Profile opens the contact picker so your WhatsApp number comes from this phone (pick your own card).
        The keyboard can also suggest it. {Platform.OS === 'ios' ? 'iPhone' : 'Android'} will not let apps
        silently read the SIM line. Saved securely on device. Block / report lands later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F7F4EF' },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  toggleLabel: { color: '#1C2A1F', flex: 1, paddingRight: 12 },
  hint: { marginTop: 24, color: '#5A655C', lineHeight: 20 },
});
