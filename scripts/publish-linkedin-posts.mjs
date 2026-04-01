#!/usr/bin/env node

/**
 * LinkedIn Publisher — mirrors publish-x-posts.mjs
 *
 * Reads queued posts from social/queue/linkedin/, publishes via
 * LinkedIn REST API v2, moves published files to social/posted/linkedin/,
 * and logs results to state/marketing/linkedin-log.json.
 *
 * Env vars (in .env.local):
 *   LINKEDIN_ACCESS_TOKEN   — OAuth 2.0 access token
 *   LINKEDIN_PERSON_URN     — e.g. "urn:li:person:abc123" (or org URN)
 *
 * Usage:
 *   node scripts/publish-linkedin-posts.mjs              # publish all ready posts
 *   node scripts/publish-linkedin-posts.mjs --dry-run    # preview without posting
 *   node scripts/publish-linkedin-posts.mjs --id <id>    # publish a single post by id
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const root = "/home/gonti/cveriskpilot";
const configPath = path.join(root, "social", "config.json");
const envPath = path.join(root, ".env.local");
const logPath = path.join(root, "state", "marketing", "linkedin-log.json");
const queueDir = path.join(root, "social", "queue", "linkedin");
const postedDir = path.join(root, "social", "posted", "linkedin");

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// CLI argument parsing (mirrors X publisher)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    dryRun: false,
    id: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--id") {
      const value = argv[index + 1];

      if (!value) {
        throw new Error("Missing value for --id");
      }

      options.id = value;
      index += 1;
      continue;
    }

    throw new Error(`Unsupported argument '${arg}'. Use --dry-run and/or --id <post-id>.`);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Env file loader (same implementation as X publisher)
// ---------------------------------------------------------------------------

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env file: ${filePath}`);
  }

  const env = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  return env;
}

// ---------------------------------------------------------------------------
// LinkedIn credentials
// ---------------------------------------------------------------------------

function getLinkedInCredentials() {
  const env = loadEnvFile(envPath);
  const required = ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing LinkedIn credentials in .env.local: ${missing.join(", ")}`);
  }

  return {
    accessToken: env.LINKEDIN_ACCESS_TOKEN,
    authorUrn: env.LINKEDIN_PERSON_URN,
  };
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

function resolveConfig() {
  const config = readJson(configPath);
  const liConfig = config.platforms?.linkedin;

  if (!liConfig?.enabled) {
    throw new Error("LinkedIn publishing is disabled in social/config.json");
  }

  // LinkedIn character limit is 3000 for posts; config may override
  const characterLimit =
    typeof liConfig.character_limit === "number" && liConfig.character_limit > 0
      ? liConfig.character_limit
      : 3000;

  return {
    config,
    linkedin: {
      accountHandle: liConfig.account_handle ?? "",
      characterLimit,
      recommendedLength: liConfig.recommended_length ?? "600-1200",
    },
  };
}

// ---------------------------------------------------------------------------
// Queue file listing
// ---------------------------------------------------------------------------

function listQueueFiles() {
  if (!fs.existsSync(queueDir)) {
    return [];
  }

  return fs
    .readdirSync(queueDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => path.join(queueDir, entry));
}

// ---------------------------------------------------------------------------
// Normalize posts — supports both individual files and batch files
//
// Individual format (mirrors X publisher):
//   { id, status, approved_by, platforms: { linkedin: { status, content } } }
//
// Batch format (existing LinkedIn queue files):
//   { posts: [{ id, status, content, ... }] }
// ---------------------------------------------------------------------------

function normalizePostsFromFile(filePath) {
  const raw = readJson(filePath);

  // Batch format — array of posts in a campaign file
  if (Array.isArray(raw.posts)) {
    return raw.posts.map((post) => ({
      ...post,
      _batch: true,
      _batchFile: filePath,
      _batchRaw: raw,
      // Normalize platforms wrapper if missing
      platforms: post.platforms ?? {
        linkedin: {
          status: post.status === "ready" ? "ready" : post.status ?? "draft",
          content: post.content ?? "",
        },
      },
      // Ensure top-level status
      status: post.status ?? "draft",
    }));
  }

  // Individual format — single post per file
  return [{ ...raw, _batch: false, _sourceFile: filePath }];
}

// ---------------------------------------------------------------------------
// Validation (mirrors X publisher pattern)
// ---------------------------------------------------------------------------

function collectValidationErrors(post, linkedinConfig) {
  const errors = [];
  const liPost = post.platforms?.linkedin;

  if (post.status !== "ready") {
    errors.push(`top-level status must be 'ready' (received '${post.status ?? "missing"}')`);
  }

  if (!post.approved_by) {
    errors.push("approved_by must be set");
  }

  if (!liPost) {
    errors.push("platforms.linkedin is missing");
    return errors;
  }

  if (liPost.status !== "ready") {
    errors.push(`platforms.linkedin.status must be 'ready' (received '${liPost.status ?? "missing"}')`);
  }

  const content = typeof liPost.content === "string" ? liPost.content.trim() : "";
  if (!content) {
    errors.push("platforms.linkedin.content must be a non-empty string");
  }

  const length = content.length;
  if (length > linkedinConfig.characterLimit) {
    errors.push(
      `platforms.linkedin.content is ${length} characters, over the ${linkedinConfig.characterLimit} limit`
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function loadLog() {
  if (!fs.existsSync(logPath)) {
    return { published: [], errors: [] };
  }

  try {
    return readJson(logPath);
  } catch {
    return { published: [], errors: [] };
  }
}

function isDuplicate(postId, log) {
  return log.published.some((entry) => entry.id === postId);
}

// ---------------------------------------------------------------------------
// LinkedIn REST API v2 — publish a text post via ugcPosts
// ---------------------------------------------------------------------------

function linkedInPost(accessToken, authorUrn, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    });

    const options = {
      hostname: "api.linkedin.com",
      port: 443,
      path: "/v2/ugcPosts",
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            // LinkedIn sometimes returns empty body on 201
            resolve({ id: res.headers["x-restli-id"] ?? "unknown" });
          }
        } else {
          reject(
            new Error(
              `LinkedIn API ${res.statusCode}: ${data.slice(0, 500)}`
            )
          );
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Rate limiting — LinkedIn recommends max 100 posts/day per member
// We enforce a conservative 1 post per 60 seconds minimum gap.
// ---------------------------------------------------------------------------

const MIN_POST_INTERVAL_MS = 60_000;
let lastPostTime = 0;

async function rateLimitWait() {
  const elapsed = Date.now() - lastPostTime;
  if (lastPostTime > 0 && elapsed < MIN_POST_INTERVAL_MS) {
    const waitMs = MIN_POST_INTERVAL_MS - elapsed;
    console.log(`Rate limit: waiting ${Math.ceil(waitMs / 1000)}s before next post...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

// ---------------------------------------------------------------------------
// Archive published post (mirrors X publisher)
// ---------------------------------------------------------------------------

function archivePublishedPost(filePath, post) {
  fs.mkdirSync(postedDir, { recursive: true });
  const nextPath = path.join(postedDir, path.basename(filePath));
  writeJson(nextPath, post);
  fs.unlinkSync(filePath);
  return nextPath;
}

// ---------------------------------------------------------------------------
// Update batch file — for posts that come from campaign/batch files
// ---------------------------------------------------------------------------

function updateBatchFile(batchRaw, postId, updates) {
  const postEntry = batchRaw.posts.find((p) => p.id === postId);
  if (postEntry) {
    Object.assign(postEntry, updates);
  }
}

function saveBatchFile(filePath, batchRaw) {
  writeJson(filePath, batchRaw);
}

function shouldArchiveBatchFile(batchRaw) {
  return batchRaw.posts.every(
    (p) => p.status === "published" || p.status === "draft" || p.status === "error"
  );
}

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

function appendLog(log, entry) {
  if (entry.error) {
    log.errors.push(entry);
  } else {
    log.published.push(entry);
  }

  // Keep log trimmed — last 500 entries per category
  if (log.published.length > 500) {
    log.published = log.published.slice(-500);
  }
  if (log.errors.length > 500) {
    log.errors = log.errors.slice(-500);
  }

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  writeJson(logPath, log);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { linkedin } = resolveConfig();
  const queueFiles = listQueueFiles();
  const log = loadLog();

  if (queueFiles.length === 0) {
    console.log(`No queued posts found in ${queueDir}.`);
    return;
  }

  let credentials = null;
  let publishedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const filePath of queueFiles) {
    const posts = normalizePostsFromFile(filePath);

    // Filter by --id if provided
    const selectedPosts = options.id ? posts.filter((p) => p.id === options.id) : posts;

    for (const post of selectedPosts) {
      const postId = post.id ?? path.basename(filePath, ".json");

      // Duplicate detection
      if (isDuplicate(postId, log)) {
        console.log(`SKIP ${postId}: already published (duplicate detection)`);
        skippedCount += 1;
        continue;
      }

      const errors = collectValidationErrors(post, linkedin);

      if (errors.length > 0) {
        console.log(`SKIP ${postId}: ${errors.join("; ")}`);
        skippedCount += 1;
        continue;
      }

      const content = post.platforms.linkedin.content.trim();

      if (options.dryRun) {
        console.log(
          `DRY RUN ${postId}: would publish ${content.length}/${linkedin.characterLimit} chars`
        );
        console.log(`  Preview: ${content.slice(0, 120)}${content.length > 120 ? "..." : ""}`);
        continue;
      }

      // Lazy-init credentials on first actual publish
      if (!credentials) {
        credentials = getLinkedInCredentials();
        console.log(`Authenticated with URN: ${credentials.authorUrn}`);
      }

      // Rate limiting
      await rateLimitWait();

      try {
        const result = await linkedInPost(credentials.accessToken, credentials.authorUrn, content);
        const publishedAt = nowIso();
        lastPostTime = Date.now();

        // Extract post ID from response
        const linkedInPostId = result.id ?? result["X-RestLi-Id"] ?? "unknown";

        // Log success
        appendLog(log, {
          id: postId,
          linkedin_post_id: linkedInPostId,
          published_at: publishedAt,
          character_count: content.length,
          source_file: path.basename(filePath),
        });

        // Update post data
        if (post._batch) {
          updateBatchFile(post._batchRaw, postId, {
            status: "published",
            published_at: publishedAt,
            linkedin_post_id: linkedInPostId,
            platforms: {
              ...post.platforms,
              linkedin: {
                ...post.platforms.linkedin,
                status: "published",
                post_id: linkedInPostId,
                published_at: publishedAt,
                character_count: content.length,
              },
            },
          });

          saveBatchFile(post._batchFile, post._batchRaw);

          if (shouldArchiveBatchFile(post._batchRaw)) {
            const archivedPath = archivePublishedPost(post._batchFile, post._batchRaw);
            console.log(`PUBLISHED ${postId}: linkedin:${linkedInPostId} -> archived ${archivedPath}`);
          } else {
            console.log(`PUBLISHED ${postId}: linkedin:${linkedInPostId} (batch file updated)`);
          }
        } else {
          // Individual file — update and archive
          const liPost = post.platforms.linkedin;
          liPost.status = "published";
          liPost.post_id = linkedInPostId;
          liPost.published_at = publishedAt;
          liPost.character_count = content.length;
          delete liPost.error;

          post.status = "published";
          post.published_at = publishedAt;

          // Remove internal fields before saving
          const { _batch, _sourceFile, ...cleanPost } = post;
          const archivedPath = archivePublishedPost(filePath, cleanPost);
          console.log(`PUBLISHED ${postId}: linkedin:${linkedInPostId} -> ${archivedPath}`);
        }

        publishedCount += 1;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorAt = nowIso();

        appendLog(log, {
          id: postId,
          error: errorMsg,
          error_at: errorAt,
          source_file: path.basename(filePath),
        });

        if (post._batch) {
          updateBatchFile(post._batchRaw, postId, {
            status: "error",
            error: errorMsg,
            last_error_at: errorAt,
          });
          saveBatchFile(post._batchFile, post._batchRaw);
        } else {
          post.platforms.linkedin.status = "error";
          post.platforms.linkedin.error = errorMsg;
          post.platforms.linkedin.last_error_at = errorAt;
          const { _batch, _sourceFile, ...cleanPost } = post;
          writeJson(filePath, cleanPost);
        }

        console.log(`ERROR ${postId}: ${errorMsg}`);
        errorCount += 1;
      }
    }
  }

  if (!options.dryRun) {
    console.log(
      `\nDone. Published: ${publishedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
