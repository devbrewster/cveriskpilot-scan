#!/usr/bin/env node

/**
 * generate-x-drafts.mjs
 *
 * Fetches current cybersecurity events from public sources (CISA KEV, The Hacker News RSS)
 * and generates X post drafts in social/drafts/.
 *
 * Usage:
 *   node scripts/generate-x-drafts.mjs                  # generate drafts from all sources
 *   node scripts/generate-x-drafts.mjs --source kev     # CISA KEV only
 *   node scripts/generate-x-drafts.mjs --source news    # news headlines only
 *   node scripts/generate-x-drafts.mjs --days 3         # look back 3 days (default: 7)
 *   node scripts/generate-x-drafts.mjs --publish-ready  # also push approved drafts to queue
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/gonti/cveriskpilot";
const DRAFTS_DIR = path.join(ROOT, "social", "drafts");
const QUEUE_DIR = path.join(ROOT, "social", "queue");
const PUBLISHED_DIR = path.join(ROOT, "social", "published");
// const CONFIG_PATH = path.join(ROOT, "social", "config.json");

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const THN_RSS_URL = "https://feeds.feedburner.com/TheHackersNews";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { source: "all", days: 7, publishReady: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--source" && argv[i + 1]) { opts.source = argv[++i]; continue; }
    if (arg === "--days" && argv[i + 1]) { opts.days = parseInt(argv[++i], 10) || 7; continue; }
    if (arg === "--publish-ready") { opts.publishReady = true; continue; }
    if (arg === "--help") {
      console.log("Usage: node scripts/generate-x-drafts.mjs [--source kev|news|all] [--days N] [--publish-ready]");
      process.exit(0);
    }
    console.warn(`Unknown argument: ${arg}`);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todaySlug() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function existingDraftIds() {
  const ids = new Set();
  for (const dir of [DRAFTS_DIR, QUEUE_DIR, PUBLISHED_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".json")) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
          if (data.id) ids.add(data.id);
          if (data.source?.cve) ids.add(data.source.cve);
        } catch { /* skip malformed */ }
      }
    }
  }
  return ids;
}

function writeDraft(draft) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const filename = `${draft.id}.json`;
  const filepath = path.join(DRAFTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`  SKIP (already exists): ${filename}`);
    return null;
  }

  fs.writeFileSync(filepath, JSON.stringify(draft, null, 2) + "\n");
  console.log(`  CREATED: ${filename}`);
  return filepath;
}

