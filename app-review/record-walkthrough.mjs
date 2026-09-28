import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;
const FINAL_MP4 = path.join(OUT_DIR, 'junctionshare-review-walkthrough.mp4');
const VIDEO_DIR = path.join(OUT_DIR, 'video-raw');
const HTML = path.join(OUT_DIR, 'walkthrough.html');
const CHROME = '/usr/bin/google-chrome';

const W = 430;
const H = 932;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function click(page, selector, pauseAfter = 900) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ delay: 50 });
  await sleep(pauseAfter);
}

async function run() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  for (const f of fs.readdirSync(VIDEO_DIR)) {
    fs.unlinkSync(path.join(VIDEO_DIR, f));
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: W, height: H },
    },
  });

  const page = await context.newPage();
  await page.goto('file://' + HTML, { waitUntil: 'networkidle' });
  await sleep(500);

  // TITLE CARD (~5.5s)
  await sleep(5500);

  // Launch into Home
  await page.evaluate(() => window.__jsWalkthrough.launch());
  await sleep(2800);

  // Home linger
  await sleep(2500);

  // Need a ride → Create
  await click(page, '#nav-need-ride', 2200);

  // Create screen: read destination / map
  await sleep(1800);
  await click(page, '.chip-radius[data-val="500m"]', 900);
  await click(page, '.chip-radius[data-val="100m"]', 900);
  await click(page, '.chip-window[data-val="30 min"]', 900);
  await click(page, '.chip-window[data-val="15 min"]', 1100);

  // Scroll to Broadcast
  await page.locator('#nav-broadcast').scrollIntoViewIfNeeded();
  await sleep(1000);
  await click(page, '#nav-broadcast', 2800); // toast + auto home

  // Home after broadcast
  await sleep(2000);

  // Nearby inbox
  await click(page, '#nav-inbox', 2400);
  await sleep(2000);

  // Interested → Match
  await click(page, '#nav-interested', 2200);
  await sleep(2000);

  // WhatsApp
  await click(page, '#nav-whatsapp', 2500);

  // Profile
  await click(page, '#nav-to-profile', 2400);
  await sleep(3000);

  // Back to home ending
  await click(page, '#profile-back', 2500);
  await sleep(2200);

  const video = page.video();
  await page.close();
  const rawPath = await video.path();
  await context.close();
  await browser.close();

  console.log('Raw video:', rawPath);

  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', rawPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-level', '4.0',
      '-crf', '18',
      '-preset', 'medium',
      '-movflags', '+faststart',
      '-an',
      FINAL_MP4,
    ];
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (d) => { err += d.toString(); });
    ff.on('close', (code) => {
      if (code !== 0) reject(new Error('ffmpeg failed: ' + err.slice(-800)));
      else resolve();
    });
  });

  const st = fs.statSync(FINAL_MP4);
  console.log('FINAL:', FINAL_MP4, 'bytes=', st.size);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
