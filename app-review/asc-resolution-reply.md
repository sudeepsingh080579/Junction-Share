# App Store Connect — Resolution Center reply + App Review Notes
App: JunctionShare (com.junctionshare.app) · ASC 6816251878 · Version 1.0.1

Paste the sections below into (1) Resolution Center reply and (2) App Review Information → Notes.

---

## 1. Screen recording
[ATTACH: physical-device screen recording — launch through the usual flow]
Recording captured on a physical iPhone running the current iOS, using the submitted build. Flow shown: launch → Home → Need a ride → choose destination on map → set radius/time window → Broadcast → Nearby inbox → open a match → Chat on WhatsApp handoff → Profile → Save.

Not applicable in this build (so not shown):
- Email registration / login / account deletion — there is no email or password. The app creates an anonymous session when someone saves a profile or broadcasts.
- Paid content or IAP — the app is free with no purchases.
- A public social feed — nearby cards are ride requests from other people using the app. They expire with the time window. Decline removes a card from your inbox.

A single phone shows an empty Nearby inbox. Two phones near each other, broadcasting opposite roles, are required before a card appears.

---

## 2. Purpose and target audience
JunctionShare is a last-mile carpool helper for people around Princeton Junction and West Windsor (New Jersey), especially commuters finishing a train trip and needing a short ride home (or offering empty seats).

Problem: the short “station to home” stretch is awkward for traditional rideshare and hard to coordinate informally.

Value: in a few taps, a rider or driver broadcasts destination, match radius (~100 m–1 km), and a time window; sees nearby requests from other people using the app; then continues the conversation on WhatsApp when ready. Users stay in control of who they contact. A request leaves the service when its time window ends.

Target audience: local adult commuters and neighbors near Princeton Junction / West Windsor who want a simple, free, non-marketplace carpool assistant—not a taxi, not a payment platform.

---

## 3. How to set up and use main features
No login credentials are required. There is no sign-in form.

Suggested review path (same as the screen recording):
1. Install JunctionShare from the submitted build.
2. Launch the app → Home. Nearby is empty until you broadcast and someone nearby has the opposite request.
3. Open Profile and tap **Save** after entering a first name and WhatsApp number. An invalid number shows an error and is not saved. A valid save shows a confirmation.
4. Tap **Need a ride** (or **Have seats**).
5. Search and tap a destination suggestion (map preview; Open in Google Maps available). Set radius and time window; optional note. Tap **Broadcast**.
6. The system asks for location While Using the App, then JunctionShare explains Always and asks the system to upgrade to Always. Always keeps the request’s coordinates current in the background only while that request is active, so people nearby can still see it if you move. If you deny location, the app explains why and offers Settings. Home and Profile stay available.
7. On a second phone near the first, save a profile and broadcast the opposite role. Each inbox then shows the other request (first name, approximate distance, destination). **End request** on Home stops your broadcast early.
8. Tap a card → **Interested**. When both people tap Interested, the Match screen shows the WhatsApp number. **Chat on WhatsApp** opens WhatsApp / wa.me with a prefilled message. Or **Decline** to remove a card. Android’s system Back returns to the previous screen.
9. The app does not read contacts.

Permissions you may see:
- Location While Using, then Always. Background location is used only during an active request and stops when the request ends or expires.
- No contacts permission. No motion permission.

Account for review: not applicable (no email account).

---

## 4. External services, tools, and platforms
- **Apple** — App Store distribution.
- **Expo / EAS** — build and submit pipeline (Expo SDK).
- **Supabase** — anonymous session plus Postgres functions for live nearby matching. Requests and coordinates are deleted after the time window. Phone numbers are returned only after mutual interest.
- **Komoot Photon** (photon.komoot.io) — destination place suggestions when a Google Maps API key is not configured (current production default).
- **Google Maps / Places** (optional) — if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set: Places autocomplete + details; map preview via Google Maps embed/WebView; “Open in Google Maps” deep links. Without a key, Photon + Maps links still work.
- **WhatsApp** (wa.me / WhatsApp URL scheme) — handoff for chat after a match. This build does not send WhatsApp template messages.
- **No** payment processor, ads SDK, or AI service.

---

## 5. Regional differences
The app functions the same in all regions: same screens, permissions, and flows worldwide. Product focus is Princeton Junction / West Windsor, NJ (USA). Destination search favors that area when using Photon/Google near those coordinates. There are no region-locked features, separate catalogs, or country-specific content packs.

---

## 6. Regulated industry / protected third-party material
JunctionShare is not a taxi, transportation carrier, payment, healthcare, or other highly regulated operator. It does not sell tickets or process ride payments. It does not include protected third-party media libraries beyond standard map link / optional Google Maps usage under Google’s terms. No special industry licenses or credentials apply.

Support: https://futurestacklearnin.wixsite.com/rydio · hello@rydio.app · Review contact Sudeep Singh / +1 609-649-7802
