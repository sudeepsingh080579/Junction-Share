export type RadiusM = 100 | 500 | 1000;
export type Role = 'need' | 'offer';

export type RideRequest = {
  id: string;
  role: Role;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  radiusM: RadiusM;
  windowMin: number;
  note: string;
  createdAt: number;
};

export type NearbyCard = {
  id: string;
  firstName: string;
  distanceM: number;
  destination: string;
  role: Role;
  seats: number;
  phoneE164: string;
  /** When this nearby ping was created (ms since epoch). */
  createdAt: number;
  /** How long the ping stays visible (minutes). */
  windowMin: number;
};
