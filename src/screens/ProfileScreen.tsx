import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { saveRemoteProfile } from '../services/matching';
import { supabaseConfigured } from '../services/supabase';

type Props = {
  onBack: () => void;
  onLocationDisabled: () => void;
};

const KEYS = {
  name: 'js_profile_name',
  phone: 'js_profile_phone',
  location: 'js_profile_location_optin',
  whatsapp: 'js_profile_whatsapp_optin',
} as const;

async function saveLocal(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

async function readLocal(key: string) {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

function pickBestPhone(numbers: Contacts.PhoneNumber[] | undefined): string | null {
  if (!numbers?.length) return null;
  const mobile = numbers.find((n) => /mobile|iphone|whatsapp|cell/i.test(n.label || ''));
  const chosen = mobile || numbers[0];
  const digits = toWhatsAppDigits(chosen.number || '');
  return digits ? toDisplayPhone(digits) : null;
}

export function ProfileScreen({ onBack, onLocationDisabled }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+1');
  const [locationOptIn, setLocationOptIn] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [status, setStatus] = useState<string | null>(() =>
    Platform.OS === 'web' ? 'Profile settings are saved in this browser. Contact autofill is available on iOS and Android.' : null,
  );
  const [loadingPhone, setLoadingPhone] = useState(Platform.OS !== 'web');
  const phoneSaveQueue = useRef<Promise<void>>(Promise.resolve());

  const persistPhone = useCallback(async (value: string) => {
    setPhone(value);
    const digits = toWhatsAppDigits(value);
    phoneSaveQueue.current = phoneSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await saveLocal(KEYS.phone, digits ? toDisplayPhone(digits) : null);
        } catch {
          setStatus('Could not securely save this number.');
        }
      });
    await phoneSaveQueue.current;
  }, []);

  const fillFromContactPicker = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStatus('Contact autofill is available on iOS and Android.');
      return false;
    }

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
          readLocal(KEYS.name),
          readLocal(KEYS.phone),
          readLocal(KEYS.location),
          readLocal(KEYS.whatsapp),
        ]);
        if (cancelled) return;
        if (savedName) setName(savedName);
        if (savedLoc != null) setLocationOptIn(savedLoc === '1');
        if (savedWa != null) setWhatsappOptIn(savedWa === '1');

        if (savedPhone && toWhatsAppDigits(savedPhone)) {
          setPhone(savedPhone);
          setStatus('Using saved WhatsApp number.');
        } else if (Platform.OS !== 'web') {
          // First open: open the system contact picker so the number comes from this phone.
          await fillFromContactPicker();
        } else {
          setStatus('Using the profile saved in this browser.');
        }
        if (supabaseConfigured) {
          try {
            await saveRemoteProfile();
          } catch {
            if (!cancelled) setStatus('Profile is saved on this device, but cloud sync failed. Check your connection and try changing a setting again.');
          }
        }
      } catch {
        if (!cancelled) setStatus('Could not load your saved profile securely.');
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
    try { await saveLocal(KEYS.name, value); } catch { setStatus('Could not save your profile securely.'); }
  };

  const onToggleLocation = async (value: boolean) => {
    setLocationOptIn(value);
    try {
      await saveLocal(KEYS.location, value ? '1' : '0');
    } catch { setLocationOptIn(!value); setStatus('Could not save this privacy setting.'); return; }
    if (!value) onLocationDisabled();
    if (!supabaseConfigured) { setStatus('Saved on this device. Connect Supabase to use this preference for live matching.'); return; }
    try { await saveRemoteProfile(); setStatus('Location sharing preference synced. Location is used only during an active request.'); }
    catch { setStatus('Saved on this device, but could not sync the location setting. Reopen this screen when online to retry.'); }
  };

  const onToggleWhatsapp = async (value: boolean) => {
    setWhatsappOptIn(value);
    try {
      await saveLocal(KEYS.whatsapp, value ? '1' : '0');
    } catch { setWhatsappOptIn(!value); setStatus('Could not save this privacy setting.'); return; }
    if (!supabaseConfigured) { setStatus('Saved on this device. Connect Supabase to use this preference for live matching.'); return; }
    try { await saveRemoteProfile(); setStatus('WhatsApp contact preference synced. Your number is shared only after a mutual match.'); }
    catch { setStatus('Saved on this device, but could not sync the WhatsApp setting. Reopen this screen when online to retry.'); }
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
        onBlur={() => { if (supabaseConfigured) void saveRemoteProfile().catch(() => setStatus('Could not sync your profile.')); }}
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
          onBlur={() => { if (supabaseConfigured) void saveRemoteProfile().catch(() => setStatus('Could not sync your profile.')); }}
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
        <Text style={styles.toggleLabel}>Allow WhatsApp contact after a mutual match</Text>
        <Switch value={whatsappOptIn} onValueChange={onToggleWhatsapp} />
      </View>
      <Text style={styles.hint}>
        Profile opens the contact picker so your WhatsApp number comes from this phone (pick your own card).
        The keyboard can also suggest it. {Platform.OS === 'ios' ? 'iPhone' : 'Android'} will not let apps
        silently read the SIM line. {Platform.OS === 'web' ? 'Profile data is saved in this browser.' : 'Profile data is saved securely on this device.'} A Supabase connection is required to sync your profile for live matching.
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
