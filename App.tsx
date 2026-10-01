import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CreateRequestScreen } from './src/screens/CreateRequestScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NearbyCard, RadiusM, RideRequest, Role } from './src/types';
import { isExpired } from './src/utils/expiry';
import { declineRequest, endActiveRequest, expressInterest, fetchNearby, loadActiveRequest, publishRequest, readLocalProfile, saveRemoteProfile } from './src/services/matching';
import { supabaseConfigured } from './src/services/supabase';

type Screen = 'home' | 'create' | 'inbox' | 'match' | 'profile';

/** How often we prune expired active / nearby requests. */
const EXPIRY_TICK_MS = 15_000;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [role, setRole] = useState<Role>('need');
  const [active, setActive] = useState<RideRequest | null>(null);
  const [inbox, setInbox] = useState<NearbyCard[]>([]);
  const [inboxStatus, setInboxStatus] = useState<string | null>(null);
  const [match, setMatch] = useState<NearbyCard | null>(null);
  /** Shared clock tick so Home can show "X min left" without its own timer. */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void saveRemoteProfile().then(loadActiveRequest).then((request) => {
        if (!cancelled) setActive(request);
      }).catch((error: unknown) => {
        if (!cancelled) setInboxStatus(error instanceof Error ? error.message : 'Could not sync your profile.');
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!supabaseConfigured) {
      setInbox([]);
      setInboxStatus('Connect a Supabase project to see live nearby requests.');
      return;
    }
    try {
      const live = await fetchNearby();
      setInbox(live);
      setInboxStatus(null);
    } catch (error) {
      setInboxStatus(error instanceof Error ? error.message : 'Could not refresh nearby requests.');
    }
  }, []);

  useEffect(() => {
    if (screen !== 'inbox') return;
    const initial = setTimeout(() => void refreshInbox(), 0);
    const timer = setInterval(() => void refreshInbox(), 15_000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [screen, refreshInbox]);

  // Prune expired active broadcast + nearby cards; leave match safely if needed.
  useEffect(() => {
    const prune = () => {
      const t = Date.now();
      setNow(t);

      if (active && isExpired(active.createdAt, active.windowMin, t)) {
        setActive(null);
        // Active broadcast ended — drop match UI tied to this trip.
        if (match) setMatch(null);
        if (screen === 'match') setScreen('home');
      } else if (match && isExpired(match.createdAt, match.windowMin, t)) {
        setMatch(null);
        if (screen === 'match') setScreen('home');
      }

      setInbox((prev) => {
        const next = prev.filter((c) => !isExpired(c.createdAt, c.windowMin, t));
        return next.length === prev.length ? prev : next;
      });
    };

    prune();
    const id = setInterval(prune, EXPIRY_TICK_MS);
    return () => clearInterval(id);
  }, [active, match, screen]);

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
          onEndRequest={async () => {
            try {
              await endActiveRequest();
              setActive(null);
              setInbox([]);
            } catch (error) {
              Alert.alert('Could not end request', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
        />
      )}
      {screen === 'create' && (
        <CreateRequestScreen
          role={role}
          onBack={() => setScreen('home')}
          onBroadcast={async ({ destination, destinationLat, destinationLng, radiusM, windowMin, note }) => {
            try {
              if (!supabaseConfigured) throw new Error('Live matching is not connected. Configure the Supabase project URL and publishable key to broadcast.');
              const privacy = await readLocalProfile();
              if (!privacy.shareLocation) throw new Error('Turn on “Share location while requesting” in Profile / safety before broadcasting.');
              const permission = await Location.requestForegroundPermissionsAsync();
              if (permission.status !== 'granted') throw new Error('Location permission is needed to find nearby riders. Allow foreground location access and try again.');
              const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const req: RideRequest = await publishRequest({
                role, destination, destinationLat, destinationLng, radiusM: radiusM as RadiusM,
                windowMin, note, latitude: point.coords.latitude, longitude: point.coords.longitude,
              });
              setActive(req);
              setInbox([]);
              setScreen('home');
            } catch (error) {
              Alert.alert('Broadcast unavailable', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
        />
      )}
      {screen === 'inbox' && (
        <InboxScreen
          items={filteredInbox}
          status={inboxStatus ?? (!active ? 'Create an active request first to find nearby riders.' : null)}
          onRefresh={refreshInbox}
          onBack={() => setScreen('home')}
          onInterested={async (card) => {
            try {
              const result = await expressInterest(card.id);
              if (result.matched && result.match) {
                setMatch(result.match);
                setScreen('match');
              } else {
                Alert.alert('Interest sent', 'If they are interested too, the mutual match will appear here after refresh.');
              }
              await refreshInbox();
            } catch (error) {
              Alert.alert('Could not send interest', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
          onDecline={async (id) => {
            try {
              await declineRequest(id);
              setInbox((prev) => prev.filter((c) => c.id !== id));
            } catch (error) {
              Alert.alert('Could not dismiss request', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
        />
      )}
      {screen === 'match' && match && (
        <MatchScreen match={match} request={active} onBack={() => setScreen('inbox')} />
      )}
      {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} onLocationDisabled={() => setActive(null)} />}
    </SafeAreaProvider>
  );
}
