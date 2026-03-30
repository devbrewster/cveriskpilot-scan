#!/usr/bin/env node

/**
 * social-autopilot.mjs — ReACT Marketing Pipeline
 *
 * Implements a ReACT (Reason + Act) loop with a persistent feedback system:
 *
 *   OBSERVE  → Pull engagement metrics from published posts
 *   REASON   → Analyze what's working (types, topics, times) vs what isn't
 *   ACT      → Generate/review/post content, informed by feedback
 *   REFLECT  → Persist learnings to social/engagement/feedback.json
 *
 * Pipeline steps:
 *   1. OBSERVE  — fetch metrics for recent published posts (X API)
 *   2. REASON   — score content types, identify top/bottom performers, update feedback
 *   3. RESEARCH — fetch CISA KEV + The Hacker News, generate drafts
 *   4. REVIEW   — quality-check every draft (char limit, dedup, freshness, content rules)
 *   5. QUEUE    — move approved drafts to social/queue/
 *   6. POST     — publish queued posts to X via the API
 *   7. REFLECT  — write run summary + updated feedback signals
 *
 * Safety rails:
 *   - Max 3 posts per run (avoid flooding the timeline)
 *   - Min 2-hour gap between posts to the same account
 *   - Drafts older than 7 days are archived, not posted
 *   - Webinar / sponsored content is never auto-approved
 *   - All actions logged to social/logs/YYYY-MM-DD.jsonl
 *   - Feedback loop persists learnings across runs
 *
 * Usage:
 *   node scripts/social-autopilot.mjs                # full ReACT pipeline
 *   node scripts/social-autopilot.mjs --dry-run      # research + review only, no posting
 *   node scripts/social-autopilot.mjs --step review  # run only review step
 *   node scripts/social-autopilot.mjs --step observe # run only observe + reason steps
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
const ENGAGEMENT_DIR = path.join(ROOT, "social", "engagement");
const METRICS_DIR = path.join(ENGAGEMENT_DIR, "metrics");
const FEEDBACK_PATH = path.join(ENGAGEMENT_DIR, "feedback.json");

const MAX_POSTS_PER_RUN = 3;
const MIN_POST_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours
const STALE_DRAFT_DAYS = 7;

// Content type weights — baseline from config, adjusted by feedback
const DEFAULT_TYPE_WEIGHTS = {
  meme_humor: 0.30,
  building_in_public: 0.25,
  hot_takes: 0.20,
  product_updates: 0.15,
  engagement_bait: 0.10,
  education: 0.15,
  security: 0.15,
};

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
      console.log("Usage: node scripts/social-autopilot.mjs [--dry-run] [--step observe|research|review|post|all] [--max-posts N]");
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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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
// FEEDBACK — persistent learning state
// ---------------------------------------------------------------------------

function loadFeedback() {
  const defaults = {
    last_updated: null,
    total_posts_analyzed: 0,
    // Per-type engagement rates (running averages)
    type_performance: {},
    // Per-topic engagement signals
    topic_signals: {},
    // Best posting hours (EST)
    best_hours: {},
    // Content patterns that consistently perform above/below average
    winners: [],
    losers: [],
    // Running engagement stats
    avg_engagement_rate: 0,
    avg_impressions: 0,
    // Recommendations for next run (generated by REASON step)
    next_run_guidance: [],
    // History of reasoning outputs
    reason_log: [],
  };

  if (fs.existsSync(FEEDBACK_PATH)) {
    try {
      const saved = readJson(FEEDBACK_PATH);
      return { ...defaults, ...saved };
    } catch { /* corrupted, use defaults */ }
  }

  return defaults;
}

function saveFeedback(feedback) {
  feedback.last_updated = new Date().toISOString();
  writeJson(FEEDBACK_PATH, feedback);
}

// ---------------------------------------------------------------------------
// STEP 1: OBSERVE — pull metrics from published posts
// ---------------------------------------------------------------------------