function charCount(text) {
  // X counts URLs as 23 chars
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

// ---------------------------------------------------------------------------
// CISA KEV source
// ---------------------------------------------------------------------------

async function fetchKEV(lookbackDate) {
  console.log("\nFetching CISA KEV catalog...");

  const res = await fetch(KEV_URL);
  if (!res.ok) {
    console.error(`  KEV fetch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const vulns = (data.vulnerabilities ?? [])
    .filter((v) => v.dateAdded >= lookbackDate)
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));

  console.log(`  Found ${vulns.length} KEV entries since ${lookbackDate}`);
  return vulns;
}

// Maps vendor/product keywords to audience-specific openers and hashtags
const AUDIENCE_HOOKS = [
  { match: /laravel|livewire/i, opener: (_p) => `Laravel devs:`, tags: "#Laravel #AppSec #DevSecOps" },
  { match: /craft\s*cms/i, opener: (_p) => `If you run Craft CMS, stop scrolling.`, tags: "#AppSec #WebSecurity" },
  { match: /apple|ios|macos|safari|webkit/i, opener: (_p) => `Apple users and MDM admins:`, tags: "#Apple #AppSec" },
  { match: /microsoft|windows|exchange|outlook/i, opener: (_p) => `Windows admins:`, tags: "#Microsoft #AppSec" },
  { match: /apache|tomcat|struts/i, opener: (_p) => `Java teams running Apache ${_p}:`, tags: "#Java #AppSec" },
  { match: /docker|kubernetes|k8s|containerd/i, opener: (_p) => `Container teams:`, tags: "#DevSecOps #CloudSecurity" },
  { match: /jenkins|gitlab|github|ci.?cd/i, opener: (_p) => `CI/CD pipeline alert:`, tags: "#DevSecOps #CICD" },
  { match: /trivy|snyk|grype|semgrep/i, opener: (_p) => `If you use ${_p} in CI, read this:`, tags: "#DevSecOps #SupplyChain" },
  { match: /wordpress|drupal|joomla/i, opener: (_p) => `CMS admins:`, tags: "#WebSecurity #AppSec" },
  { match: /langflow|langchain|openai|anthropic|chatgpt/i, opener: (_p) => `AI/ML teams:`, tags: "#AI #AppSec" },
  { match: /node|npm|express|next/i, opener: (_p) => `Node.js devs:`, tags: "#NodeJS #AppSec" },
];

// Classify vulnerability type for human-readable description
function describeVulnType(desc) {
  const lower = desc.toLowerCase();
  if (/remote code|rce|code injection|code execution/i.test(lower)) return "Remote code execution";
  if (/sql injection/i.test(lower)) return "SQL injection";
  if (/cross.?site|xss/i.test(lower)) return "Cross-site scripting";
  if (/buffer overflow|heap overflow|stack overflow/i.test(lower)) return "Memory corruption";
  if (/privilege escalat/i.test(lower)) return "Privilege escalation";
  if (/auth.*bypass|bypass.*auth/i.test(lower)) return "Authentication bypass";
  if (/denial.?of.?service|dos\b/i.test(lower)) return "Denial of service";
  if (/deserialization/i.test(lower)) return "Deserialization flaw";
  if (/path traversal|directory traversal/i.test(lower)) return "Path traversal";
  if (/ssrf/i.test(lower)) return "SSRF";
  return null;
}

function kevToDraft(vuln) {
  const cve = vuln.cveID;
  const vendor = vuln.vendorProject;
  const product = vuln.product;
  const desc = vuln.shortDescription ?? vuln.vulnerabilityName ?? "";
  const date = vuln.dateAdded;
  const slug = slugify(`${date}-kev-${cve}`);
  const combined = `${vendor} ${product} ${desc}`;

  // Find audience-specific hook
  const hook = AUDIENCE_HOOKS.find((h) => h.match.test(combined));
  const opener = hook ? hook.opener(product) : `${product} users:`;
  const tags = hook ? hook.tags : "#AppSec #VulnerabilityManagement";
  const vulnType = describeVulnType(desc);
  const vulnLabel = vulnType ? `${vulnType}. ` : "";

  // Require auth context to make it actionable
  const authContext = /no auth|unauth|without auth|without login|without.+credential/i.test(desc)
    ? "No authentication required. " : "";

  // Build engaging post: audience hook -> CVE -> what it means -> call to action
  let content = [
    `${opener} ${cve} in ${product} is now on the CISA KEV.`,
    "",
    `${vulnLabel}${authContext}Actively exploited in the wild.`,
    "",
    `Check your version before your next deploy.`,
    "",
    tags
  ].join("\n");

  // Tighten if over limit
  if (charCount(content) > 280) {
    content = [
      `${opener} ${cve} is on the CISA KEV \u2014 actively exploited.`,
      "",
      `${vulnLabel}${authContext}Patch before your next deploy.`,
      "",
      tags
    ].join("\n");
  }

  if (charCount(content) > 280) {
    content = `${cve}: ${vendor} ${product} added to CISA KEV \u2014 actively exploited. Patch now.\n\n#AppSec`;
  }

  return {
    id: slug,
    created_at: todaySlug(),
    type: "security",
    status: "draft",
    source: {
      cve,
      kev_date_added: date,
      reference: "CISA KEV catalog"
    },
    platforms: {
      linkedin: { status: "draft", content: "", character_count: 0, post_id: null, published_at: null },
      x: { status: "draft", content, character_count: charCount(content), post_id: null, published_at: null }
    },
    hashtags: ["#AppSec", "#VulnerabilityManagement", "#CISAKEV"],
    approved_by: null,
    published_at: null
  };
}

function truncateSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "...";
}

// ---------------------------------------------------------------------------
// News RSS source (The Hacker News)
// ---------------------------------------------------------------------------

async function fetchNewsHeadlines(lookbackDate) {
  console.log("\nFetching The Hacker News RSS...");

  const res = await fetch(THN_RSS_URL);
  if (!res.ok) {
    console.error(`  RSS fetch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const xml = await res.text();
  const items = parseRSSItems(xml, lookbackDate);
  console.log(`  Found ${items.length} headlines since ${lookbackDate}`);
  return items;
}

function parseRSSItems(xml, lookbackDate) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");

    if (!title) continue;

    let dateStr = null;
    if (pubDate) {
      try {
        dateStr = new Date(pubDate).toISOString().slice(0, 10);
      } catch { /* skip */ }
    }

    if (dateStr && dateStr < lookbackDate) continue;

    items.push({ title: decodeEntities(title), link, dateStr, description: decodeEntities(description ?? "") });
  }

  return items.slice(0, 10); // cap at 10
}

function extractTag(xml, tag) {
  const cdataRe = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`);
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const simpleRe = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const simpleMatch = simpleRe.exec(xml);
  return simpleMatch ? simpleMatch[1].trim() : null;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ""); // strip any HTML tags
}

// Skip headlines that won't generate meaningful practitioner posts
const NEWS_SKIP_PATTERNS = [
  /webinar/i,
  /sponsored/i,
  /newsletter/i,
  /bulletin.*more stories/i,
  /roundup/i,
  /podcast/i,
  /this week in/i,
];

// Map news topics to practitioner-relevant takes
const NEWS_ANGLES = [
  {
    match: /supply.?chain|malicious.?package|typosquat|backdoor.*npm|backdoor.*pypi/i,
    take: "Supply chain attacks keep landing because teams trust dependencies blindly. Audit what you import.",
    tags: "#SupplyChain #DevSecOps"
  },
  {
    match: /ransomware|ransom/i,
    take: "Ransomware is a business model, not a technique. The entry point is almost always a known, unpatched vulnerability.",
    tags: "#Ransomware #CyberSecurity"
  },
  {
    match: /zero.?day|0.?day/i,
    take: "Zero-days get headlines, but most breaches still come from known CVEs that sat unpatched for months.",
    tags: "#ZeroDay #AppSec"
  },
  {
    match: /credential|password|stolen.*login|brute.?force/i,
    take: "Stolen credentials remain the #1 initial access vector. If you're not monitoring for credential reuse, you're exposed.",
    tags: "#IdentitySecurity #CyberSecurity"
  },
  {
    match: /phishing|spear.?phish|social.?engineer/i,
    take: "Phishing still works because it targets the one system you can't patch: human judgment.",
    tags: "#Phishing #CyberSecurity"
  },
  {
    match: /\bLLM\b|\bgenerat\w+ AI\b|machine.?learning|prompt.?injection|langchain|langflow|openai|anthropic|chatgpt|copilot.*(vuln|exploit|flaw)/i,
    take: "AI tools are shipping faster than their security models. Every new capability is a new attack surface.",
    tags: "#AI #AppSec"
  },
  {
    match: /cloud|aws|azure|gcp|s3|misconfigur/i,
    take: "Cloud misconfigurations are the new open ports. Visibility into what's exposed is step one.",
    tags: "#CloudSecurity #DevSecOps"
  },
  {
    match: /csp|skimmer|magecart|payment|e.?commerce/i,
    take: "Payment skimmers keep evolving to bypass browser security controls. If you run e-commerce, your CSP policy is your first line of defense.",
    tags: "#WebSecurity #AppSec"
  },
  {
    match: /exploit|rce|remote.?code|actively.?exploit/i,
    take: "Another week, another actively exploited vulnerability. The question isn't whether you're affected \u2014 it's whether you can answer that question in under an hour.",
    tags: "#AppSec #VulnerabilityManagement"
  },
  {
    match: /arrest|law.?enforce|takedown|seized/i,
    take: "Law enforcement takedowns help, but they don't undo the data already stolen. Defense still has to come first.",
    tags: "#CyberSecurity #ThreatIntel"
  },
];

function newsIsSkippable(item) {
  const combined = `${item.title} ${item.description}`;
  return NEWS_SKIP_PATTERNS.some((p) => p.test(combined));
}

function newsToDraft(item) {
  const date = item.dateStr ?? todaySlug();
  const slug = slugify(`${date}-news-${item.title.slice(0, 40)}`);
  const combined = `${item.title} ${item.description}`;

  // Find a practitioner angle
  const angle = NEWS_ANGLES.find((a) => a.match.test(combined));

  if (!angle) {
    // No meaningful angle — skip instead of posting RSS filler
    return null;
  }

  // Build: short headline context -> practitioner take -> tags
  const shortTitle = truncateSentence(item.title.replace(/\s+/g, " "), 90);

  let content = `${shortTitle}\n\n${angle.take}\n\n${angle.tags}`;

  // Tighten if over limit
  if (charCount(content) > 280) {
    content = `${truncateSentence(shortTitle, 70)}\n\n${truncateSentence(angle.take, 140)}\n\n${angle.tags}`;
  }

  if (charCount(content) > 280) {
    content = `${truncateSentence(angle.take, 230)}\n\n${angle.tags}`;
  }

  // If still over, this post isn't worth forcing
  if (charCount(content) > 280) return null;

  return {
    id: slug,
    created_at: todaySlug(),
    type: "education",
    status: "draft",
    source: {
      headline: item.title,
      url: item.link,
      pub_date: date,
      reference: "The Hacker News"
    },
    platforms: {
      linkedin: { status: "draft", content: "", character_count: 0, post_id: null, published_at: null },
      x: { status: "draft", content, character_count: charCount(content), post_id: null, published_at: null }
    },
    hashtags: angle.tags.split(" "),
    approved_by: null,
    published_at: null
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const lookbackDate = daysAgo(opts.days);
  const existing = existingDraftIds();
  const created = [];

  console.log(`Generating X drafts (source: ${opts.source}, lookback: ${opts.days}d from ${lookbackDate})`);

  // --- KEV ---
  if (opts.source === "all" || opts.source === "kev") {
    const kevs = await fetchKEV(lookbackDate);

    for (const vuln of kevs) {
      if (existing.has(vuln.cveID)) {
        console.log(`  SKIP (already drafted): ${vuln.cveID}`);
        continue;
      }

      const draft = kevToDraft(vuln);
      const result = writeDraft(draft);
      if (result) {
        created.push(draft.id);
        existing.add(vuln.cveID);
        existing.add(draft.id);
      }
    }
  }

  // --- News ---
  if (opts.source === "all" || opts.source === "news") {
    const headlines = await fetchNewsHeadlines(lookbackDate);

    for (const item of headlines) {
      if (newsIsSkippable(item)) {
        console.log(`  SKIP (low-value content): ${truncateSentence(item.title, 50)}`);
        continue;
      }

      const draft = newsToDraft(item);

      if (!draft) {
        console.log(`  SKIP (no practitioner angle): ${truncateSentence(item.title, 50)}`);
        continue;
      }

      if (existing.has(draft.id)) {
        console.log(`  SKIP (already drafted): ${draft.id}`);
        continue;
      }

      const result = writeDraft(draft);
      if (result) {
        created.push(draft.id);
        existing.add(draft.id);
      }
    }
  }

  // --- Summary ---
  console.log(`\n${created.length} new draft(s) created in social/drafts/`);

  if (created.length > 0) {
    console.log("\nNext steps:");
    console.log("  1. Review and edit the drafts in social/drafts/");
    console.log("  2. Set approved_by and status to 'ready'");
    console.log("  3. Move to social/queue/");
    console.log("  4. Run: npm run social:publish:x");
  }

  // --- Optional: push approved drafts to queue ---
  if (opts.publishReady) {
    pushReadyDraftsToQueue();
  }
}

function pushReadyDraftsToQueue() {
  if (!fs.existsSync(DRAFTS_DIR)) return;

  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  let moved = 0;

  for (const f of fs.readdirSync(DRAFTS_DIR).filter((e) => e.endsWith(".json"))) {
    const filepath = path.join(DRAFTS_DIR, f);
    try {
      const draft = JSON.parse(fs.readFileSync(filepath, "utf8"));
      if (draft.status === "ready" && draft.approved_by && draft.platforms?.x?.status === "ready") {
        const dest = path.join(QUEUE_DIR, f);
        fs.renameSync(filepath, dest);
        console.log(`  QUEUED: ${f}`);
        moved++;
      }
    } catch { /* skip */ }
  }

  console.log(`${moved} draft(s) moved to queue.`);
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
