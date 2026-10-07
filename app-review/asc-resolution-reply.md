# App Store Connect — Resolution Center reply + App Review Notes
App: JunctionShare (com.junctionshare.app) · ASC 6816251878 · Version 1.0 · Build 1.0.0 (7)

Paste the sections below into (1) Resolution Center reply and (2) App Review Information → Notes.

---

## 1. Screen recording
[ATTACH: physical-device screen recording — launch through typical flow]
Recording captured on a physical iPhone running the latest iOS, using TestFlight build 1.0.0 (7). Flow shown: launch → Home → Need a ride → choose destination on map → set radius/time window → Broadcast → Nearby inbox → open a match → Chat on WhatsApp handoff → Profile.

Not applicable in this build (so not shown):
- Account registration / login / account deletion — the app has no accounts or in-app sign-in.
- Paid content or IAP — the app is free with no purchases.
- User-generated content reporting/blocking as a social network — v1 shows demo nearby riders for the matching flow; users can Decline a card. Live matching and moderation tools ship in a later release.

---

## 2. Purpose and target audience
JunctionShare is a last-mile carpool helper for people around Princeton Junction and West Windsor (New Jersey), especially commuters finishing a train trip and needing a short ride home (or offering empty seats).

Problem: the short “station to home” stretch is awkward for traditional rideshare and hard to coordinate informally.

Value: in a few taps, a rider or driver broadcasts destination, match radius (~100 m–1 km), and a time window; sees nearby requests; then continues the conversation on WhatsApp when ready. Users stay in control of who they contact. This first App Store release includes demo nearby riders so reviewers and early users can walk the full flow while live geo matching rolls out.

Target audience: local adult commuters and neighbors near Princeton Junction / West Windsor who want a simple, free, non-marketplace carpool assistant—not a taxi, not a payment platform.

---

## 3. How to set up and use main features
No login credentials or sample files are required. Sign-in is not used.

Suggested review path (same as the screen recording):
1. Install JunctionShare from the submitted build (or TestFlight).
2. Launch the app → Home. Three demo nearby riders are visible. They stay inside the default match radius for 30 minutes from launch.
3. Tap **Need a ride** (or **Have seats**).
4. Search and tap a destination suggestion (map preview; Open in Google Maps available). Set radius and time window; optional note. Tap **Broadcast**. No location permission and no settings toggle are required.
5. From Home, open **Nearby** to see the demo rider/driver cards still inside the chosen radius. **End request** on Home stops your broadcast early.
6. Tap a card → **Interested** → Match screen → **Chat on WhatsApp** (opens WhatsApp / wa.me with a prefilled message). Or **Decline** to remove a card. Android’s system Back returns to the previous screen.
7. Profile (from Home, or from the create screen without losing the draft) can fill a WhatsApp number. Contacts permission is asked only after you tap **Use number from this phone** and pick one contact. Cancelling the picker does not read the address book.

Permissions you may see:
- Contacts — optional, and only after you ask to fill a WhatsApp number from a contact you pick.
- This build does not request location. Nearby cards are demo data.

Demo account: N/A (no accounts).

---

## 4. External services, tools, and platforms
- **Apple** — App Store / TestFlight distribution; the Contacts API via Expo, only after the user picks a contact.
- **Expo / EAS** — build and submit pipeline (Expo SDK).
- **Komoot Photon** (photon.komoot.io) — destination place suggestions when a Google Maps API key is not configured (current production default).
- **Google Maps / Places** (optional) — if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set: Places autocomplete + details; map preview via Google Maps embed/WebView; “Open in Google Maps” deep links. Without a key, Photon + Maps links still work.
- **WhatsApp** (wa.me / WhatsApp URL scheme) — handoff for chat after a match; no in-app messaging, no WhatsApp Business API in this build.
- **No** authentication provider, payment processor, ads SDK, or AI service in this build. Nearby inbox data in v1 is local demo content, not a live third-party rides network.

---

## 5. Regional differences
The app functions the same in all regions: same screens, permissions, and flows worldwide. Product focus and demo nearby data are oriented around Princeton Junction / West Windsor, NJ (USA). Destination search favors that area when using Photon/Google near those coordinates. There are no region-locked features, separate catalogs, or country-specific content packs.

---

## 6. Regulated industry / protected third-party material
JunctionShare is not a taxi, transportation carrier, payment, healthcare, or other highly regulated operator. It does not sell tickets or process ride payments. It does not include protected third-party media libraries beyond standard map link / optional Google Maps usage under Google’s terms. No special industry licenses or credentials apply to this MVP.

Support: https://futurestacklearnin.wixsite.com/rydio · hello@rydio.app · Review contact Sudeep Singh / +1 609-649-7802
