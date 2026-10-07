# JunctionShare — Google Play listing & App content draft

Package: `com.junctionshare.app`  
Developer: FutureStack Services (Play account `8393362052242687862`)  
Sources: `store.config.json` (Apple listing copy), in-app UI strings, `app.json`, `src/**`  
Generated for Play Console reuse. Do not treat as a hosted privacy policy.

---

## 1. Store listing text

### App name (display name)
**JunctionShare**

### Short description (≤80 characters)
```
PJ last-mile carpool — need a ride or have seats, then WhatsApp
```
(63 chars)

Alternate (from Apple promo / subtitle vibe):
```
Find a nearby ride or empty seat after the train — WhatsApp next
```
(64 chars)

### Full description (≤4000 characters)
```
JunctionShare helps people around Princeton Junction and West Windsor share last-mile rides.

Need a ride or have seats? Broadcast a short request with your destination, how far you're willing to match (about 100m–1km), and a time window. See nearby requests, then continue the conversation on WhatsApp when you're ready to go.

Built for the train-to-home stretch: simple, local, and designed so you stay in control of who you contact.

• Need a ride or Have seats — pick your role on Home
• Choose destination on the map, match radius (100m / 500m / 1km), and a short time window
• Review Nearby requests, mark Interested or Decline
• Chat on WhatsApp — no in-app chat, accounts, or payments in this release

This first release uses demo nearby riders so you can try the full flow while live matching is rolled out.

Support: https://futurestacklearnin.wixsite.com/rydio · hello@rydio.app
```
(~890 chars; adapted from `store.config.json` → `apple.info.en-US.description` + Home/Match UI copy)

### Suggested keywords / tags (Play “tags” / search relevance, not a dedicated field)
carpool, rideshare, princeton junction, west windsor, commute, train, last mile, whatsapp

---

## 2. Category suggestion

| Preference | Play category | Why |
|---|---|---|
| **Primary (recommended)** | **Travel & Local** | Matches Apple primary `TRAVEL`; last-mile commute / local geography focus |
| Alternate | Maps & Navigation | Destination map search + location-aware matching framing |
| Avoid as primary | Social | Matching exists, but product is commute utility; Apple secondary was Social Networking |

**Recommendation:** Primary = **Travel & Local**.

---

## 3. Privacy policy

### URL already in the project?
- **Listed for Apple** in `store.config.json` → `apple.info.en-US.privacyPolicyUrl` (and same host as `supportUrl`):
  - `https://futurestacklearnin.wixsite.com/rydio`
- **Live page check (2026-10-07):** that URL is a **Rydio marketing / community-carpooling homepage**, not a JunctionShare (or Rydio) privacy policy document. No “Privacy Policy” body with data practices.
- **In-repo privacy policy file:** `play-store/privacy-policy.html` (also shown in-app from Profile).
- **Store URL in `store.config.json`:** `https://cdn.jsdelivr.net/gh/sudeepsingh080579/Junction-Share@master/play-store/privacy-policy.html`

### Hosting status
A dedicated JunctionShare privacy policy document now exists in-repo and in-app. Use the jsDelivr URL (or host the same HTML on your own domain) in Play Console. Do **not** submit the Rydio marketing homepage as the privacy policy.

### Key points a policy should cover (from code / product behavior)
- **No accounts, no payments** in MVP.
- **WhatsApp phone number:** entered on Profile or filled via Contacts picker; stored **on-device** with `expo-secure-store` under key `js_profile_phone`. Not uploaded to a JunctionShare backend in current code (MVP has no app server for profile).
- **Name / opt-ins:** `js_profile_name`, `js_profile_location_optin`, `js_profile_whatsapp_optin` also in Secure Store (device-local).
- **Location:** Android declares `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`; Profile toggle “Share location while requesting”; permission copy says location is used **only while a carpool request is active** to find nearby opted-in riders (~100m–1km). Current MVP inbox uses **demo/mock nearby riders** (`src/data/mockNearby.ts`); live GPS broadcast matching is not yet a backend.
- **Contacts:** `READ_CONTACTS` / expo-contacts — only to help fill WhatsApp number on Profile (picker / name match). Not used for uploading address books.
- **Destination search network:** query text may be sent to **Google Places** (if API key set) or **Photon (komoot)** geocoder; map preview may load Google Maps (WebView / links).
- **WhatsApp handoff:** opens `https://wa.me/<digits>?text=...` via system browser/WhatsApp — message content leaves the app.
- **No analytics / ads SDKs** in `package.json`.
- **Block / report:** UI hint says “lands later” — not implemented.

---

## 4. Graphics paths

### Icon / adaptive icon (`assets/`)
| File | Role | Size (observed) |
|---|---|---|
| `assets/icon.png` | App / store icon source | 1024×1024 |
| `assets/android-icon-foreground.png` | Adaptive foreground | 512×512 |
| `assets/android-icon-background.png` | Adaptive background | (paired with fg) |
| `assets/android-icon-monochrome.png` | Adaptive monochrome | — |
| `assets/splash-icon.png` | Splash | 1024×1024 |
| `assets/favicon.png` | Web favicon | small |

Play Console typically wants a **512×512** high-res icon (can export/downscale from `icon.png`).

### Feature graphic
`play-store/feature-graphic.png` (upload to Play Console).

### Screenshots (phone)
Phone-style captures (1290×2796) — good candidates for Play phone screenshots after any crop/letterbox to a supported ratio:

