# JunctionShare — App Review recording notes

**File:** `junctionshare-review-walkthrough.mp4`  
**Generated:** 2026-09-27 (America/New_York)  
**Source UI:** Store HTML mockups at `store-screenshots/html/` (`01-home` … `05-profile`) — same screens used for App Store screenshots, matching TestFlight **1.0.0 (7)**.

## What this is

Apple asked for a **physical-device** screen recording of the app. We do not have access to the reviewer’s (or developer’s) iPhone in this environment, so this MP4 is an **autonomous UI walkthrough substitute** built from those mockups:

1. Title card: “JunctionShare — App Review Walkthrough (iOS UI)”
2. Launch → **Home**
3. **Need a ride** → create request (destination, map preview, radius/window chips)
4. **Broadcast** (toast) → return Home
5. **Nearby inbox** → **Interested** on Alex
6. **Match** → Chat on WhatsApp affordance
7. **Profile / safety** → back to Home

Recorded with headless Chrome + Playwright `recordVideo`, then re-encoded to **H.264 / yuv420p** for QuickTime.

Phone frame: **430×932**. Interactive clicks and slide transitions (not a silent slideshow-only export).

## If Apple rejects this

Re-record on a **real iPhone** from **TestFlight build 1.0.0 (7)** (or the submitted build), capturing the same flow on-device, and re-attach that physical-device recording in App Store Connect / Resolution Center.

## Reproduce locally

```bash
cd app-review
# requires playwright-core + Playwright ffmpeg + /usr/bin/google-chrome + system ffmpeg
node record-walkthrough.mjs
```

Interactive demo page (for manual click-through): `walkthrough.html`