function stepObserve() {
  console.log("\n=== STEP 1: OBSERVE ===");

  const published = listJsonFiles(PUBLISHED_DIR);
  const posts = [];

  for (const filepath of published) {
    try {
      const post = readJson(filepath);
      const xPlatform = post.platforms?.x;
      if (!xPlatform?.post_id || !xPlatform?.published_at) continue;

      // Try to find metrics for this post
      const metrics = findMetricsForPost(xPlatform.post_id);

      // Determine content type from all available signals
      const rawType = post.type ?? post.angle ?? "";
      const tagsStr = (post.tags ?? post.hashtags ?? []).join(" ");
      const typeFromTags = inferTypeFromTags(tagsStr);
      const resolvedType = normalizeType(rawType) !== "unknown"
        ? normalizeType(rawType)
        : (typeFromTags !== "unknown" ? typeFromTags : normalizeType(post.angle ?? ""));

      posts.push({
        id: post.id,
        file: path.basename(filepath),
        type: resolvedType,
        content: xPlatform.content?.slice(0, 80) ?? "",
        published_at: xPlatform.published_at,
        post_id: xPlatform.post_id,
        metrics: metrics ?? { like_count: 0, retweet_count: 0, reply_count: 0, impression_count: 0, bookmark_count: 0 },
        tags: post.tags ?? post.hashtags ?? [],
      });
    } catch { /* skip */ }
  }

  // Sort by published_at descending (newest first)
  posts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  console.log(`  Observed ${posts.length} published posts with metrics.`);
  logEntry({ step: "observe", posts_analyzed: posts.length });

  return posts;
}

