#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outputDir = path.join(root, "state", "resume");
const markdownPath = path.join(outputDir, "current.md");
const jsonPath = path.join(outputDir, "current.json");

function safeReadJson(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function safeExec(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8"
    }).trim();
  } catch {
    return null;
  }
}

function buildWorktreeSummary() {
  const output = safeExec("git", ["status", "--short", "--untracked-files=all"]) ?? "";
  const lines = output.split("\n").filter(Boolean);

  return {
    dirty: lines.length > 0,
    changedCount: lines.length,
    sample: lines.slice(0, 10)
  };
}

function maybeEnterpriseSource(activeTask) {
  const taskId = activeTask?.task_id?.toLowerCase?.() ?? "";
  const phase = activeTask?.phase?.toLowerCase?.() ?? "";

  if (taskId.startsWith("ent-") || phase.includes("enterprise")) {
    return "docs/enterprise-vm-reference-report.md";
  }

  return null;
}

function buildMinimalLoadOrder(activeTask) {
  const entries = [];
  const taskBriefManifest = "state/task-briefs/current.json";
  const activeTaskPath = "state/active-task.json";
  const currentCyclePath = "state/current-cycle.json";
  const releaseMetadataPath = "apps/web/src/lib/release-metadata.json";
  const changelogPath = "CHANGELOG.md";

  if (fs.existsSync(path.join(root, taskBriefManifest))) {
    entries.push(taskBriefManifest);
  }

  entries.push(activeTaskPath);

  const taskId = activeTask?.task_id;
  if (typeof taskId === "string" && taskId.length > 0) {
    const taskPath = `tasks/${taskId}.json`;
    if (fs.existsSync(path.join(root, taskPath))) {
      entries.push(taskPath);
    }
  }

  const enterprisePath = maybeEnterpriseSource(activeTask);
  if (enterprisePath) {
    entries.push(enterprisePath);
  }

  entries.push(currentCyclePath, releaseMetadataPath, changelogPath);

  return entries.filter((value, index, array) => array.indexOf(value) === index);
}

function buildVerificationCommands() {
  return [
    "npm run release:status",
    "npm run type-check",
    "npm run test",
    "npm run build"
  ];
}

const currentCycle = safeReadJson("state/current-cycle.json");
const activeTask = safeReadJson("state/active-task.json");
const nextQueue = safeReadJson("state/next-queue.json");
const releaseMetadata = safeReadJson("apps/web/src/lib/release-metadata.json");
const branch = safeExec("git", ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown";
const commit = safeExec("git", ["rev-parse", "--short", "HEAD"]) ?? "unknown";
const worktree = buildWorktreeSummary();
const generatedAt = new Date().toISOString();
const minimalLoadOrder = buildMinimalLoadOrder(activeTask);
const verificationCommands = buildVerificationCommands();

const packet = {
  generatedAt,
  repo: {
    root,
    branch,
    commit
  },
  release: {
    current: releaseMetadata?.currentRelease ?? null,
    upcomingPatch: releaseMetadata?.upcomingPatch ?? null
  },
  currentCycle,
  activeTask,
  nextQueue: {
    queued_task_ids: nextQueue?.queued_task_ids ?? [],
    notes: nextQueue?.notes?.slice?.(0, 5) ?? []
  },
  worktree,
  minimalLoadOrder,
  verificationCommands
};

const markdown = `# Current Resume Packet

Generated: ${generatedAt}

## Repo

- Root: \`${root}\`
- Branch: \`${branch}\`
- Commit: \`${commit}\`

## Release

- Current: \`${releaseMetadata?.currentRelease?.label ?? "unknown"}\` / \`${releaseMetadata?.currentRelease?.version ?? "unknown"}\`
- Upcoming patch: \`${releaseMetadata?.upcomingPatch?.label ?? "none"}\` / \`${releaseMetadata?.upcomingPatch?.version ?? "none"}\`

## Active Cycle

- Phase: \`${currentCycle?.current_phase ?? "unknown"}\`
- Focus: ${currentCycle?.current_focus ?? "unknown"}
- Last verification: ${currentCycle?.last_verification_result ?? "unknown"}

## Active Task

- Task ID: \`${activeTask?.task_id ?? "none"}\`
- Status: \`${activeTask?.status ?? "unknown"}\`
- Title: ${activeTask?.title ?? "unknown"}
- Owner role: \`${activeTask?.owner_role ?? "unknown"}\`

## Next Queue

${(nextQueue?.queued_task_ids ?? []).length > 0 ? (nextQueue.queued_task_ids ?? []).map((item) => `- \`${item}\``).join("\n") : "- none recorded"}

## Worktree

- Dirty: \`${String(worktree.dirty)}\`
- Changed entries: \`${worktree.changedCount}\`
${worktree.sample.length > 0 ? worktree.sample.map((line) => `- \`${line}\``).join("\n") : "- clean"}

## Minimal Load Order

${minimalLoadOrder.map((entry, index) => `${index + 1}. \`${entry}\``).join("\n")}

## Verification Commands

${verificationCommands.map((command) => `- \`${command}\``).join("\n")}
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(markdownPath, `${markdown}\n`);
fs.writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);

console.log(`Wrote resume packet: ${markdownPath}`);
console.log(`Wrote resume packet JSON: ${jsonPath}`);
