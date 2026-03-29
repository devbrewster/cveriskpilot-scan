#!/usr/bin/env node

/**
 * Scheduled X Publisher
 *
 * Publishes posts from a batch queue file at scheduled intervals.
 * Each post has a `scheduled_offset_hours` field that determines
 * when it should be posted relative to the start time.
 *
 * Usage:
 *   node scripts/scheduled-x-publish.mjs                         # publish batch
 *   node scripts/scheduled-x-publish.mjs --dry-run               # preview only
 *   node scripts/scheduled-x-publish.mjs --file <queue-file>     # specific file
 *   node scripts/scheduled-x-publish.mjs --start-index 3         # resume from post #3
 *   node scripts/scheduled-x-publish.mjs --interval 120          # override to 120 min
 */

import { TwitterApi } from "twitter-api-v2";
import fs from "node:fs";
import path from "node:path";

const root = "/home/gonti/cveriskpilot";
const envPath = path.join(root, ".env.local");
const defaultBatchFile = path.join(root, "social/queue/w16-trending-batch.json");
const publishedDir = path.join(root, "social/published");
const logDir = path.join(root, "social/logs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing env file: ${filePath}`);
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    env[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
  }
  return env;
}

function getXClient() {
  const env = loadEnvFile(envPath);
  const required = ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) throw new Error(`Missing X credentials: ${missing.join(", ")}`);
  return new TwitterApi({
    appKey: env.X_API_KEY,
    appSecret: env.X_API_KEY_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessSecret: env.X_ACCESS_TOKEN_SECRET,
  });
}

function parseArgs(argv) {
  const opts = { dryRun: false, file: defaultBatchFile, startIndex: 0, intervalMin: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") { opts.dryRun = true; continue; }
    if (argv[i] === "--file") { opts.file = argv[++i]; continue; }
    if (argv[i] === "--start-index") { opts.startIndex = parseInt(argv[++i], 10); continue; }
    if (argv[i] === "--interval") { opts.intervalMin = parseInt(argv[++i], 10); continue; }
    throw new Error(`Unknown arg: ${argv[i]}`);
  }
  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);

  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `${ts.slice(0, 10)}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify({ ts, msg }) + "\n");
}

function archivePost(post, tweetId, username) {
  fs.mkdirSync(publishedDir, { recursive: true });
  const archived = {
    ...post,
    status: "published",
    platforms: {
      x: {
        ...post.platforms.x,
        status: "published",
        post_id: tweetId,
        published_at: new Date().toISOString(),
        url: `https://x.com/${username}/status/${tweetId}`,
      },
    },
  };
  const outPath = path.join(publishedDir, `${post.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(archived, null, 2) + "\n");
  return outPath;
}

function updateBatchFile(filePath, posts) {
  fs.writeFileSync(filePath, JSON.stringify(posts, null, 2) + "\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const posts = JSON.parse(fs.readFileSync(opts.file, "utf8"));

  if (!Array.isArray(posts)) throw new Error("Batch file must be a JSON array of posts");

  const pending = posts.filter((p) => p.platforms?.x?.status === "ready");
  const queue = pending.slice(opts.startIndex);

  log(`Loaded ${posts.length} posts, ${pending.length} ready, starting from index ${opts.startIndex}`);
  log(`Will publish ${queue.length} posts${opts.dryRun ? " (DRY RUN)" : ""}`);

  if (queue.length === 0) {
    log("Nothing to publish.");
    return;
  }

  let client = null;
  let username = null;

  if (!opts.dryRun) {
    client = getXClient();
    const me = await client.v2.me();
    username = me.data.username;
    log(`Authenticated as @${username}`);
  }

  for (let i = 0; i < queue.length; i++) {
    const post = queue[i];
    const content = post.platforms.x.content.trim();
    const charCount = content.length;

    if (charCount > 280) {
      log(`SKIP ${post.id}: ${charCount} chars exceeds 280 limit`);
      continue;
    }

    // Wait for interval (skip for first post)
    if (i > 0) {
      // eslint-disable-next-line no-unused-vars
      const _intervalMin = opts.intervalMin ?? (post.scheduled_offset_hours ?? 2) * 60 / (i > 0 ? 1 : 1);
      // Calculate wait based on offset difference from previous post
      const prevOffset = queue[i - 1].scheduled_offset_hours ?? (i - 1) * 2;
      const currOffset = post.scheduled_offset_hours ?? i * 2;
      const waitHours = currOffset - prevOffset;
      const waitMs = (opts.intervalMin ? opts.intervalMin : waitHours * 60) * 60 * 1000;

      log(`Waiting ${opts.intervalMin ? opts.intervalMin + " min" : waitHours + " hours"} before posting ${post.id}...`);

      if (opts.dryRun) {
        log(`DRY RUN: would wait ${waitMs / 1000 / 60} minutes`);
      } else {
        await sleep(waitMs);
      }
    }

    if (opts.dryRun) {
      log(`DRY RUN [${i + 1}/${queue.length}] ${post.id}: ${charCount}/280 chars`);
      log(`  Content: ${content.slice(0, 80)}...`);
      continue;
    }

    try {
      const payload = { text: content };

      if (post.image_asset) {
        const mediaPath = path.join(root, post.image_asset);
        if (fs.existsSync(mediaPath)) {
          const mediaId = await client.v1.uploadMedia(mediaPath);
          payload.media = { media_ids: [mediaId] };
          log(`Uploaded media: ${post.image_asset}`);
        } else {
          log(`WARN: image_asset not found: ${post.image_asset}, posting without image`);
        }
      }

      const result = await client.v2.tweet(payload);
      const tweetId = result.data.id;
      const url = `https://x.com/${username}/status/${tweetId}`;

      // Mark as published in batch file
      post.status = "published";
      post.platforms.x.status = "published";
      post.platforms.x.post_id = tweetId;
      post.platforms.x.published_at = new Date().toISOString();
      updateBatchFile(opts.file, posts);

      // Archive
      const archivedPath = archivePost(post, tweetId, username);

      log(`PUBLISHED [${i + 1}/${queue.length}] ${post.id}: ${url}`);
      log(`  Archived: ${archivedPath}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`ERROR ${post.id}: ${errMsg}`);
      post.platforms.x.status = "error";
      post.platforms.x.error = errMsg;
      post.platforms.x.last_error_at = new Date().toISOString();
      updateBatchFile(opts.file, posts);
    }
  }

  log("Batch complete.");
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
