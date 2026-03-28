#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TwitterApi } from "twitter-api-v2";

const root = "/home/gonti/cveriskpilot";
const configPath = path.join(root, "social", "config.json");
const envPath = path.join(root, ".env.local");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const options = {
    id: null,
    all: false,
    publish: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--id") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --id");
      }

      options.id = value;
      index += 1;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      continue;
    }

    if (arg === "--publish") {
      options.publish = true;
      continue;
    }

    throw new Error("Unsupported argument. Use --id <post-id>, --all, and/or --publish.");
  }

  if (!options.id && !options.all) {
    throw new Error("Select a queued post with --id <post-id> or use --all.");
  }

  if (options.id && options.all) {
    throw new Error("Use either --id <post-id> or --all, not both.");
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

  return {
    characterLimit:
      typeof xConfig.character_limit === "number" && xConfig.character_limit > 0
        ? xConfig.character_limit
        : 280,
    queueDir: path.join(root, config.bot_instructions?.queue_dir ?? "social/queue")
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

function collectValidationErrors(post, characterLimit) {
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

  if (content.length > characterLimit) {
    errors.push(`platforms.x.content is ${content.length} characters, over the ${characterLimit} limit`);
  }

  if (typeof post.image_asset === "string" && post.image_asset.length > 0) {
    const imagePath = path.join(root, post.image_asset);
    if (!fs.existsSync(imagePath)) {
      errors.push(`image_asset does not exist: ${post.image_asset}`);
    }
  }

  return errors;
}

function runPublisher(options) {
  const args = ["scripts/publish-x-posts.mjs"];

  if (options.id) {
    args.push("--id", options.id);
  }

  const result = spawnSync("node", args, {
    cwd: root,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`publish-x-posts.mjs exited with status ${result.status ?? "unknown"}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { characterLimit, queueDir } = resolveConfig();
  const queueFiles = listQueueFiles(queueDir);
  const selectedFiles = options.id
    ? queueFiles.filter((filePath) => path.basename(filePath, ".json") === options.id)
    : queueFiles;

  if (options.id && selectedFiles.length === 0) {
    throw new Error(`No queued post found for id '${options.id}' in ${queueDir}`);
  }

  if (selectedFiles.length === 0) {
    throw new Error(`No queued posts found in ${queueDir}`);
  }

  let hasErrors = false;
  for (const filePath of selectedFiles) {
    const post = readJson(filePath);
    const errors = collectValidationErrors(post, characterLimit);

    if (errors.length > 0) {
      hasErrors = true;
      console.log(`PRECHECK FAIL ${post.id ?? path.basename(filePath)}: ${errors.join("; ")}`);
      continue;
    }

    console.log(
      `PRECHECK OK ${post.id}: ${post.platforms.x.content.trim().length}/${characterLimit} chars, approved by ${post.approved_by}`
    );
  }

  if (hasErrors) {
    throw new Error("Queued X posts failed validation.");
  }

  const client = getXClient();
  const me = await client.v2.me();
  console.log(`AUTH OK @${me.data.username} (${me.data.name})`);

  if (!options.publish) {
    console.log("Preflight complete. Re-run with --publish to send the queued post(s).");
    return;
  }

  runPublisher(options);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
