# JunctionShare

Last-mile carpool helper for **Princeton Junction / West Windsor**. Need a ride or have seats, broadcast a short request, review nearby cards, then continue on WhatsApp.

This release ships the complete v1 flow with **demo nearby riders** so you can walk matching end-to-end while live geo matching is rolled out separately.

## Run locally

```bash
npm ci
npm start
```

Then open in Expo Go, or `npm run ios` / `npm run android` with a simulator.

```bash
npm test
npm run typecheck
npm run lint
```

## Production build / submit

EAS project: `futurestackservices` / `com.junctionshare.app` (v1.0.1).

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform ios --latest
npx eas-cli submit --platform android --latest
```

Android submit expects `./secrets/play-service-account.json` (gitignored). Listing copy and Play assets live in `play-store/`. App Store metadata is in `store.config.json`. Privacy policy is in-app (Profile) and in `play-store/privacy-policy.html`.

Optional: set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Google Places destination search. Without it, Photon (Komoot) is used.

## App flow

1. Home — **Need a ride** or **Have seats**.
2. Pick a destination suggestion, radius, time window → **Broadcast**.
3. Nearby inbox — Interested or Decline. Demo cards last 30 minutes.
4. Match — **Chat on WhatsApp**.
5. Profile — optional WhatsApp number from a contact you pick. **End request** on Home stops a broadcast early.
