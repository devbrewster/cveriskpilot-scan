#!/usr/bin/env node

/**
 * X Engagement Monitor & Auto-Responder
 *
 * Pulls mentions, replies, and tweet metrics for @cveriskpilot.
 * Generates context-aware reply drafts using Claude API.
 * Replies are delayed with random jitter to appear natural.
 *
 * Usage:
 *   node scripts/x-engagement-monitor.mjs                    # analyze only (default)
 *   node scripts/x-engagement-monitor.mjs --auto-reply       # analyze + queue replies
 *   node scripts/x-engagement-monitor.mjs --send-replies     # send queued replies with delays
 *   node scripts/x-engagement-monitor.mjs --dry-run          # preview everything, no API calls
 *   node scripts/x-engagement-monitor.mjs --metrics          # pull tweet performance metrics
 *   node scripts/x-engagement-monitor.mjs --since 24h        # lookback window (default: 24h)
 */

import { TwitterApi } from "twitter-api-v2";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";

const root = "/home/gonti/cveriskpilot";
const envPath = path.join(root, ".env.local");
const engagementDir = path.join(root, "social/engagement");
const replyQueueDir = path.join(root, "social/engagement/reply-queue");
const repliedDir = path.join(root, "social/engagement/replied");
const metricsDir = path.join(root, "social/engagement/metrics");
const logDir = path.join(root, "social/logs");

// --- Delay config: replies feel human, not bot ---
const REPLY_DELAY_MIN_MS = 8 * 60 * 1000;    // minimum 8 minutes
const REPLY_DELAY_MAX_MS = 45 * 60 * 1000;   // maximum 45 minutes
const REPLY_JITTER_MS = 5 * 60 * 1000;       // +/- 5 min random jitter

// --- Helpers ---

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  const base = REPLY_DELAY_MIN_MS + Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS);
  const jitter = (Math.random() - 0.5) * 2 * REPLY_JITTER_MS;
  return Math.max(REPLY_DELAY_MIN_MS, Math.round(base + jitter));
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `engagement-${ts.slice(0, 10)}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify({ ts, msg }) + "\n");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function parseSince(sinceStr) {
  const match = sinceStr.match(/^(\d+)(h|d|m)$/);
  if (!match) throw new Error(`Invalid --since format: ${sinceStr}. Use 24h, 7d, or 30m.`);
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const ms = unit === "h" ? n * 3600000 : unit === "d" ? n * 86400000 : n * 60000;
  return new Date(Date.now() - ms);
}

// --- Arg parsing ---

function parseArgs(argv) {
  const opts = {
    autoReply: false,
    sendReplies: false,
    dryRun: false,
    metrics: false,
    since: "24h",
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--auto-reply") { opts.autoReply = true; continue; }
    if (argv[i] === "--send-replies") { opts.sendReplies = true; continue; }
    if (argv[i] === "--dry-run") { opts.dryRun = true; continue; }
    if (argv[i] === "--metrics") { opts.metrics = true; continue; }
    if (argv[i] === "--since") { opts.since = argv[++i]; continue; }
    throw new Error(`Unknown arg: ${argv[i]}`);
  }
  return opts;
}

// --- X API client ---

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

function getClaudeClient() {
  const env = loadEnvFile(envPath);
  if (!env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY in .env.local");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

// --- Fetch mentions & replies ---

async function fetchMentions(client, userId, sinceDate) {
  const mentions = [];
  try {
    const response = await client.v2.userMentionTimeline(userId, {
      start_time: sinceDate.toISOString(),
      max_results: 100,
      expansions: ["author_id", "in_reply_to_user_id", "referenced_tweets.id"],
      "tweet.fields": ["created_at", "conversation_id", "in_reply_to_user_id", "public_metrics", "text", "author_id"],
      "user.fields": ["username", "name", "public_metrics"],
    });

    if (response.data?.data) {
      const users = new Map();
      if (response.includes?.users) {
        for (const u of response.includes.users) {
          users.set(u.id, u);
        }
      }

      for (const tweet of response.data.data) {
        const author = users.get(tweet.author_id);
        mentions.push({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          author_username: author?.username ?? "unknown",
          author_name: author?.name ?? "unknown",
          author_followers: author?.public_metrics?.followers_count ?? 0,
          created_at: tweet.created_at,
          conversation_id: tweet.conversation_id,
          in_reply_to_user_id: tweet.in_reply_to_user_id,
          metrics: tweet.public_metrics,
          is_reply: !!tweet.in_reply_to_user_id,
        });
      }
    }
  } catch (err) {
    log(`WARN: Failed to fetch mentions: ${err.message}`);
  }
  return mentions;
}

// --- Fetch tweet metrics ---

async function fetchTweetMetrics(client, tweetIds) {
  const metrics = [];
  // API allows up to 100 tweet IDs per request
  const chunks = [];
  for (let i = 0; i < tweetIds.length; i += 100) {
    chunks.push(tweetIds.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await client.v2.tweets(chunk, {
        "tweet.fields": ["public_metrics", "created_at", "text"],
      });
      if (response.data) {
        for (const tweet of response.data) {
          metrics.push({
            id: tweet.id,
            text: tweet.text?.slice(0, 80),
            created_at: tweet.created_at,
            metrics: tweet.public_metrics,
          });
        }
      }
    } catch (err) {
      log(`WARN: Failed to fetch metrics for chunk: ${err.message}`);
    }
  }
  return metrics;
}

// --- Classify mention intent ---

function classifyMention(mention) {
  const text = mention.text.toLowerCase();

  // Skip our own tweets
  if (mention.author_username === "cveriskpilot") return "self";

  // Spam / bot signals
  if (text.includes("dm me") || text.includes("check inbox") || text.includes("whatsapp")) return "spam";
  if (mention.author_followers < 5 && text.length < 30) return "low-quality";

  // Questions deserve a reply
  if (text.includes("?") || text.includes("how do") || text.includes("what does") ||
      text.includes("can you") || text.includes("does it") || text.includes("is there")) return "question";

  // Feature requests / suggestions
  if (text.includes("would be nice") || text.includes("can you add") || text.includes("please add") ||
      text.includes("feature request") || text.includes("suggestion")) return "feature-request";

  // Positive engagement
  if (text.includes("love this") || text.includes("great") || text.includes("awesome") ||
      text.includes("nice") || text.includes("impressive") || text.includes("cool") ||
      text.includes("exactly") || text.includes("this is what") || text.includes("need this")) return "positive";

  // Criticism / pushback
  if (text.includes("but") || text.includes("however") || text.includes("not sure") ||
      text.includes("disagree") || text.includes("actually")) return "pushback";

  // General engagement (retweet with comment, tag, etc.)
  return "engagement";
}

// --- Generate reply using Claude ---

async function generateReply(claude, mention, context) {
  const systemPrompt = `You are writing replies AS the solo founder of CVERiskPilot. Not a social media manager. Not a brand account. A real person who built this tool because they were tired of doing compliance mapping by hand.

