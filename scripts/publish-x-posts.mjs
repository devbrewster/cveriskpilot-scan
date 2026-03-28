#!/usr/bin/env node

import { TwitterApi } from "twitter-api-v2";
import fs from "node:fs";
import path from "node:path";

const root = "/home/gonti/cveriskpilot";
const configPath = path.join(root, "social", "config.json");
const envPath = path.join(root, ".env.local");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    id: null
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

function getXClient() {
  const env = loadEnvFile(envPath);
  const required = ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing X credentials in .env.local: ${missing.join(", ")}`);
  }

  return new TwitterApi({
    appKey: env.X_API_KEY,
    appSecret: env.X_API_KEY_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessSecret: env.X_ACCESS_TOKEN_SECRET
  });
}

function resolveConfig() {
  const config = readJson(configPath);
  const xConfig = config.platforms?.x;

  if (!xConfig?.enabled) {
    throw new Error("X publishing is disabled in social/config.json");
  }

  const queueDir = path.join(root, config.bot_instructions?.queue_dir ?? "social/queue");
  const publishedDir = path.join(root, config.bot_instructions?.published_dir ?? "social/published");

  return {
    config,
    x: {
      accountHandle: xConfig.account_handle ?? "",
      characterLimit:
        typeof xConfig.character_limit === "number" && xConfig.character_limit > 0
          ? xConfig.character_limit
          : 280
    },
    queueDir,
    publishedDir
  };
}

function listQueueFiles(queueDir) {
  if (!fs.existsSync(queueDir)) {
    return [];
  }

  return fs
    .readdirSync(queueDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => path.join(queueDir, entry));
}

function collectValidationErrors(post, xConfig) {
  const errors = [];
  const xPost = post.platforms?.x;

  if (post.status !== "ready") {
    errors.push(`top-level status must be 'ready' (received '${post.status ?? "missing"}')`);
  }

  if (!post.approved_by) {
    errors.push("approved_by must be set");
  }

  if (!xPost) {
    errors.push("platforms.x is missing");
    return errors;
  }

  if (xPost.status !== "ready") {
    errors.push(`platforms.x.status must be 'ready' (received '${xPost.status ?? "missing"}')`);
  }

  const content = typeof xPost.content === "string" ? xPost.content.trim() : "";
  if (!content) {
    errors.push("platforms.x.content must be a non-empty string");
  }

  if (typeof xPost.note === "string" && /native x poll/i.test(xPost.note)) {
    errors.push("native X polls are not implemented by the in-repo publisher yet");
  }

  const length = content.length;
  if (length > xConfig.characterLimit) {
    errors.push(`platforms.x.content is ${length} characters, over the ${xConfig.characterLimit} limit`);
  }

  if (typeof post.image_asset === "string" && post.image_asset.length > 0) {
    const imagePath = path.join(root, post.image_asset);
    if (!fs.existsSync(imagePath)) {
      errors.push(`image_asset does not exist: ${post.image_asset}`);
    }
  }

  return errors;
}

function shouldArchivePost(post) {
  const statuses = Object.values(post.platforms ?? {})
    .map((platform) => platform?.status)
    .filter(Boolean);

  return statuses.length > 0 && statuses.every((status) => status === "published" || status === "draft");
}

async function publishXPost(client, post) {
  const xPost = post.platforms.x;
  const payload = {
    text: xPost.content
  };

  if (typeof post.image_asset === "string" && post.image_asset.length > 0) {
    const mediaPath = path.join(root, post.image_asset);
    const mediaId = await client.v1.uploadMedia(mediaPath);
    payload.media = { media_ids: [mediaId] };
  }

  return client.v2.tweet(payload);
}

function archivePublishedPost(filePath, publishedDir, post) {
  fs.mkdirSync(publishedDir, { recursive: true });

  const nextPath = path.join(publishedDir, path.basename(filePath));
  writeJson(nextPath, post);
  fs.unlinkSync(filePath);

  return nextPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { x, queueDir, publishedDir } = resolveConfig();
  const queueFiles = listQueueFiles(queueDir);
  const selectedFiles = options.id
    ? queueFiles.filter((filePath) => path.basename(filePath, ".json") === options.id)
    : queueFiles;

  if (options.id && selectedFiles.length === 0) {
    throw new Error(`No queued post found for id '${options.id}' in ${queueDir}`);
  }

  if (selectedFiles.length === 0) {
    console.log(`No queued posts found in ${queueDir}.`);
    return;
  }

  let client = null;
  let authenticatedUser = null;

  for (const filePath of selectedFiles) {
    const post = readJson(filePath);
    const errors = collectValidationErrors(post, x);

    if (errors.length > 0) {
      console.log(`SKIP ${post.id ?? path.basename(filePath)}: ${errors.join("; ")}`);
      continue;
    }

    const content = post.platforms.x.content.trim();
    const assetSuffix =
      typeof post.image_asset === "string" && post.image_asset.length > 0
        ? ` with asset ${post.image_asset}`
        : "";

    if (options.dryRun) {
      console.log(`DRY RUN ${post.id}: would publish ${content.length}/${x.characterLimit} chars${assetSuffix}`);
      continue;
    }

    if (!client) {
      client = getXClient();
      const me = await client.v2.me();
      authenticatedUser = me.data.username;
      console.log(`Authenticated as @${authenticatedUser}`);
    }

    try {
      const result = await publishXPost(client, post);
      const publishedAt = nowIso();
      const xPost = post.platforms.x;

      xPost.status = "published";
      xPost.character_count = content.length;
      xPost.post_id = result.data.id;
      xPost.published_at = publishedAt;
      delete xPost.error;

      if (shouldArchivePost(post)) {
        post.status = "published";
        post.published_at = publishedAt;
        const archivedPath = archivePublishedPost(filePath, publishedDir, post);
        console.log(
          `PUBLISHED ${post.id}: https://x.com/${authenticatedUser}/status/${result.data.id} -> ${archivedPath}`
        );
      } else {
        writeJson(filePath, post);
        console.log(`PUBLISHED ${post.id}: https://x.com/${authenticatedUser}/status/${result.data.id}`);
      }
    } catch (error) {
      post.platforms.x.status = "error";
      post.platforms.x.error = error instanceof Error ? error.message : String(error);
      post.platforms.x.last_error_at = nowIso();
      writeJson(filePath, post);
      console.log(`ERROR ${post.id}: ${post.platforms.x.error}`);
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
