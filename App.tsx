import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { createDemoNearby } from './src/data/mockNearby';
import { CreateRequestScreen } from './src/screens/CreateRequestScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ensureForegroundLocation, locationAccessMessage } from './src/services/locationPermission';
import { clearActiveRequest, loadActiveRequest, saveActiveRequest } from './src/storage/activeRequest';
import { loadProfile } from './src/storage/profile';
import { NearbyCard, RadiusM, RideRequest, Role } from './src/types';
import { isExpired } from './src/utils/expiry';

type Screen = 'home' | 'create' | 'inbox' | 'match' | 'profile';

/** How often we prune expired active / nearby requests. */
const EXPIRY_TICK_MS = 15_000;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [role, setRole] = useState<Role>('need');
  const [active, setActive] = useState<RideRequest | null>(null);
  const [inbox, setInbox] = useState<NearbyCard[]>(() => createDemoNearby());
  const [match, setMatch] = useState<NearbyCard | null>(null);
  /** Shared clock tick so Home can show "X min left" without its own timer. */
  const [now, setNow] = useState(() => Date.now());

  const activeRef = useRef(active);
  const matchRef = useRef(match);
  activeRef.current = active;
  matchRef.current = match;

  // Restore an in-flight broadcast after a cold start (dropped if it expired while closed).
  useEffect(() => {
    let cancelled = false;
    loadActiveRequest().then((restored) => {
      if (!cancelled && restored) setActive(restored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startBroadcast = (req: RideRequest) => {
    setActive(req);
    setScreen('home');
    saveActiveRequest(req).catch(() => {
      Alert.alert(
        'Saved for this session only',
        'Your request could not be stored on the device and will not survive an app restart.',
      );
    });
  };

  const requestBroadcast = async (req: RideRequest) => {
    let locationOptIn = false;
    try {
      locationOptIn = (await loadProfile()).locationOptIn;
    } catch {
      // Treat unreadable settings as no consent.
    }
    if (!locationOptIn) {
      Alert.alert(
        'Location sharing is off',
        'Broadcasting shares your approximate location with nearby riders. Turn on "Share location while requesting" in Profile to continue.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Profile', onPress: () => setScreen('profile') },
        ],
      );
      return;
    }

    const access = await ensureForegroundLocation();
    if (!access.ok) {
      const copy = locationAccessMessage(access);
      Alert.alert(copy.title, copy.body, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Profile', onPress: () => setScreen('profile') },
      ]);
      return;
    }

    startBroadcast(req);
  };

  const endRequest = () => {
    setActive(null);
    setMatch(null);
    if (screen === 'match') setScreen('home');
    void clearActiveRequest();
  };

  // Prune expired active broadcast + nearby cards; leave match safely if needed.
  useEffect(() => {
    const prune = () => {
      const t = Date.now();
      setNow(t);

      const currentActive = activeRef.current;
      const currentMatch = matchRef.current;

      if (currentActive && isExpired(currentActive.createdAt, currentActive.windowMin, t)) {
        setActive(null);
        void clearActiveRequest();
        // Active broadcast ended — drop match UI tied to this trip.
        if (currentMatch) setMatch(null);
      } else if (currentMatch && isExpired(currentMatch.createdAt, currentMatch.windowMin, t)) {
        setMatch(null);
      }

      setInbox((prev) => {
        const next = prev.filter((c) => !isExpired(c.createdAt, c.windowMin, t));
        return next.length === prev.length ? prev : next;
      });
    };

    prune();
    const id = setInterval(prune, EXPIRY_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // If match was cleared while Match screen is open, go home (no crash / blank screen).
  useEffect(() => {
    if (screen === 'match' && !match) {
      setScreen('home');
    }
  }, [screen, match]);

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
            onProfile={() => setScreen('profile')}
            onEndRequest={endRequest}
          />
        )}
        {screen === 'create' && (
          <CreateRequestScreen
            role={role}
            onBack={() => setScreen('home')}
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
              void requestBroadcast(req);
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
        {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} />}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
