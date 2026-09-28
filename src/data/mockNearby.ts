import { NearbyCard } from '../types';

const now = Date.now();

/**
 * Demo nearby riders around Princeton Junction / West Windsor.
 * Windows are mixed so expiry is easy to demo:
 * - Alex: 1 min (expires quickly during a live demo)
 * - Jordan: 15 min, started 10 min ago (~5 min left)
 * - Sam: 30 min from now
 */
export const MOCK_NEARBY: NearbyCard[] = [
  {
    id: '1',
    firstName: 'Alex',
    distanceM: 80,
    destination: 'West Windsor Community Park',
    role: 'need',
    seats: 1,
    phoneE164: '16095550101',
    createdAt: now,
    windowMin: 1,
  },
  {
    id: '2',
    firstName: 'Jordan',
    distanceM: 220,
    destination: 'MarketFair Mall',
    role: 'offer',
    seats: 2,
    phoneE164: '16095550102',
    createdAt: now - 10 * 60_000,
    windowMin: 15,
  },
  {
    id: '3',
    firstName: 'Sam',
    distanceM: 450,
    destination: 'Edinburg Rd / Quakerbridge',
    role: 'need',
    seats: 1,
    phoneE164: '16095550103',
    createdAt: now,
    windowMin: 30,
  },
];
