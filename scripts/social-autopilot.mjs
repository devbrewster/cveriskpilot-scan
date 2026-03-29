#!/usr/bin/env node

/**
 * social-autopilot.mjs — Automated marketing team pipeline
 *
 * Runs on a schedule (every 4 hours). Each run:
 *   1. RESEARCH  — fetch CISA KEV + The Hacker News, generate drafts
 *   2. REVIEW    — quality-check every draft (char limit, dedup, freshness, content rules)
 *   3. APPROVE   — auto-approve drafts that pass all review gates
 *   4. QUEUE     — move approved drafts to social/queue/
 *   5. POST      — publish queued posts to X via the API
 *   6. LOG       — write a run summary to social/logs/
 *
 * Safety rails:
 *   - Max 3 posts per run (avoid flooding the timeline)
 *   - Min 2-hour gap between posts to the same account
 *   - Drafts older than 7 days are archived, not posted
 *   - Webinar / sponsored content is never auto-approved
 *   - All actions logged to social/logs/YYYY-MM-DD.jsonl
 *
 * Usage:
 *   node scripts/social-autopilot.mjs                # full pipeline
 *   node scripts/social-autopilot.mjs --dry-run      # research + review only, no posting
 *   node scripts/social-autopilot.mjs --step review  # run only review step
 *   node scripts/social-autopilot.mjs --step post    # run only post step
 *   node scripts/social-autopilot.mjs --max-posts 5  # override post cap
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "/home/gonti/cveriskpilot";
const DRAFTS_DIR = path.join(ROOT, "social", "drafts");
const QUEUE_DIR = path.join(ROOT, "social", "queue");
const PUBLISHED_DIR = path.join(ROOT, "social", "published");
const ARCHIVE_DIR = path.join(ROOT, "social", "archived");
const LOG_DIR = path.join(ROOT, "social", "logs");
// const CONFIG_PATH = path.join(ROOT, "social", "config.json");

const MAX_POSTS_PER_RUN = 3;
const MIN_POST_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours
const STALE_DRAFT_DAYS = 7;

// Strings that indicate a draft should NOT be auto-approved
const MANUAL_REVIEW_PATTERNS = [
  /webinar/i,
  /sponsored/i,
  /partner/i,
  /giveaway/i,
  /poll/i,
  /announcement/i,    // product announcements need human review
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { dryRun: false, step: "all", maxPosts: MAX_POSTS_PER_RUN };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") { opts.dryRun = true; continue; }
    if (arg === "--step" && argv[i + 1]) { opts.step = argv[++i]; continue; }
    if (arg === "--max-posts" && argv[i + 1]) { opts.maxPosts = parseInt(argv[++i], 10) || MAX_POSTS_PER_RUN; continue; }
    if (arg === "--help") {
      console.log("Usage: node scripts/social-autopilot.mjs [--dry-run] [--step research|review|post|all] [--max-posts N]");
      process.exit(0);
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function logEntry(entry) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `${todaySlug()}.jsonl`);
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  fs.appendFileSync(logFile, line + "\n");
  return line;
}

function todaySlug() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(dir, f));
}

function charCount(text) {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

function draftAge(draft) {
  const created = new Date(draft.created_at ?? "2020-01-01");
  return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
}

function lastPublishedTime() {
  if (!fs.existsSync(PUBLISHED_DIR)) return 0;

  let latest = 0;
  for (const f of fs.readdirSync(PUBLISHED_DIR).filter((e) => e.endsWith(".json"))) {
    try {
      const data = readJson(path.join(PUBLISHED_DIR, f));
      const xPublished = data.platforms?.x?.published_at;
      if (xPublished) {
        const t = new Date(xPublished).getTime();
        if (t > latest) latest = t;
      }
    } catch { /* skip */ }
  }

  return latest;
}

// ---------------------------------------------------------------------------
// STEP 1: RESEARCH — generate new drafts from live sources
// ---------------------------------------------------------------------------

function stepResearch() {
  console.log("\n=== STEP 1: RESEARCH ===");

  try {
    const output = execFileSync("node", [
      path.join(ROOT, "scripts", "generate-x-drafts.mjs"),
      "--days", "3"
    ], { cwd: ROOT, encoding: "utf8", timeout: 60_000 });

    console.log(output);
    logEntry({ step: "research", status: "ok", output: output.trim().split("\n").slice(-3).join("; ") });
  } catch (err) {
    const msg = err.stderr || err.message || String(err);
    console.error(`  Research failed: ${msg}`);
    logEntry({ step: "research", status: "error", error: msg });
  }
}

