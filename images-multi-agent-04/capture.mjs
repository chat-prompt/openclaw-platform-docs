import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = '/Users/dahtmad/.openclaw/workspace-bboya/projects/bboya-viewer/public/images/multi-agent/ep-04';

const pages = [
  { src: 'architecture.html', out: 'architecture.png', w: 1280, h: 900 },
];

const browser = await chromium.launch();
for (const p of pages) {
  const page = await browser.newPage({
    viewport: { width: p.w, height: p.h },
    deviceScaleFactor: 2,
  });
  await page.goto(`file://${join(__dirname, p.src)}`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT_DIR, p.out), type: 'png' });
  console.log(`✓ ${p.out}`);
  await page.close();
}
await browser.close();
console.log('done');
