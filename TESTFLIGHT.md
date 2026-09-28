# JunctionShare → TestFlight

Apple ID for App Store Connect / EAS: **parul.sharma20@gmail.com**

## Already done on this machine
- Expo (TypeScript) app scaffold at `/workspace/JunctionShare`
- 5 MVP screens: Home, Create request, Nearby inbox, Match (WhatsApp handoff), Profile
- Mock nearby riders (Princeton Junction / West Windsor)
- `ios.bundleIdentifier`: `com.junctionshare.app`
- `eas.json` submit appleId set to the account above

## What you still need (cannot finish without you)
1. Active **Apple Developer Program** membership on that Apple ID ($99/yr).
2. Sign in once for EAS (do **not** paste the password into chat):
   ```bash
   cd /workspace/JunctionShare
   npx eas-cli login
   npx eas init
   npx eas build --platform ios --profile preview
   npx eas submit --platform ios --latest
   ```
3. In App Store Connect: create app **JunctionShare**, copy **Apple Team ID** and **ASC App ID** into `eas.json`.
4. Add internal testers in TestFlight and accept the email invite on their iPhones.

## Run locally (no TestFlight yet)
```bash
cd /workspace/JunctionShare
npm start
```
Then open in Expo Go, or use EAS for a real device build.

## Status 2026-09-25
- EAS account: futurestackservices
- Apple ID: parul.sharma20@gmail.com (team GRPTX5RCP9)
- ASC App ID: 6816251878
- Build: 4d797856-e403-4bad-9678-a2d45da2079b (v1.0.0 / build 3) — finished
- Submission: 320e3a22-977b-492b-8404-e656ff2e6f96 — submitted; Apple processing
- TestFlight: https://appstoreconnect.apple.com/apps/6816251878/testflight/ios

## Status 2026-09-26
- Destination on Need a ride / Have seats: searchable map + Google Maps open link (Photon near PJ; Google Places if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set)
- Build 4 (contacts WhatsApp autofill) submitted earlier; build 5 = map destination search
