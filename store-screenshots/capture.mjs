import pkg from '/tmp/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlDir = path.join(__dirname, 'html');
const outDir = __dirname;

const screens = [
  { file: '01-home.html', out: '01-home.png' },
  { file: '02-create-request.html', out: '02-create-request.png' },
  { file: '03-inbox.html', out: '03-inbox.png' },
  { file: '04-match.html', out: '04-match.png' },
  { file: '05-profile.html', out: '05-profile.png' },
];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
});

const page = await context.newPage();

for (const s of screens) {
  const url = pathToFileURL(path.join(htmlDir, s.file)).href;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const outPath = path.join(outDir, s.out);
  await page.screenshot({
    path: outPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 430, height: 932 },
  });
  console.log('wrote', outPath);
}

await browser.close();
console.log('done');