function findMetricsForPost(postId) {
  // Search metrics files for this post ID
  if (!fs.existsSync(METRICS_DIR)) return null;

  const metricsFiles = fs.readdirSync(METRICS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse(); // newest first

  for (const file of metricsFiles) {
    try {
      const data = readJson(path.join(METRICS_DIR, file));
      const tweet = (data.tweets ?? []).find((t) => t.id === postId);
      if (tweet?.metrics) return tweet.metrics;
    } catch { /* skip */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// STEP 2: REASON — analyze patterns and update feedback
// ---------------------------------------------------------------------------

function stepReason(observedPosts) {
  console.log("\n=== STEP 2: REASON ===");

  const feedback = loadFeedback();
  const reasoning = [];

  if (observedPosts.length === 0) {
    console.log("  No posts to analyze. Skipping reasoning.");
    return feedback;
  }

  // --- Engagement rate by content type ---
  const typeStats = {};
  for (const post of observedPosts) {
    const type = normalizeType(post.type);
    if (!typeStats[type]) typeStats[type] = { posts: 0, impressions: 0, engagement: 0, likes: 0, replies: 0, retweets: 0 };
    const m = post.metrics;
    const engagement = (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0) + (m.bookmark_count ?? 0);
    typeStats[type].posts++;
    typeStats[type].impressions += m.impression_count ?? 0;
    typeStats[type].engagement += engagement;
    typeStats[type].likes += m.like_count ?? 0;
    typeStats[type].replies += m.reply_count ?? 0;
    typeStats[type].retweets += m.retweet_count ?? 0;
  }

  console.log("\n  Content Type Performance:");
  console.log("  Type                   Posts   Impr   Eng    Rate");
  console.log("  ---------------------  -----   -----  -----  -----");

  const typePerf = {};
  for (const [type, stats] of Object.entries(typeStats)) {
    const rate = stats.impressions > 0 ? (stats.engagement / stats.impressions * 100) : 0;
    typePerf[type] = {
      posts: stats.posts,
      impressions: stats.impressions,
      engagement: stats.engagement,
      engagement_rate: Math.round(rate * 100) / 100,
      likes: stats.likes,
      replies: stats.replies,
    };

    console.log(`  ${type.padEnd(23)} ${String(stats.posts).padStart(5)}   ${String(stats.impressions).padStart(5)}  ${String(stats.engagement).padStart(5)}  ${rate.toFixed(1)}%`);
  }

  feedback.type_performance = typePerf;

  // --- Best and worst performers ---
  const postsWithEngRate = observedPosts
    .filter((p) => (p.metrics.impression_count ?? 0) > 0)
    .map((p) => {
      const m = p.metrics;
      const eng = (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0);
      return {
        ...p,
        engagement_rate: eng / m.impression_count * 100,
        total_engagement: eng,
      };
    })
    .sort((a, b) => b.total_engagement - a.total_engagement);

  // Top 5 winners
  const winners = postsWithEngRate.slice(0, 5).map((p) => ({
    id: p.id,
    type: normalizeType(p.type),
    engagement: p.total_engagement,
    impressions: p.metrics.impression_count,
    rate: Math.round(p.engagement_rate * 100) / 100,
    snippet: p.content.slice(0, 60),
  }));

  // Bottom 5 (with at least some impressions)
  const losers = postsWithEngRate.slice(-5).reverse().map((p) => ({
    id: p.id,
    type: normalizeType(p.type),
    engagement: p.total_engagement,
    impressions: p.metrics.impression_count,
    rate: Math.round(p.engagement_rate * 100) / 100,
    snippet: p.content.slice(0, 60),
  }));

  feedback.winners = winners;
  feedback.losers = losers;

  if (winners.length > 0) {
    console.log("\n  Top performers:");
    for (const w of winners) {
      console.log(`    ${w.type.padEnd(20)} ${String(w.engagement).padStart(3)} eng  ${String(w.impressions).padStart(5)} impr  ${w.rate}%  "${w.snippet}..."`);
    }
  }

  if (losers.length > 0) {
    console.log("\n  Lowest performers:");
    for (const l of losers) {
      console.log(`    ${l.type.padEnd(20)} ${String(l.engagement).padStart(3)} eng  ${String(l.impressions).padStart(5)} impr  ${l.rate}%  "${l.snippet}..."`);
    }
  }

  // --- Posting time analysis ---
  const hourStats = {};
  for (const post of observedPosts) {
    const hour = new Date(post.published_at).getUTCHours();
    // Convert UTC to EST (UTC-5) roughly
    const estHour = (hour - 5 + 24) % 24;
    const bucket = `${String(estHour).padStart(2, "0")}:00`;
    if (!hourStats[bucket]) hourStats[bucket] = { posts: 0, impressions: 0, engagement: 0 };
    const m = post.metrics;
    hourStats[bucket].posts++;
    hourStats[bucket].impressions += m.impression_count ?? 0;
    hourStats[bucket].engagement += (m.like_count ?? 0) + (m.reply_count ?? 0) + (m.retweet_count ?? 0);
  }

  feedback.best_hours = hourStats;

  // --- Generate guidance for next run ---
  const guidance = [];

  // Find which types are outperforming
  const avgRate = postsWithEngRate.length > 0
    ? postsWithEngRate.reduce((s, p) => s + p.engagement_rate, 0) / postsWithEngRate.length
    : 0;

  feedback.avg_engagement_rate = Math.round(avgRate * 100) / 100;
  feedback.avg_impressions = observedPosts.length > 0
    ? Math.round(observedPosts.reduce((s, p) => s + (p.metrics.impression_count ?? 0), 0) / observedPosts.length)
    : 0;

  for (const [type, perf] of Object.entries(typePerf)) {
    if (perf.engagement_rate > avgRate * 1.5 && perf.posts >= 2) {
      guidance.push(`BOOST: ${type} posts are performing ${Math.round(perf.engagement_rate / avgRate)}x above average — create more of these.`);
      reasoning.push(`${type} outperforms (${perf.engagement_rate.toFixed(1)}% vs ${avgRate.toFixed(1)}% avg)`);
    }
    if (perf.engagement_rate < avgRate * 0.5 && perf.posts >= 3) {
      guidance.push(`REDUCE: ${type} posts are underperforming — consider fewer or rewrite the approach.`);
      reasoning.push(`${type} underperforms (${perf.engagement_rate.toFixed(1)}% vs ${avgRate.toFixed(1)}% avg)`);
    }
  }

  // Reply-heavy posts signal conversation starters — these are gold
  const replyHeavy = postsWithEngRate.filter((p) => (p.metrics.reply_count ?? 0) >= 2);
  if (replyHeavy.length > 0) {
    const replyTypes = [...new Set(replyHeavy.map((p) => normalizeType(p.type)))];
    guidance.push(`ENGAGE: Posts of type [${replyTypes.join(", ")}] are generating replies — prioritize these for audience building.`);
    reasoning.push(`Reply magnets: ${replyTypes.join(", ")}`);
  }

  // Check if product posts are being ignored
  const productPosts = postsWithEngRate.filter((p) => normalizeType(p.type) === "product_updates" || normalizeType(p.type) === "product");
  if (productPosts.length >= 2) {
    const productAvg = productPosts.reduce((s, p) => s + p.engagement_rate, 0) / productPosts.length;
    if (productAvg < avgRate * 0.3) {
      guidance.push("WARN: Product posts getting very low engagement. Audience isn't warm enough yet — lean harder into humor and building-in-public.");
      reasoning.push("Product posts bombing — audience not warm yet");
    }
  }

  // Check posting frequency
  const last48h = observedPosts.filter((p) => Date.now() - new Date(p.published_at).getTime() < 48 * 60 * 60 * 1000);
  if (last48h.length > 10) {
    guidance.push("THROTTLE: More than 10 posts in 48 hours. Reduce cadence to avoid follower fatigue and API rate limits.");
    reasoning.push(`High frequency: ${last48h.length} posts in 48h`);
  }

  // Best hour recommendation
  const bestHour = Object.entries(hourStats)
    .filter(([, s]) => s.posts >= 2)
    .sort((a, b) => {
      const rateA = b[1].impressions > 0 ? b[1].engagement / b[1].impressions : 0;
      const rateB = a[1].impressions > 0 ? a[1].engagement / a[1].impressions : 0;
      return rateA - rateB;
    })[0];

  if (bestHour) {
    guidance.push(`TIMING: Best performing hour is ${bestHour[0]} EST (${bestHour[1].posts} posts, ${bestHour[1].engagement} total engagement).`);
  }

  feedback.next_run_guidance = guidance;
  feedback.total_posts_analyzed = observedPosts.length;

  // Append to reasoning log (keep last 10 entries)
  feedback.reason_log = [
    { timestamp: new Date().toISOString(), insights: reasoning, guidance_count: guidance.length },
    ...(feedback.reason_log ?? []).slice(0, 9),
  ];

  // Print guidance
  if (guidance.length > 0) {
    console.log("\n  Guidance for next run:");
    for (const g of guidance) {
      console.log(`    → ${g}`);
    }
  } else {
    console.log("\n  No actionable guidance yet (need more data).");
  }

  saveFeedback(feedback);
  logEntry({ step: "reason", insights: reasoning, guidance_count: guidance.length });

  return feedback;
}

function inferTypeFromTags(tagsStr) {
  const t = tagsStr.toLowerCase();
  if (t.includes("buildinpublic") || t.includes("founder") || t.includes("indiehacker")) return "building_in_public";
  if (t.includes("hottake") || t.includes("vibecoding")) return "hot_takes";
  if (t.includes("appsec") || t.includes("devsecops") || t.includes("cybersecurity") || t.includes("kev")) return "education";
  if (t.includes("cveriskpilot")) return "product_updates";
  return "unknown";
}

function normalizeType(type) {
  if (!type) return "unknown";
  // Map various type names to canonical types from content_mix
  const t = type.toLowerCase().replace(/[_-]/g, "");
  if (t.includes("meme") || t.includes("humor")) return "meme_humor";
  if (t.includes("build") || t.includes("founder") || t.includes("progress") || t.includes("traction")) return "building_in_public";
  if (t.includes("hot") || t.includes("take") || t.includes("opinion") || t.includes("spicy")) return "hot_takes";
  if (t.includes("product") || t.includes("release") || t.includes("launch") || t.includes("feature") || t.includes("update") || t.includes("changelog")) return "product_updates";
  if (t.includes("engage") || t.includes("poll") || t.includes("question") || t.includes("bait") || t.includes("confess")) return "engagement_bait";
  if (t.includes("education") || t.includes("security") || t.includes("kev") || t.includes("news") || t.includes("cve") || t.includes("breach")) return "education";
  // Catch free-form angle descriptions from autopilot-generated posts
  if (t.includes("pain") || t.includes("callout") || t.includes("data") || t.includes("stat")) return "education";
  if (t.includes("newsjack") || t.includes("urgency") || t.includes("trending")) return "hot_takes";
  if (t.includes("social") || t.includes("origin") || t.includes("veteran") || t.includes("solo") || t.includes("indie")) return "building_in_public";
  if (t.includes("cta") || t.includes("convert") || t.includes("closing")) return "product_updates";
  if (t.includes("comparison") || t.includes("complement") || t.includes("positioning")) return "hot_takes";
  if (t.includes("rnd") || t.includes("r&d")) return "education";
  return "unknown";
}

// ---------------------------------------------------------------------------
// STEP 3: RESEARCH — generate new drafts from live sources
// ---------------------------------------------------------------------------

function stepResearch() {
  console.log("\n=== STEP 3: RESEARCH ===");

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
// STEP 4: REVIEW — quality-check every draft in social/drafts/
//   Now informed by feedback: boost/penalize scores based on type performance
// ---------------------------------------------------------------------------

function stepReview(feedback) {
  console.log("\n=== STEP 4: REVIEW ===");

  const drafts = listJsonFiles(DRAFTS_DIR);
  const results = { reviewed: 0, approved: 0, rejected: 0, archived: 0 };

  // Get feedback-informed type preferences
  const typeGuidance = feedback?.next_run_guidance ?? [];
  const boostTypes = new Set();
  const reduceTypes = new Set();
  for (const g of typeGuidance) {
    const boostMatch = g.match(/^BOOST: (\w+)/);
    const reduceMatch = g.match(/^REDUCE: (\w+)/);
    if (boostMatch) boostTypes.add(boostMatch[1]);
    if (reduceMatch) reduceTypes.add(reduceMatch[1]);
  }

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
      // Check if feedback says to boost this type despite minor issues
      const draftType = normalizeType(draft.type);
      const isBoostedType = boostTypes.has(draftType);
      const onlyMinorIssues = issues.every((i) => i.includes("no hashtags") || i.includes("low engagement potential"));

      if (isBoostedType && onlyMinorIssues) {
        console.log(`  BOOST-APPROVE ${filename}: feedback says ${draftType} is performing well (minor issues waived: ${issues.join("; ")})`);
        draft.status = "ready";
        draft.approved_by = "autopilot-boosted";
        draft.platforms.x.status = "ready";
        draft._review = { status: "approved", reason: "feedback-boosted", waived_issues: issues, reviewedAt: new Date().toISOString() };
        writeJson(filepath, draft);
        logEntry({ step: "review", file: filename, status: "boost-approved", type: draftType });
        results.approved++;
        continue;
      }

      console.log(`  REJECT ${filename}: ${issues.join("; ")}`);
      draft._review = { status: "rejected", issues, reviewedAt: new Date().toISOString() };
      writeJson(filepath, draft);
      logEntry({ step: "review", file: filename, status: "rejected", issues });
      results.rejected++;
      continue;
    }

    // Check if feedback says to reduce this type
    const draftType = normalizeType(draft.type);
    if (reduceTypes.has(draftType)) {
      console.log(`  DEPRIORITIZE ${filename}: feedback says ${draftType} is underperforming (approved but marked low-priority)`);
      draft._review = { status: "approved", priority: "low", reason: "feedback-deprioritized", reviewedAt: new Date().toISOString() };
    } else {
      draft._review = { status: "approved", reviewedAt: new Date().toISOString() };
    }

    // Auto-approve
    draft.status = "ready";
    draft.approved_by = "autopilot";
    draft.platforms.x.status = "ready";
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
// STEP 5: QUEUE — move approved drafts to social/queue/
//   Now sorts by feedback-informed priority
// ---------------------------------------------------------------------------

function stepQueue(feedback) {
  console.log("\n=== STEP 5: QUEUE ===");

  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const drafts = listJsonFiles(DRAFTS_DIR);
  const toQueue = [];

  for (const filepath of drafts) {
    const draft = readJson(filepath);

    if (draft.status === "ready" && draft.approved_by && draft.platforms?.x?.status === "ready") {
      const type = normalizeType(draft.type);
      const typePerf = feedback?.type_performance?.[type];
      const priority = draft._review?.priority === "low" ? 0 : (typePerf?.engagement_rate ?? 1);

      toQueue.push({ filepath, draft, priority });
    }
  }

  // Sort by priority: high-performing types first
  toQueue.sort((a, b) => b.priority - a.priority);

  let moved = 0;
  for (const { filepath } of toQueue) {
    const dest = path.join(QUEUE_DIR, path.basename(filepath));
    fs.renameSync(filepath, dest);
    console.log(`  QUEUED: ${path.basename(filepath)}`);
    logEntry({ step: "queue", file: path.basename(filepath), status: "queued" });
    moved++;
  }

  console.log(`  ${moved} draft(s) moved to queue.`);
  return moved;
}

// ---------------------------------------------------------------------------
// STEP 6: POST — publish queued posts to X (rate-limited)
// ---------------------------------------------------------------------------

function stepPost(opts) {
  console.log("\n=== STEP 6: POST ===");

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
// STEP 7: REFLECT — write run summary
// ---------------------------------------------------------------------------

function stepReflect(feedback, runId) {
  console.log("\n=== STEP 7: REFLECT ===");

  const summary = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    posts_analyzed: feedback.total_posts_analyzed,
    avg_engagement_rate: feedback.avg_engagement_rate,
    avg_impressions: feedback.avg_impressions,
    guidance: feedback.next_run_guidance,
    top_type: Object.entries(feedback.type_performance ?? {})
      .sort((a, b) => (b[1].engagement_rate ?? 0) - (a[1].engagement_rate ?? 0))[0]?.[0] ?? "unknown",
    bottom_type: Object.entries(feedback.type_performance ?? {})
      .sort((a, b) => (a[1].engagement_rate ?? 0) - (b[1].engagement_rate ?? 0))[0]?.[0] ?? "unknown",
  };

  console.log(`  Posts analyzed:      ${summary.posts_analyzed}`);
  console.log(`  Avg engagement rate: ${summary.avg_engagement_rate}%`);
  console.log(`  Avg impressions:     ${summary.avg_impressions}`);
  console.log(`  Top type:            ${summary.top_type}`);
  console.log(`  Bottom type:         ${summary.bottom_type}`);
  console.log(`  Guidance signals:    ${summary.guidance.length}`);

  logEntry({ step: "reflect", ...summary });
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runId = `run_${Date.now()}`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SOCIAL AUTOPILOT (ReACT) — ${new Date().toISOString()}`);
  console.log(`Mode: ${opts.dryRun ? "DRY RUN" : "LIVE"} | Step: ${opts.step} | Max posts: ${opts.maxPosts}`);
  console.log("=".repeat(60));

  logEntry({ step: "start", runId, mode: opts.dryRun ? "dry_run" : "live", stepFilter: opts.step });

  const shouldRun = (step) => opts.step === "all" || opts.step === step;

  // ReACT loop: Observe → Reason → Act (Research + Review + Queue + Post) → Reflect
  let feedback = loadFeedback();
  let observedPosts = [];

  if (shouldRun("observe")) {
    observedPosts = stepObserve();
  }

  if (shouldRun("observe") || shouldRun("reason")) {
    feedback = stepReason(observedPosts);
  }

  if (shouldRun("research")) stepResearch();
  if (shouldRun("review"))   stepReview(feedback);
  if (shouldRun("queue"))    stepQueue(feedback);
  if (shouldRun("post"))     stepPost(opts);

  if (shouldRun("reflect") || opts.step === "all") {
    stepReflect(feedback, runId);
  }

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
