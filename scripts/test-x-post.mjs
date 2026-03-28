#!/usr/bin/env node

import { TwitterApi } from "twitter-api-v2";
import fs from "node:fs";
import path from "node:path";

// Load .env.local
const envPath = path.join("/home/gonti/cveriskpilot", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  env[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
}

const required = ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
const missing = required.filter((k) => !env[k]);
if (missing.length > 0) {
  console.error(`Missing credentials: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new TwitterApi({
  appKey: env.X_API_KEY,
  appSecret: env.X_API_KEY_SECRET,
  accessToken: env.X_ACCESS_TOKEN,
  accessSecret: env.X_ACCESS_TOKEN_SECRET,
});

console.log("Verifying credentials...");
const me = await client.v2.me();
console.log(`OK  Authenticated as @${me.data.username} (${me.data.name})`);

console.log("Posting test tweet...");
const tweet = await client.v2.tweet(
  "CVERiskPilot social publishing is live. #CVERiskPilot #DevSecOps"
);
console.log(`OK  Posted tweet ID: ${tweet.data.id}`);
console.log(`    https://x.com/${me.data.username}/status/${tweet.data.id}`);
