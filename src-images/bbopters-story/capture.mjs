import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = join(__dirname, '../../public/images/bbopters-story');

const pages = [
  { file: 'cover.html', out: 'cover.png', w: 1200, h: 630 },
  { file: 'bbojjak-stats.html', out: 'bbojjak-stats.png', w: 1200, h: 460 },
  { file: 'webinar-impact.html', out: 'webinar-impact.png', w: 1200, h: 360 },
  { file: 'team-structure.html', out: 'team-structure.png', w: 1200, h: 680 },
  { file: 'hatch-50.html', out: 'hatch-50.png', w: 1200, h: 400 },
  { file: 'timeline.html', out: 'timeline.png', w: 1200, h: 500 },
  { file: 'machines.html', out: 'machines.png', w: 1200, h: 460 },
];

async function capture() {
  const browser = await chromium.launch();

  for (const p of pages) {
    const page = await browser.newPage({
      viewport: { width: p.w, height: p.h },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${join(__dirname, p.file)}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, p.out), type: 'png' });
    console.log(`✓ ${p.out}`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone!');
}

capture().catch(console.error);