| Path | Screen |
|---|---|
| `store-screenshots/01-home.png` | Home — Need a ride / Have seats |
| `store-screenshots/02-create-request.png` | Create request / destination |
| `store-screenshots/03-inbox.png` | Nearby inbox |
| `store-screenshots/04-match.png` | Match → WhatsApp |
| `store-screenshots/05-profile.png` | Profile / safety |

Also: `store-screenshots/asc-1284/*.png` (1284×2778, Apple-oriented set).  
HTML mock sources: `store-screenshots/html/`.

---

## 5. Content rating — relevant facts

Use these when answering the IARC / Play questionnaire (do not invent extra risk factors):

| Topic | Fact for JunctionShare MVP |
|---|---|
| **Target age** | General / adult commuters; **not** designed for children; no Kids category |
| **User-generated content** | Optional free-text **Note** on create request; destination label; first name on profile. Nearby list is **demo data** in v1. No public feed/posts. Apple advisory had `userGeneratedContent: false` — Play may still ask about UGC/sharing; answer carefully: limited trip notes + match handoff, not a social network feed |
| **Social features** | Peer matching for carpools; not a general social network |
| **Location sharing** | Declared; opt-in toggle; intended while request active; MVP matching is mock |
| **Messaging / chat** | **No in-app chat.** Hands off to **WhatsApp** (`wa.me`) |
| **Ads** | **None** (`store.config.json` advertising: false; no ad SDKs) |
| **Payments / IAP** | **None** |
| **Alcohol / violence / sexual content / gambling** | None (Apple advisory all NONE / false) |
| **Unrestricted web access** | No general browser; WebView for map preview; external links to Maps / WhatsApp |

---

## 6. Data safety facts (from code)

### Permissions (`app.json` → `expo.android.permissions`)
- `ACCESS_COARSE_LOCATION` / `android.permission.ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION` / `android.permission.ACCESS_FINE_LOCATION`
- `READ_CONTACTS` / `android.permission.READ_CONTACTS`
- (React Native / Expo builds also need network for Maps/Places/Photon/WhatsApp links — typically `INTERNET` via the Expo template.)

iOS usage strings (intent, same product story): location while request active; contacts to fill WhatsApp on Profile.

### On-device storage (Secure Store — **not** AsyncStorage)
From `src/screens/ProfileScreen.tsx`:

| Key | Purpose |
|---|---|
| `js_profile_name` | First name |
| `js_profile_phone` | WhatsApp / phone display string |
| `js_profile_location_optin` | `"1"` / `"0"` share-location toggle |
| `js_profile_whatsapp_optin` | `"1"` / `"0"` WhatsApp alerts toggle |

Active ride request / inbox / match live in **React state** only (not persisted); inbox seeded from `MOCK_NEARBY`.

### Network calls
| Destination | When | Data |
|---|---|---|
| `maps.googleapis.com` Places Autocomplete + Details | Destination search **if** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `extra.googleMapsApiKey` set | Search query + PJ lat/lng bias |
| `photon.komoot.io/api/` | Destination search fallback / default when no Google key | Search query + PJ lat/lng |
| Google Maps Embed / search URLs | Map preview WebView or “open in Maps” | Place / lat-lng |
| `wa.me/<phone>?text=...` | Match → “Chat on WhatsApp” | Opens WhatsApp with prefilled greeting |

**No JunctionShare backend API** in current app code for accounts, payments, or uploading profile/location.

### Analytics / tracking / ads
- **None** in dependencies: no Firebase Analytics, Sentry, Amplitude, Mixpanel, ads, or App Tracking Transparency usage.
- `package.json` relevant libs: `expo-location`, `expo-contacts`, `expo-secure-store`, `react-native-webview`, `react-native-maps`, Expo 57.

### Data safety form — suggested high-level answers (verify before submit)
- **Collects:** Approximate/precise location (declared; purpose: find nearby carpool while request active — note MVP mock); phone number (on-device for WhatsApp); name (on-device); contacts (ephemeral use to fill phone — typically “not collected by developer” if never leave the device); app activity / destination search queries may hit Google/Photon.
- **Shared:** Not sold. WhatsApp receives message intent when user taps Chat. Geocoders receive search strings.
- **Encrypted in transit:** HTTPS for Places/Photon/Maps. Secure Store for local profile fields.
- **Users can request deletion:** Profile is local — clearing app data / uninstall removes Secure Store keys; no cloud account to delete yet.
- **Data collected before account creation:** N/A (no accounts).

---

## 7. Other Play Console fields (handy)

| Field | Value |
|---|---|
| Package name | `com.junctionshare.app` |
| Default language | English (United States) |
| App type | App |
| Free / paid | Free |
| Contains ads | No |
| Contact email (from Apple review block) | `hello@rydio.app` |
| Support / website (in project) | `https://futurestacklearnin.wixsite.com/rydio` |
| Copyright / org | FutureStack Services (2026) |

### Review / tester notes (from `store.config.json` review.notes)
JunctionShare is a last-mile carpool helper for Princeton Junction / West Windsor. Demo nearby riders appear in the inbox so review can walk Home → Need a ride → pick a destination on the map → Broadcast → Nearby → Match → WhatsApp. Location is used only while a request is active. Profile can fill a WhatsApp number from Contacts. No paid features.

---

## 8. Play Console steps remaining (outside this repo)

1. Confirm the privacy policy URL loads in a browser, then paste it into Play App content.
2. Upload `play-store/feature-graphic.png` and phone screenshots (`play-store/shots/` or `store-screenshots/*.png`).
3. Complete Data safety + Content rating using §5–§6.
4. Finish remaining Play account / app setup (store listing, target audience, news apps, etc.). New personal Play accounts may still need closed testing before production access.
