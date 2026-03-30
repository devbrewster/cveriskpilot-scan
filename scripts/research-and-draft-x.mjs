#!/usr/bin/env node

/**
 * Auto-Research & Draft X Posts
 *
 * Uses Anthropic Claude API to research trending topics and generate
 * X posts tailored to CVERiskPilot's audience.
 *
 * Usage:
 *   node scripts/research-and-draft-x.mjs                        # full pipeline
 *   node scripts/research-and-draft-x.mjs --topics "vibecoding,breach news"
 *   node scripts/research-and-draft-x.mjs --count 5              # generate 5 posts
 *   node scripts/research-and-draft-x.mjs --dry-run              # research only, no save
 *
 * Requires: ANTHROPIC_API_KEY in .env.local
 *
 * Output: social/drafts/auto-generated/YYYY-MM-DD.json
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";

const root = "/home/gonti/cveriskpilot";
const envPath = path.join(root, ".env.local");
const outputDir = path.join(root, "social/drafts/auto-generated");

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

function parseArgs(argv) {
  const opts = {
    topics: null,
    count: 10,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--topics") { opts.topics = argv[++i]; continue; }
    if (argv[i] === "--count") { opts.count = parseInt(argv[++i], 10); continue; }
    if (argv[i] === "--dry-run") { opts.dryRun = true; continue; }
    throw new Error(`Unknown arg: ${argv[i]}`);
  }
  return opts;
}

const BRAND_CONTEXT = `
CVERiskPilot is a vulnerability management SaaS platform.

Core product: Pipeline Compliance Scanner (@cveriskpilot/scan on npm)
- Free CLI that scans dependencies, secrets, and IaC
- Maps every finding to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF controls
- Auto-generates POAM entries
- Install: npx @cveriskpilot/scan --preset startup
- npmjs.com/package/@cveriskpilot/scan

Brand facts:
- 100% Veteran Owned, Texas-based
- Solo founder, building in public
- Free tier, no credit card required
- Complements existing scanners (Snyk, SonarQube, GHAS)

Key stats to use:
- 42% of orgs struggle to prioritize vulnerabilities
- 45% of enterprise vulns remain unpatched after 12 months
- Average remediation time: 74 days
- GRC teams spend 40+ hours/quarter manually mapping CVEs to controls
- AI-generated code has 2.74x more security vulnerabilities

Target audience: DevSecOps, GRC analysts, CISOs, defense contractors, indie hackers, SaaS founders

Tone: direct, technical, no fluff. Short sentences. Data-backed claims.
Hashtags to rotate: #DevSecOps #AppSec #cybersecurity #CMMC #SOC2 #GRC #vibecoding #buildinpublic #indiehackers
`;

const RESEARCH_TOPICS = [
  "vibecoding vibe coding security risks AI generated code vulnerabilities",
  "cybersecurity breach news this week",
  "CMMC compliance deadline defense contractors 2026",
  "SOC 2 audit pain points developers",
  "building in public SaaS founder milestones",
  "open source security scanner npm supply chain",
  "CISA KEV known exploited vulnerabilities this week",
  "compliance automation GRC tooling trends",
];

async function research(client, topics) {
  console.log("Researching trending topics...\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a cybersecurity social media researcher. Search and analyze the latest trending discussions around these topics. For each topic, provide:
1. What's currently being discussed (key narratives, hot takes, viral posts)
2. Specific data points, stats, or incidents mentioned
3. Engagement patterns (what's getting likes/retweets)
4. Angles that would work for a compliance scanner SaaS

Topics to research:
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Be specific. Include names, numbers, dates. Focus on what's trending RIGHT NOW.`,
      },
    ],
  });

  const research = response.content[0].text;
  console.log("Research complete.\n");
  return research;
}

async function generatePosts(client, researchData, count) {
  console.log(`Generating ${count} X posts...\n`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are a social media content manager for CVERiskPilot.

${BRAND_CONTEXT}

Based on this research on current trending topics:

---
${researchData}
---

Generate exactly ${count} X (Twitter) posts. Requirements:
- MUST be under 280 characters each (this is critical — count carefully)
- Each post should ride a trending topic or conversation
- Mix of: hot takes, data-backed claims, pain point callouts, build-in-public updates, newsjacking
- Always include a CTA: either "npx @cveriskpilot/scan" or "npmjs.com/package/@cveriskpilot/scan"
- 1-2 relevant hashtags per post (max 2)
- No emojis
- Sequence them so they tell a narrative arc (problem → data → solution → social proof)

Return ONLY valid JSON array. Each object must have:
{
  "id": "auto-YYYY-MM-DD-NN",
  "content": "the post text",
  "character_count": 123,
  "angle": "brief description of the angle",
  "trending_topic": "what trend this rides",
  "tags": ["tag1", "tag2"]
}`,
      },
    ],
  });

  const text = response.content[0].text;

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Claude response");

  const posts = JSON.parse(jsonMatch[0]);
  console.log(`Generated ${posts.length} posts.\n`);
  return posts;
}

function saveDrafts(posts, dryRun) {
  const today = new Date().toISOString().slice(0, 10);

  if (dryRun) {
    console.log("DRY RUN — would save:\n");
    posts.forEach((p, i) => {
      console.log(`[${i + 1}] ${p.id} (${p.character_count} chars) — ${p.angle}`);
      console.log(`    ${p.content.slice(0, 100)}...`);
      console.log();
    });
    return null;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Convert to queue format
  const queuePosts = posts.map((p, i) => ({
    id: `auto-${today}-${String(i + 1).padStart(2, "0")}`,
    status: "draft",
    approved_by: null,
    scheduled_offset_hours: i * 2,
    platforms: {
      x: {
        status: "draft",
        content: p.content,
        character_count: p.content.length,
      },
    },
    angle: p.angle,
    trending_topic: p.trending_topic,
    tags: p.tags,
    generated_at: new Date().toISOString(),
  }));

  const outPath = path.join(outputDir, `${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(queuePosts, null, 2) + "\n");
  console.log(`Saved ${queuePosts.length} drafts to ${outPath}`);
  console.log(`\nTo review and approve:`);
  console.log(`  1. Edit ${outPath}`);
  console.log(`  2. Set status: "ready" and approved_by: "gonti" on posts you want to publish`);
  console.log(`  3. Copy approved posts to social/queue/`);
  console.log(`  4. Run: node scripts/scheduled-x-publish.mjs --file <queue-file>`);

  return outPath;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(envPath);

  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY in .env.local");
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const topics = opts.topics
    ? opts.topics.split(",").map((t) => t.trim())
    : RESEARCH_TOPICS;

  const researchData = await research(client, topics);
  const posts = await generatePosts(client, researchData, opts.count);
  saveDrafts(posts, opts.dryRun);
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