Who you are:
- Cybersecurity professional, 7+ years in the field
- Most recent role: Application Security Architect
- Veteran. Texas. Building this solo.
- You've sat through audits. You've triaged CVEs at 2 AM. You've built POAMs in spreadsheets. That's WHY you built this.

Voice rules — this is critical:
- Write like a person texting a colleague, not a brand posting content
- Short sentences. Lowercase is fine. Fragments are fine.
- NEVER use phrases like "Great question!", "Thanks for the feedback!", "We appreciate...", "Feel free to..."
- NEVER sound corporate, polished, or AI-generated
- Drop the exclamation marks — one per reply MAX, and only if it's genuine
- No buzzwords: "leverage", "empower", "revolutionary", "game-changing" — instant delete
- Don't pitch unless they literally asked about the product
- If someone asks a technical question, answer it like a practitioner — not a salesperson
- If someone is positive, respond like a human: "yeah that's exactly why I built it" not "Thank you so much for the kind words!"
- If someone pushes back, be honest: "fair point" or "hadn't thought of it that way" — never defensive
- Typos and imperfect grammar are fine — perfectionism signals AI
- Match their energy. If they're casual, be casual. If they're technical, go deep.

Product facts (use ONLY when relevant, don't force them in):
- CLI: npx @cveriskpilot/scan
- 4 scanners: deps, secrets, IaC, API routes — run in parallel
- 6 frameworks: NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF
- 150 CWE-to-control mappings
- Auto-POAM generation
- Free, offline, open source
- Presets: --preset federal, defense, enterprise, startup

Examples of good replies:
- "yeah we map CWE to NIST/SOC2/CMMC automatically — the bridge nobody built"
- "honestly that's the exact pain that made me quit my job and build this"
- "fair. we don't replace snyk — we add the compliance layer it's missing"
- "the POAM part took the longest to get right. still iterating on it"
- "appreciate that. solo founder energy is mostly caffeine and stubbornness"

Examples of BAD replies (never do this):
- "Great question! CVERiskPilot supports 6 compliance frameworks..."
- "Thanks for your interest! Feel free to check out our CLI..."
- "We're so glad you found this valuable! 🙏"
- "Absolutely! Our tool handles that seamlessly."`;


  const userPrompt = `Reply to this mention on X:

From: @${mention.author_username} (${mention.author_name}, ${mention.author_followers} followers)
Type: ${mention.intent}
Their tweet: "${mention.text}"

${context ? `Context (our original tweet they're replying to): "${context}"` : ""}

Write a reply that's genuine, adds value, and doesn't feel automated. One reply only.`;

  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return response.content[0]?.text?.trim() ?? null;
  } catch (err) {
    log(`WARN: Claude API error: ${err.message}`);
    return null;
  }
}

// --- Queue a reply ---

function queueReply(mention, replyText, delayMs) {
  fs.mkdirSync(replyQueueDir, { recursive: true });

  const replyData = {
    id: `reply-${mention.id}`,
    in_reply_to_tweet_id: mention.id,
    in_reply_to_username: mention.author_username,
    in_reply_to_text: mention.text,
    reply_text: replyText,
    intent: mention.intent,
    author_followers: mention.author_followers,
    delay_ms: delayMs,
    scheduled_send_at: new Date(Date.now() + delayMs).toISOString(),
    status: "queued",
    created_at: new Date().toISOString(),
  };

  const filePath = path.join(replyQueueDir, `${replyData.id}.json`);
  writeJson(filePath, replyData);
  return filePath;
}

// --- Send queued replies with delays ---

async function sendQueuedReplies(client, dryRun) {
  fs.mkdirSync(replyQueueDir, { recursive: true });
  fs.mkdirSync(repliedDir, { recursive: true });

  const files = fs.readdirSync(replyQueueDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    log("No replies queued.");
    return;
  }

  log(`Processing ${files.length} queued replies...`);

  let username = null;
  if (!dryRun) {
    const me = await client.v2.me();
    username = me.data.username;
    log(`Authenticated as @${username}`);
  }

  for (const file of files) {
    const filePath = path.join(replyQueueDir, file);
    const reply = readJson(filePath);

    if (reply.status !== "queued") {
      log(`SKIP ${reply.id}: status is ${reply.status}`);
      continue;
    }

    // Check if scheduled time has passed
    const sendAt = new Date(reply.scheduled_send_at);
    const now = new Date();

    if (now < sendAt) {
      const waitMs = sendAt.getTime() - now.getTime();
      const waitMin = Math.round(waitMs / 60000);
      log(`WAITING ${reply.id}: ${waitMin} min until send time (replying to @${reply.in_reply_to_username})`);

      if (dryRun) {
        log(`DRY RUN: would wait ${waitMin} minutes, then reply: "${reply.reply_text.slice(0, 80)}..."`);
        continue;
      }

      await sleep(waitMs);
    }

    // Add extra random jitter even after scheduled time (feels more human)
    const extraJitter = Math.round(Math.random() * 3 * 60 * 1000); // 0-3 min extra
    if (!dryRun && extraJitter > 0) {
      await sleep(extraJitter);
    }

    if (dryRun) {
      log(`DRY RUN: would reply to @${reply.in_reply_to_username}: "${reply.reply_text}"`);
      continue;
    }

    try {
      const result = await client.v2.reply(reply.reply_text, reply.in_reply_to_tweet_id);
      const tweetId = result.data.id;
      const url = `https://x.com/${username}/status/${tweetId}`;

      reply.status = "sent";
      reply.sent_tweet_id = tweetId;
      reply.sent_at = new Date().toISOString();
      reply.url = url;

      // Move to replied dir
      const archivedPath = path.join(repliedDir, file);
      writeJson(archivedPath, reply);
      fs.unlinkSync(filePath);

      log(`REPLIED ${reply.id}: ${url} (to @${reply.in_reply_to_username})`);
    } catch (err) {
      log(`ERROR ${reply.id}: ${err.message}`);
      reply.status = "error";
      reply.error = err.message;
      reply.last_error_at = new Date().toISOString();
      writeJson(filePath, reply);
    }

    // Delay between consecutive replies (vary 5-10 min to look natural)
    const interReplyDelay = 5 * 60 * 1000 + Math.random() * 5 * 60 * 1000;
    if (!dryRun && files.indexOf(file) < files.length - 1) {
      log(`Waiting ${Math.round(interReplyDelay / 60000)} min before next reply...`);
      await sleep(interReplyDelay);
    }
  }

  log("Reply queue processed.");
}

