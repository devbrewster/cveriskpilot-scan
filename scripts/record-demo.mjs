import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'graphics');

async function record() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  // Navigate to demo dashboard
  await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Slow scroll through the entire dashboard
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = 3;
  const delay = 30;

  for (let y = 0; y < scrollHeight; y += step) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(delay);
  }

  // Pause at bottom
  await page.waitForTimeout(2000);

  // Scroll back up
  for (let y = scrollHeight; y >= 0; y -= step * 2) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(delay);
  }

  await page.waitForTimeout(1500);

  await context.close();
  await browser.close();

  console.log(`Video saved to ${outputDir}`);
}

record().catch((err) => {
  console.error(err);
  process.exit(1);
});
