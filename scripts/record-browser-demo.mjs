#!/usr/bin/env node
/**
 * Playwright Browser Demo Recording
 *
 * Records a walkthrough of the CVERiskPilot web app for Product Hunt / social media.
 * Outputs .webm video to social/assets/
 *
 * Usage:
 *   node scripts/record-browser-demo.mjs                    # record against localhost:3000
 *   node scripts/record-browser-demo.mjs --url https://cveriskpilot.com  # record against prod
 *
 * Requirements:
 *   npx playwright install chromium
 */

import { chromium } from "@playwright/test";
import { resolve } from "path";

const args = process.argv.slice(2);
const urlFlagIdx = args.indexOf("--url");
const baseUrl = urlFlagIdx >= 0 && args[urlFlagIdx + 1] ? args[urlFlagIdx + 1] : "http://localhost:3000";

const outDir = resolve("/home/gonti/cveriskpilot/social/assets");
const videoPath = resolve(outDir, "browser-demo");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function smoothScroll(page, distance, duration = 1500) {
  const steps = 30;
  const stepSize = distance / steps;
  const stepDelay = duration / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepSize);
    await sleep(stepDelay);
  }
}

async function main() {
  console.log(`Recording browser demo against: ${baseUrl}`);
  console.log(`Output directory: ${videoPath}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: videoPath,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: "dark",
  });

  const page = await context.newPage();

  try {
    // ═══ Scene 1: Landing Page (8s) ═══
    console.log("Scene 1: Landing page...");
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    await sleep(3000);

    // Scroll to hero stats
    await smoothScroll(page, 400, 1500);
    await sleep(2000);

    // Scroll to features section
    await smoothScroll(page, 600, 2000);
    await sleep(2000);

    // ═══ Scene 2: Pipeline Section (5s) ═══
    console.log("Scene 2: Pipeline section...");
    await smoothScroll(page, 600, 2000);
    await sleep(3000);

    // ═══ Scene 3: Pricing (5s) ═══
    console.log("Scene 3: Pricing...");
    await smoothScroll(page, 800, 2000);
    await sleep(3000);

    // ═══ Scene 4: Docs Hub (5s) ═══
    console.log("Scene 4: Docs hub...");
    await page.goto(`${baseUrl}/docs`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(3000);

    // ═══ Scene 5: Pipeline Setup Guide (8s) ═══
    console.log("Scene 5: Pipeline docs...");
    await page.goto(`${baseUrl}/docs/pipeline`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(2000);
    await smoothScroll(page, 500, 2000);
    await sleep(2000);
    await smoothScroll(page, 500, 2000);
    await sleep(2000);

    // ═══ Scene 6: CLI Reference (6s) ═══
    console.log("Scene 6: CLI Reference...");
    await page.goto(`${baseUrl}/docs/cli`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(2000);
    await smoothScroll(page, 600, 2000);
    await sleep(2000);

    // ═══ Scene 7: GitHub Action (6s) ═══
    console.log("Scene 7: GitHub Action...");
    await page.goto(`${baseUrl}/docs/github-action`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(2000);
    await smoothScroll(page, 600, 2000);
    await sleep(2000);

    // ═══ Scene 8: Demo Dashboard (10s) ═══
    console.log("Scene 8: Demo dashboard...");
    await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(3000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);

    // ═══ Scene 9: Signup (3s) ═══
    console.log("Scene 9: Signup...");
    await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle", timeout: 15000 });
    await sleep(3000);

    console.log("Recording complete.");
  } catch (err) {
    console.error("Error during recording:", err.message);
  }

  // Close to finalize video
  await page.close();
  await context.close();
  await browser.close();

  console.log(`\nVideo saved to: ${videoPath}/`);
  console.log("Look for the .webm file in that directory.");
  console.log("\nTo convert to MP4 (if ffmpeg available):");
  console.log(`  ffmpeg -i ${videoPath}/*.webm -c:v libx264 -crf 23 social/assets/browser-demo.mp4`);
}

main().catch(console.error);