// --- Main ---

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const sinceDate = parseSince(opts.since);

  log(`=== X Engagement Monitor ===`);
  log(`Lookback: ${opts.since} (since ${sinceDate.toISOString()})`);

  const client = getXClient();
  const me = await client.v2.me();
  const userId = me.data.id;
  const username = me.data.username;
  log(`Authenticated as @${username} (ID: ${userId})`);

  // --- Mode: Send queued replies ---
  if (opts.sendReplies) {
    await sendQueuedReplies(client, opts.dryRun);
    return;
  }

  // --- Mode: Metrics only ---
  if (opts.metrics) {
    // Collect all published tweet IDs
    const publishedDir = path.join(root, "social/published");
    const tweetIds = [];

    if (fs.existsSync(publishedDir)) {
      for (const file of fs.readdirSync(publishedDir).filter((f) => f.endsWith(".json"))) {
        try {
          const post = readJson(path.join(publishedDir, file));
          const postId = post.platforms?.x?.post_id ?? post.post_id;
          if (postId) tweetIds.push(postId);
        } catch { /* skip */ }
      }
    }

    if (tweetIds.length === 0) {
      log("No published tweets found.");
      return;
    }

    log(`Fetching metrics for ${tweetIds.length} published tweets...`);
    const metrics = await fetchTweetMetrics(client, tweetIds);

    // Sort by engagement (likes + retweets + replies)
    metrics.sort((a, b) => {
      const engA = (a.metrics?.like_count ?? 0) + (a.metrics?.retweet_count ?? 0) + (a.metrics?.reply_count ?? 0);
      const engB = (b.metrics?.like_count ?? 0) + (b.metrics?.retweet_count ?? 0) + (b.metrics?.reply_count ?? 0);
      return engB - engA;
    });

    // Save metrics
    const metricsFile = path.join(metricsDir, `${new Date().toISOString().slice(0, 10)}.json`);
    writeJson(metricsFile, { fetched_at: new Date().toISOString(), tweets: metrics });
    log(`Metrics saved to ${metricsFile}`);

    // Print summary
    console.log("\n=== Tweet Performance ===\n");
    console.log("  Likes  RTs  Replies  Impr   | Tweet");
    console.log("  -----  ---  -------  -----  | -----");
    for (const t of metrics) {
      const m = t.metrics ?? {};
      const line = `  ${String(m.like_count ?? 0).padStart(5)}  ${String(m.retweet_count ?? 0).padStart(3)}  ${String(m.reply_count ?? 0).padStart(7)}  ${String(m.impression_count ?? 0).padStart(5)}  | ${t.text}...`;
      console.log(line);
    }

    // Engagement insights
    const totalImpressions = metrics.reduce((s, t) => s + (t.metrics?.impression_count ?? 0), 0);
    const totalLikes = metrics.reduce((s, t) => s + (t.metrics?.like_count ?? 0), 0);
    const totalReplies = metrics.reduce((s, t) => s + (t.metrics?.reply_count ?? 0), 0);
    const totalRTs = metrics.reduce((s, t) => s + (t.metrics?.retweet_count ?? 0), 0);
    const engRate = totalImpressions > 0 ? ((totalLikes + totalReplies + totalRTs) / totalImpressions * 100).toFixed(2) : "N/A";

    console.log(`\n  Total: ${totalImpressions} impressions, ${totalLikes} likes, ${totalRTs} RTs, ${totalReplies} replies`);
    console.log(`  Engagement rate: ${engRate}%`);
    console.log(`  Top performer: "${metrics[0]?.text}..."`);

    return;
  }

  // --- Mode: Analyze mentions ---
  log(`Fetching mentions since ${sinceDate.toISOString()}...`);
  const mentions = await fetchMentions(client, userId, sinceDate);

  // Classify each mention
  const classified = mentions.map((m) => ({ ...m, intent: classifyMention(m) }));

  // Filter out self, spam, low-quality
  const actionable = classified.filter((m) => !["self", "spam", "low-quality"].includes(m.intent));
  const skipped = classified.filter((m) => ["self", "spam", "low-quality"].includes(m.intent));

  log(`Found ${mentions.length} mentions: ${actionable.length} actionable, ${skipped.length} filtered`);

  // Save analysis
  const analysisFile = path.join(engagementDir, `analysis-${new Date().toISOString().slice(0, 10)}.json`);
  writeJson(analysisFile, {
    fetched_at: new Date().toISOString(),
    since: sinceDate.toISOString(),
    total: mentions.length,
    actionable: actionable.length,
    skipped: skipped.length,
    by_intent: {
      question: actionable.filter((m) => m.intent === "question").length,
      positive: actionable.filter((m) => m.intent === "positive").length,
      "feature-request": actionable.filter((m) => m.intent === "feature-request").length,
      pushback: actionable.filter((m) => m.intent === "pushback").length,
      engagement: actionable.filter((m) => m.intent === "engagement").length,
    },
    mentions: classified,
  });

  // Print summary
  console.log("\n=== Mentions Analysis ===\n");

  if (actionable.length === 0) {
    console.log("  No actionable mentions found.");
  }

  // Priority order: questions > feature requests > positive > pushback > engagement
  const priorityOrder = ["question", "feature-request", "positive", "pushback", "engagement"];

  for (const intent of priorityOrder) {
    const group = actionable.filter((m) => m.intent === intent);
    if (group.length === 0) continue;

    console.log(`  ${intent.toUpperCase()} (${group.length}):`);
    for (const m of group) {
      console.log(`    @${m.author_username} (${m.author_followers} followers): "${m.text.slice(0, 100)}${m.text.length > 100 ? "..." : ""}"`);
    }
    console.log("");
  }

  if (skipped.length > 0) {
    console.log(`  FILTERED: ${skipped.length} (self: ${skipped.filter((m) => m.intent === "self").length}, spam: ${skipped.filter((m) => m.intent === "spam").length}, low-quality: ${skipped.filter((m) => m.intent === "low-quality").length})`);
  }

  // --- Auto-reply mode ---
  if (opts.autoReply && actionable.length > 0) {
    log("Generating reply drafts with Claude...");
    const claude = getClaudeClient();

    // Check already-replied to avoid duplicates
    fs.mkdirSync(repliedDir, { recursive: true });
    const alreadyReplied = new Set(
      fs.readdirSync(repliedDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace("reply-", "").replace(".json", ""))
    );

    // Also check queued
    fs.mkdirSync(replyQueueDir, { recursive: true });
    const alreadyQueued = new Set(
      fs.readdirSync(replyQueueDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace("reply-", "").replace(".json", ""))
    );

    let repliesGenerated = 0;

    for (const mention of actionable) {
      // Skip if already replied or queued
      if (alreadyReplied.has(mention.id) || alreadyQueued.has(mention.id)) {
        log(`SKIP ${mention.id}: already replied/queued`);
        continue;
      }

      // Generate reply
      const replyText = await generateReply(claude, mention, null);

      if (!replyText) {
        log(`SKIP ${mention.id}: failed to generate reply`);
        continue;
      }

      // Calculate delay: higher-follower accounts get faster replies
      // (they have more reach, and faster replies get seen by their audience)
      let delayMs = randomDelay();
      if (mention.author_followers > 10000) {
        delayMs = Math.round(delayMs * 0.5); // reply faster to high-reach accounts
      } else if (mention.author_followers > 1000) {
        delayMs = Math.round(delayMs * 0.7);
      }
      // Ensure minimum delay
      delayMs = Math.max(REPLY_DELAY_MIN_MS, delayMs);

      const delayMin = Math.round(delayMs / 60000);

      if (opts.dryRun) {
        log(`DRY RUN: would queue reply to @${mention.author_username} (${delayMin} min delay): "${replyText}"`);
      } else {
        const filePath = queueReply(mention, replyText, delayMs);
        log(`QUEUED reply to @${mention.author_username} (${delayMin} min delay): ${filePath}`);
      }

      repliesGenerated++;

      // Small delay between Claude API calls
      await sleep(500);
    }

    log(`Generated ${repliesGenerated} reply drafts.`);

    console.log(`\n=== Reply Queue ===\n`);
    console.log(`  ${repliesGenerated} replies queued with ${Math.round(REPLY_DELAY_MIN_MS / 60000)}-${Math.round(REPLY_DELAY_MAX_MS / 60000)} min delays`);
    console.log(`\n  To review: ls social/engagement/reply-queue/`);
    console.log(`  To send:   node scripts/x-engagement-monitor.mjs --send-replies`);
    console.log(`  Dry run:   node scripts/x-engagement-monitor.mjs --send-replies --dry-run`);
  }

  log("=== Engagement monitor complete ===");
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
