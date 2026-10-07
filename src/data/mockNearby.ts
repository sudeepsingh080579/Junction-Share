import { NearbyCard } from '../types';

/**
 * Demo nearby riders around Princeton Junction / West Windsor.
 * Built at call time (not module load) so windows stay live for App Review
 * and first-run production walks. Every card is within 100m (the smallest
 * radius) and stays visible for 30 minutes.
 */
export function createDemoNearby(now = Date.now()): NearbyCard[] {
  return [
    {
      id: 'demo-alex',
      firstName: 'Alex',
      distanceM: 40,
      destination: 'West Windsor Community Park',
      role: 'need',
      seats: 1,
      phoneE164: '16095550101',
      createdAt: now,
      windowMin: 30,
    },
    {
      id: 'demo-jordan',
      firstName: 'Jordan',
      distanceM: 70,
      destination: 'MarketFair Mall',
      role: 'offer',
      seats: 2,
      phoneE164: '16095550102',
      createdAt: now,
      windowMin: 30,
    },
    {
      id: 'demo-sam',
      firstName: 'Sam',
      distanceM: 100,
      destination: 'Edinburg Rd / Quakerbridge',
      role: 'need',
      seats: 1,
      phoneE164: '16095550103',
      createdAt: now,
      windowMin: 30,
    },
  ];
}

/** Fixed-clock snapshot for unit tests that should not depend on Date.now(). */
export const MOCK_NEARBY: NearbyCard[] = createDemoNearby(1_700_000_000_000);
