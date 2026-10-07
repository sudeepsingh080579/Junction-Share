import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { createDemoNearby } from './src/data/mockNearby';
import { screenAfterBack, Screen } from './src/navigation/back';
import { CreateRequestScreen, DEFAULT_DRAFT, RequestDraft } from './src/screens/CreateRequestScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { mergeRestoredRequest, pruneSession } from './src/session/prune';
import { clearActiveRequest, loadActiveRequest, saveActiveRequest } from './src/storage/activeRequest';
import { clearSecureStoreOnFreshInstall } from './src/storage/installMarker';
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
  const [inbox, setInbox] = useState<NearbyCard[]>(() => createDemoNearby());
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
  activeRef.current = active;
  matchRef.current = match;
  inboxRef.current = inbox;
  screenRef.current = screen;
  profileFromRef.current = profileFrom;

  const openProfile = (from: Screen) => {
    setProfileFrom(from);
    setScreen('profile');
  };

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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startBroadcast = (req: RideRequest) => {
    sessionEpoch.current += 1;
    setActive(req);
    setScreen('home');
    saveActiveRequest(req).catch(() => {
      Alert.alert(
        'Saved for this session only',
        'Your request could not be stored on the device and will not survive an app restart.',
      );
    });
  };

  const requestBroadcast = (req: RideRequest) => {
    startBroadcast(req);
  };

  const endRequest = () => {
    const id = activeRef.current?.id;
    setActive(null);
    if (id) void clearActiveRequest(id);
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
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      appState.remove();
    };
  }, []);

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
            onEndRequest={endRequest}
          />
        )}
        {screen === 'create' && (
          <CreateRequestScreen
            role={role}
            draft={draft}
            onDraftChange={setDraft}
            onBack={() => setScreen('home')}
            onProfile={() => openProfile('create')}
            onBroadcast={({ destination, destinationLat, destinationLng, radiusM, windowMin, note }) => {
              const createdAt = Date.now();
              const req: RideRequest = {
                id: String(createdAt),
                role,
                destination,
                destinationLat,
                destinationLng,
                radiusM: radiusM as RadiusM,
                windowMin,
                note,
                createdAt,
              };
              requestBroadcast(req);
            }}
          />
        )}
        {screen === 'inbox' && (
          <InboxScreen
            items={filteredInbox}
            now={now}
            onBack={() => setScreen('home')}
            onInterested={(card) => {
              setMatch(card);
              setScreen('match');
            }}
            onDecline={(id) => setInbox((prev) => prev.filter((c) => c.id !== id))}
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
