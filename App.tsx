import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { screenAfterBack, Screen } from './src/navigation/back';
import { CreateRequestScreen, DEFAULT_DRAFT, RequestDraft } from './src/screens/CreateRequestScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { mergeRestoredRequest, pruneSession } from './src/session/prune';
import { clearActiveRequest, loadActiveRequest, saveActiveRequest } from './src/storage/activeRequest';
import { clearSecureStoreOnFreshInstall } from './src/storage/installMarker';
import { loadProfile } from './src/storage/profile';
import {
  declineRequest,
  endActiveRequest,
  expressInterest,
  fetchMutualMatches,
  fetchNearbyRequests,
  fetchRemoteActiveRequest,
  publishLiveRequest,
  updateMyLocation,
} from './src/services/matching';
import { prepareBroadcastLocation, readCurrentCoordinates, startRequestTracking, stopRequestTracking } from './src/services/location';
import { NearbyCard, RadiusM, RideRequest, Role } from './src/types';
import { isExpired } from './src/utils/expiry';

/** How often we prune expired active / nearby requests while the app is open. */
const EXPIRY_TICK_MS = 15_000;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [profileFrom, setProfileFrom] = useState<Screen>('home');
  const [role, setRole] = useState<Role>('need');
  const [draft, setDraft] = useState<RequestDraft>(DEFAULT_DRAFT);
  const [active, setActive] = useState<RideRequest | null>(null);
  const [inbox, setInbox] = useState<NearbyCard[]>([]);
  const [inboxNote, setInboxNote] = useState<string | null>(null);
  const [match, setMatch] = useState<NearbyCard | null>(null);
  /** Shared clock tick so Home can show "X min left" without its own timer. */
  const [now, setNow] = useState(() => Date.now());

  const activeRef = useRef(active);
  const matchRef = useRef(match);
  const inboxRef = useRef(inbox);
  const screenRef = useRef(screen);
  const profileFromRef = useRef(profileFrom);
  const sessionEpoch = useRef(0);
  const alertedExpiry = useRef<string | null>(null);
  const broadcastLock = useRef(false);
  activeRef.current = active;
  matchRef.current = match;
  inboxRef.current = inbox;
  screenRef.current = screen;
  profileFromRef.current = profileFrom;

  const openProfile = (from: Screen) => {
    setProfileFrom(from);
    setScreen('profile');
  };

  const refreshLive = useCallback(async () => {
    if (!activeRef.current) {
      setInbox([]);
      setInboxNote(null);
      return;
    }
    try {
      const [nearby, matches] = await Promise.all([fetchNearbyRequests(), fetchMutualMatches()]);
      setInbox(nearby);
      setInboxNote(null);
      const next = matches[0];
      if (next && screenRef.current === 'inbox' && matchRef.current?.id !== next.id) {
        setMatch(next);
        setScreen('match');
      }
    } catch (error) {
      setInboxNote(
        error instanceof Error ? error.message : 'Could not refresh nearby requests. Check your connection.',
      );
    }
  }, []);

  // Restore an in-flight broadcast after a cold start (dropped if it expired while closed).
  useEffect(() => {
    const epochAtStart = sessionEpoch.current;
    let cancelled = false;
    (async () => {
      await clearSecureStoreOnFreshInstall();
      if (cancelled) return;
      const restored = await loadActiveRequest();
      if (cancelled) return;
      setActive((current) => mergeRestoredRequest(current, restored, epochAtStart, sessionEpoch.current));
      try {
        const remote = await fetchRemoteActiveRequest();
        if (cancelled || sessionEpoch.current !== epochAtStart) return;
        if (remote) {
          setActive((current) => mergeRestoredRequest(current, remote, epochAtStart, sessionEpoch.current));
          await saveActiveRequest(remote);
          await startRequestTracking();
        } else if (restored) {
          await clearActiveRequest(restored.id);
          setActive((current) => (current?.id === restored.id ? null : current));
          await stopRequestTracking();
        }
      } catch {
        if (!cancelled && restored && !isExpired(restored.createdAt, restored.windowMin)) {
          setInboxNote('Could not refresh live requests. Showing the request saved on this phone.');
          await startRequestTracking().catch(() => undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startBroadcast = (req: RideRequest) => {
    sessionEpoch.current += 1;
    setActive(req);
    setInbox([]);
    setInboxNote(null);
    setScreen('home');
    saveActiveRequest(req).catch(() => {
      Alert.alert(
        'Saved for this session only',
        'Your request could not be stored on the device and will not survive an app restart.',
      );
    });
  };

  const requestBroadcast = async (payload: {
    destination: string;
    destinationLat?: number;
    destinationLng?: number;
    radiusM: RadiusM;
    windowMin: number;
    note: string;
  }) => {
    if (broadcastLock.current) return;
    broadcastLock.current = true;
    try {
      const profile = await loadProfile();
      if (!profile.name.trim() || !profile.phone) {
        Alert.alert(
          'Add your profile',
          'Save your first name and WhatsApp number on Profile before broadcasting.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Profile', onPress: () => openProfile('create') },
          ],
        );
        return;
      }
      const loc = await prepareBroadcastLocation();
      if (!loc.ok) {
        Alert.alert(
          'Location needed',
          loc.message,
          loc.openSettings
            ? [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => void Linking.openSettings() },
              ]
            : [{ text: 'OK' }],
        );
        return;
      }
      const request = await publishLiveRequest({
        role,
        destination: payload.destination,
        destinationLat: payload.destinationLat,
        destinationLng: payload.destinationLng,
        radiusM: payload.radiusM,
        windowMin: payload.windowMin,
        note: payload.note,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      startBroadcast(request);
      if (loc.background === 'granted') {
        await startRequestTracking();
      } else if (loc.background === 'denied') {
        Alert.alert(
          'Request is live',
          'Nearby riders can see it while JunctionShare is open. Allow location all the time in Settings so your request stays visible in the background.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        'Broadcast unavailable',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      broadcastLock.current = false;
    }
  };

  const endRequest = async () => {
    const current = activeRef.current;
    if (!current) return;
    try {
      await endActiveRequest();
      await stopRequestTracking();
    } catch (error) {
      Alert.alert(
        'Could not end request',
        error instanceof Error ? error.message : 'Check your connection and try again. Your request is still active for nearby riders.',
      );
      return;
    }
    setActive(null);
    setInbox([]);
    void clearActiveRequest(current.id);
  };

  const pruneRef = useRef<(at?: number) => void>(() => {});
  pruneRef.current = (at = Date.now()) => {
    const currentActive = activeRef.current;
    const result = pruneSession(currentActive, matchRef.current, inboxRef.current, at);
    setNow(at);
    if (result.requestEnded && currentActive && alertedExpiry.current !== currentActive.id) {
      alertedExpiry.current = currentActive.id;
      Alert.alert('Request ended', 'Your carpool request has expired.');
      void clearActiveRequest(currentActive.id);
      void endActiveRequest().catch(() => undefined);
      void stopRequestTracking().catch(() => undefined);
      setInbox([]);
    }
    if (result.active !== currentActive) setActive(result.active);
    if (result.match !== matchRef.current) setMatch(result.match);
    if (result.inbox !== inboxRef.current) setInbox(result.inbox);
    if (result.matchEnded && screenRef.current === 'match') setScreen('inbox');
  };

  useEffect(() => {
    const tick = () => pruneRef.current();
    tick();
    const id = setInterval(tick, EXPIRY_TICK_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      tick();
      if (!activeRef.current) return;
      void readCurrentCoordinates().then((coords) => {
        if (!coords || !activeRef.current) return;
        void updateMyLocation(coords.latitude, coords.longitude).catch(() => undefined);
      });
      void refreshLive();
    });
    return () => {
      clearInterval(id);
      appState.remove();
    };
  }, [refreshLive]);

  useEffect(() => {
    if ((screen !== 'home' && screen !== 'inbox') || !active) return;
    const initial = setTimeout(() => void refreshLive(), 0);
    const timer = setInterval(() => void refreshLive(), EXPIRY_TICK_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [screen, active, refreshLive]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const next = screenAfterBack(screenRef.current, profileFromRef.current);
      if (!next) return false;
      setScreen(next);
      return true;
    });
    return () => sub.remove();
  }, []);

  const filteredInbox = useMemo(() => {
    const live = inbox.filter((c) => !isExpired(c.createdAt, c.windowMin, now));
    if (!active) return live;
    return live.filter((c) => c.distanceM <= active.radiusM);
  }, [active, inbox, now]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="dark" />
        {screen === 'home' && (
          <HomeScreen
            active={active}
            now={now}
            inbox={filteredInbox}
            onNeed={() => {
              setRole('need');
              setScreen('create');
            }}
            onOffer={() => {
              setRole('offer');
              setScreen('create');
            }}
            onOpenInbox={() => setScreen('inbox')}
            onProfile={() => openProfile('home')}
            onEndRequest={() => void endRequest()}
          />
        )}
        {screen === 'create' && (
          <CreateRequestScreen
            role={role}
            draft={draft}
            onDraftChange={setDraft}
            onBack={() => setScreen('home')}
            onProfile={() => openProfile('create')}
            onBroadcast={(payload) => void requestBroadcast(payload)}
          />
        )}
        {screen === 'inbox' && (
          <InboxScreen
            items={filteredInbox}
            now={now}
            note={inboxNote}
            hasActiveRequest={Boolean(active)}
            onBack={() => setScreen('home')}
            onInterested={(card) => {
              void (async () => {
                try {
                  const result = await expressInterest(card.id);
                  if (result.matched && result.match) {
                    setMatch(result.match);
                    setScreen('match');
                  } else {
                    Alert.alert(
                      'Interest sent',
                      'If they are interested too, the match will open in this inbox.',
                    );
                  }
                  await refreshLive();
                } catch (error) {
                  Alert.alert(
                    'Could not send interest',
                    error instanceof Error ? error.message : 'Check your connection and try again.',
                  );
                }
              })();
            }}
            onDecline={(id) => {
              void (async () => {
                try {
                  await declineRequest(id);
                  setInbox((prev) => prev.filter((c) => c.id !== id));
                } catch (error) {
                  Alert.alert(
                    'Could not decline request',
                    error instanceof Error ? error.message : 'Check your connection and try again.',
                  );
                }
              })();
            }}
          />
        )}
        {screen === 'match' && match && (
          <MatchScreen match={match} request={active} onBack={() => setScreen('inbox')} />
        )}
        {screen === 'profile' && <ProfileScreen onBack={() => setScreen(profileFrom)} />}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
