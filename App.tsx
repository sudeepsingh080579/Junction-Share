import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MOCK_NEARBY } from './src/data/mockNearby';
import { CreateRequestScreen } from './src/screens/CreateRequestScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NearbyCard, RadiusM, RideRequest, Role } from './src/types';
import { isExpired } from './src/utils/expiry';

type Screen = 'home' | 'create' | 'inbox' | 'match' | 'profile';

/** How often we prune expired active / nearby requests. */
const EXPIRY_TICK_MS = 15_000;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [role, setRole] = useState<Role>('need');
  const [active, setActive] = useState<RideRequest | null>(null);
  const [inbox, setInbox] = useState<NearbyCard[]>(MOCK_NEARBY);
  const [match, setMatch] = useState<NearbyCard | null>(null);
  /** Shared clock tick so Home can show "X min left" without its own timer. */
  const [now, setNow] = useState(() => Date.now());

  const activeRef = useRef(active);
  const matchRef = useRef(match);
  activeRef.current = active;
  matchRef.current = match;

  // Prune expired active broadcast + nearby cards; leave match safely if needed.
  useEffect(() => {
    const prune = () => {
      const t = Date.now();
      setNow(t);

      const currentActive = activeRef.current;
      const currentMatch = matchRef.current;

      if (currentActive && isExpired(currentActive.createdAt, currentActive.windowMin, t)) {
        setActive(null);
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
        />
      )}
      {screen === 'create' && (
        <CreateRequestScreen
          role={role}
          onBack={() => setScreen('home')}
          onBroadcast={({ destination, destinationLat, destinationLng, radiusM, windowMin, note }) => {
            const req: RideRequest = {
              id: String(Date.now()),
              role,
              destination,
              destinationLat,
              destinationLng,
              radiusM: radiusM as RadiusM,
              windowMin,
              note,
              createdAt: Date.now(),
            };
            setActive(req);
            setScreen('home');
          }}
        />
      )}
      {screen === 'inbox' && (
        <InboxScreen
          items={filteredInbox}
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
    </SafeAreaProvider>
  );
}