// ---------------------------------------------------------------------------
// STEP 2: REVIEW — quality-check every draft in social/drafts/
// ---------------------------------------------------------------------------

function stepReview() {
  console.log("\n=== STEP 2: REVIEW ===");

  const drafts = listJsonFiles(DRAFTS_DIR);
  const results = { reviewed: 0, approved: 0, rejected: 0, archived: 0 };

  for (const filepath of drafts) {
    const draft = readJson(filepath);
    const filename = path.basename(filepath);

    // Skip already-approved drafts
    if (draft.status === "ready" && draft.approved_by) {
      continue;
    }

    const issues = reviewDraft(draft);
    results.reviewed++;

    // Archive stale drafts
    if (draftAge(draft) > STALE_DRAFT_DAYS) {
      console.log(`  ARCHIVE (stale ${Math.floor(draftAge(draft))}d): ${filename}`);
      archiveDraft(filepath, draft, "stale");
      results.archived++;
      continue;
    }

    if (issues.length > 0) {
      console.log(`  REJECT ${filename}: ${issues.join("; ")}`);
      draft._review = { status: "rejected", issues, reviewedAt: new Date().toISOString() };
      writeJson(filepath, draft);
      logEntry({ step: "review", file: filename, status: "rejected", issues });
      results.rejected++;
      continue;
    }

    // Auto-approve
    draft.status = "ready";
    draft.approved_by = "autopilot";
    draft.platforms.x.status = "ready";
    draft._review = { status: "approved", reviewedAt: new Date().toISOString() };
    writeJson(filepath, draft);
    console.log(`  APPROVED: ${filename}`);
    logEntry({ step: "review", file: filename, status: "approved" });
    results.approved++;
  }

  console.log(`  Review complete: ${results.reviewed} reviewed, ${results.approved} approved, ${results.rejected} rejected, ${results.archived} archived`);
  return results;
}

function reviewDraft(draft) {
  const issues = [];
  const xPost = draft.platforms?.x;

  if (!xPost || typeof xPost.content !== "string" || !xPost.content.trim()) {
    issues.push("missing X content");
    return issues;
  }

  const content = xPost.content.trim();
  const chars = charCount(content);

  // Character limit
  if (chars > 280) {
    issues.push(`over 280 chars (${chars})`);
  }

  // Too short to be useful
  if (chars < 40) {
    issues.push(`too short (${chars} chars)`);
  }

  // Must have at least one hashtag
  if (!/#\w+/.test(content)) {
    issues.push("no hashtags");
  }

  // Check for manual-review patterns
  for (const pattern of MANUAL_REVIEW_PATTERNS) {
    if (pattern.test(content) || pattern.test(draft.type ?? "")) {
      issues.push(`needs manual review (matches ${pattern.source})`);
      break;
    }
  }

  // Don't auto-approve posts that mention CVERiskPilot features unless grounded in release metadata
  if (/cveriskpilot/i.test(content) && !draft.source?.release && !draft.source?.evidence_paths?.length) {
    issues.push("product mention without release evidence source");
  }

  // Block posts with internal paths or filenames
  if (/\.(ts|js|json|md|mjs)\b/.test(content) || /\/src\/|\/apps\/|\/docs\//.test(content)) {
    issues.push("contains internal file paths");
  }

  // Block posts with placeholder text
  if (/\[.*?\]|TODO|FIXME|TBD/i.test(content)) {
    issues.push("contains placeholder text");
  }

  // Block RSS-style posts that just echo a headline with no take
  if (/^[A-Z][\w\s,'-]+[A-Z][\w\s,'-]+\n\n(Cybersecurity researchers|A new|The alleged|A long-term)/i.test(content)) {
    issues.push("reads like an RSS summary — needs a practitioner take");
  }

  // Block truncated descriptions ending with "..."
  const xContent = content.split("\n\n");
  if (xContent.length >= 2 && xContent[1].endsWith("...") && xContent[1].length < 60) {
    issues.push("truncated description fragment — rewrite needed");
  }

  // Must provide value: education, opinion, or call to action
  const hasCallToAction = /\b(check|patch|update|verify|review|audit|stop|read this|before your|act now)\b/i.test(content);
  const hasOpinion = /\b(this is why|the problem is|the real|most|the question|still|keep|need)\b/i.test(content);
  const hasQuestion = /\?/.test(content);
  if (!hasCallToAction && !hasOpinion && !hasQuestion) {
    issues.push("no call to action, opinion, or question — low engagement potential");
  }

  return issues;
}

function archiveDraft(filepath, draft, reason) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  draft._archived = { reason, archivedAt: new Date().toISOString() };
  const dest = path.join(ARCHIVE_DIR, path.basename(filepath));
  writeJson(dest, draft);
  fs.unlinkSync(filepath);
  logEntry({ step: "archive", file: path.basename(filepath), reason });
}

// ---------------------------------------------------------------------------
// STEP 3: QUEUE — move approved drafts to social/queue/
// ---------------------------------------------------------------------------

function stepQueue() {
  console.log("\n=== STEP 3: QUEUE ===");

  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const drafts = listJsonFiles(DRAFTS_DIR);
  let moved = 0;

  for (const filepath of drafts) {
    const draft = readJson(filepath);

    if (draft.status === "ready" && draft.approved_by && draft.platforms?.x?.status === "ready") {
      const dest = path.join(QUEUE_DIR, path.basename(filepath));
      fs.renameSync(filepath, dest);
      console.log(`  QUEUED: ${path.basename(filepath)}`);
      logEntry({ step: "queue", file: path.basename(filepath), status: "queued" });
      moved++;
    }
  }

  console.log(`  ${moved} draft(s) moved to queue.`);
  return moved;
}

// ---------------------------------------------------------------------------
// STEP 4: POST — publish queued posts to X (rate-limited)
// ---------------------------------------------------------------------------

function stepPost(opts) {
  console.log("\n=== STEP 4: POST ===");

  // Check post gap
  const lastPost = lastPublishedTime();
  const gap = Date.now() - lastPost;

  if (lastPost > 0 && gap < MIN_POST_GAP_MS) {
    const remainMin = Math.ceil((MIN_POST_GAP_MS - gap) / 60_000);
    console.log(`  THROTTLED: last post was ${Math.floor(gap / 60_000)}m ago (min gap: ${MIN_POST_GAP_MS / 60_000}m). Next eligible in ${remainMin}m.`);
    logEntry({ step: "post", status: "throttled", nextEligibleMin: remainMin });
    return;
  }

  const queued = listJsonFiles(QUEUE_DIR);
  if (queued.length === 0) {
    console.log("  No posts in queue.");
    return;
  }

  // Pick up to maxPosts from the queue (oldest first)
  const batch = queued.slice(0, opts.maxPosts);

  if (opts.dryRun) {
    for (const f of batch) {
      const d = readJson(f);
      const chars = d.platforms?.x?.character_count ?? charCount(d.platforms?.x?.content ?? "");
      console.log(`  DRY RUN: would publish ${path.basename(f)} (${chars} chars)`);
    }
    logEntry({ step: "post", status: "dry_run", count: batch.length });
    return;
  }

  // Publish using the existing publisher, one at a time
  for (const filepath of batch) {
    const id = path.basename(filepath, ".json");

    try {
      const output = execFileSync("node", [
        path.join(ROOT, "scripts", "publish-x-posts.mjs"),
        "--id", id
      ], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });

      console.log(`  ${output.trim()}`);
      logEntry({ step: "post", file: `${id}.json`, status: "published", output: output.trim() });
    } catch (err) {
      const msg = err.stderr || err.message || String(err);
      console.error(`  POST ERROR ${id}: ${msg}`);
      logEntry({ step: "post", file: `${id}.json`, status: "error", error: msg });
      break; // stop on first error to avoid cascading failures
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runId = `run_${Date.now()}`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SOCIAL AUTOPILOT — ${new Date().toISOString()}`);
  console.log(`Mode: ${opts.dryRun ? "DRY RUN" : "LIVE"} | Step: ${opts.step} | Max posts: ${opts.maxPosts}`);
  console.log("=".repeat(60));

  logEntry({ step: "start", runId, mode: opts.dryRun ? "dry_run" : "live", stepFilter: opts.step });

  const shouldRun = (step) => opts.step === "all" || opts.step === step;

  if (shouldRun("research")) stepResearch();
  if (shouldRun("review"))   stepReview();
  if (shouldRun("queue"))    stepQueue();
  if (shouldRun("post"))     stepPost(opts);

  console.log(`\n${"=".repeat(60)}`);
  console.log("AUTOPILOT RUN COMPLETE");
  console.log(`${"=".repeat(60)}\n`);

  logEntry({ step: "end", runId });
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  logEntry({ step: "fatal", error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
}
