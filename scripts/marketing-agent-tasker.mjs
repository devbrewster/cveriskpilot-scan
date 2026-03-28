import fs from "node:fs";
import path from "node:path";

const root = "/home/gonti/cveriskpilot";
const stateDir = path.join(root, "state");
const marketingDir = path.join(stateDir, "marketing");
const generatedDir = path.join(marketingDir, "generated");
const policyPath = path.join(marketingDir, "publishing-policy.json");
const releaseMetadataPath = path.join(root, "apps", "web", "src", "lib", "release-metadata.json");
const changelogPath = path.join(root, "CHANGELOG.md");
const currentCyclePath = path.join(stateDir, "current-cycle.json");
const activeTaskPath = path.join(stateDir, "active-task.json");
const nextQueuePath = path.join(stateDir, "next-queue.json");
const betaLaunchDir = path.join(root, "beta-launch");
const finalReportsDir = path.join(root, "reports", "final");

const roleGuidance = {
  marketing_strategist: {
    focus:
      "Turn repo truth into a consistent visibility narrative without exaggerating release posture or roadmap certainty.",
    deliverables: [
      "A short marketing narrative for the current week.",
      "One recommended posting order across progress, patch, roadmap, and implementation updates.",
      "A note about any truthfulness or timing risk before publishing."
    ]
  },
  release_announcer: {
    focus:
      "Own patch and release-facing updates, staying aligned with release metadata, changelog entries, and dated evidence.",
    deliverables: [
      "Patch or release-ready post copy.",
      "A release-truth check against CHANGELOG.md and release-metadata.json.",
      "A brief callout if a release claim should wait for more evidence."
    ]
  },
  feature_promoter: {
    focus:
      "Turn planned or in-flight work into upcoming-feature visibility without claiming unfinished work is live.",
    deliverables: [
      "A concise upcoming-features post grounded in planned items or queued work.",
      "A short note separating shipped behavior from roadmap signals."
    ]
  },
  linkedin_publisher: {
    focus:
      "Prepare LinkedIn-safe copy from the same repo truth, but keep publishing manual or routed through an approved scheduler instead of direct site automation.",
    deliverables: [
      "A LinkedIn-ready narrative grounded in shipped or planned repo truth.",
      "A note separating operator-verified release facts from broader brand framing.",
      "A reminder that LinkedIn publishing remains a manual approval step in this repo."
    ]
  },
  x_publisher: {
    focus:
      "Prepare X-ready post formatting, keep copy within limits, and preserve a manual approval gate before any live posting.",
    deliverables: [
      "Final short-form copy for X.",
      "Character counts and posting order.",
      "A final approval checklist with source paths."
    ]
  }
};

const supportedRoles = new Set(Object.keys(roleGuidance));

function normalizePlatforms(rawPolicy) {
  if (Array.isArray(rawPolicy.platforms) && rawPolicy.platforms.length > 0) {
    return rawPolicy.platforms.filter((platform) => typeof platform === "string" && platform.trim().length > 0);
  }

  if (typeof rawPolicy.platform === "string" && rawPolicy.platform.trim().length > 0) {
    return [rawPolicy.platform.trim()];
  }

  return ["x"];
}

function normalizeMarketingPolicy(rawPolicy) {
  const platforms = normalizePlatforms(rawPolicy);
  const primaryPlatform =
    typeof rawPolicy.platform === "string" && rawPolicy.platform.trim().length > 0
      ? rawPolicy.platform.trim()
      : platforms.includes("x")
        ? "x"
        : (platforms[0] ?? "x");
  const accountHandles =
    rawPolicy.account_handles && typeof rawPolicy.account_handles === "object"
      ? rawPolicy.account_handles
      : {};
  const characterLimits =
    rawPolicy.character_limits && typeof rawPolicy.character_limits === "object"
      ? rawPolicy.character_limits
      : {};
  const maxCharacters =
    typeof rawPolicy.max_characters_per_post === "number" && rawPolicy.max_characters_per_post > 0
      ? rawPolicy.max_characters_per_post
      : typeof characterLimits[primaryPlatform] === "number" && characterLimits[primaryPlatform] > 0
        ? characterLimits[primaryPlatform]
        : 280;
  const roles =
    Array.isArray(rawPolicy.roles) && rawPolicy.roles.length > 0
      ? rawPolicy.roles.filter((role) => typeof role === "string" && role.trim().length > 0)
      : ["marketing_strategist", "release_announcer", "feature_promoter", "x_publisher"];
  const unsupportedRoles = roles.filter((role) => !supportedRoles.has(role));

  if (unsupportedRoles.length > 0) {
    throw new Error(
      `Unsupported marketing role(s) in ${policyPath}: ${unsupportedRoles.join(", ")}`
    );
  }

  return {
    ...rawPolicy,
    platforms,
    platform: primaryPlatform,
    account_handles: accountHandles,
    account_handle:
      typeof rawPolicy.account_handle === "string"
        ? rawPolicy.account_handle
        : accountHandles[primaryPlatform] ?? "",
    character_limits: characterLimits,
    max_characters_per_post: maxCharacters,
    roles,
    source_of_truth: Array.isArray(rawPolicy.source_of_truth) ? rawPolicy.source_of_truth : [],
    posting_rules: Array.isArray(rawPolicy.posting_rules) ? rawPolicy.posting_rules : [],
    approval_required: rawPolicy.approval_required !== false,
    post_queue_dir:
      typeof rawPolicy.post_queue_dir === "string" && rawPolicy.post_queue_dir.length > 0
        ? rawPolicy.post_queue_dir
        : "social/queue"
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureDir(filePath) {
  fs.mkdirSync(filePath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function nowIso() {
  return new Date().toISOString();
}

function formatBullets(items, formatter = (value) => value) {
  if (!Array.isArray(items) || items.length === 0) {
    return "- none";
  }

  return items.map((item) => `- ${formatter(item)}`).join("\n");
}

function formatPaths(paths) {
  return formatBullets(paths, (value) => path.join(root, value));
}

function shortText(value, maxLength = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, Math.max(0, maxLength - 1));
  const boundary = truncated.lastIndexOf(" ");
  return `${(boundary > 48 ? truncated.slice(0, boundary) : truncated).trim()}…`;
}

function normalizeFocus(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const splitOnAfter = normalized.split(/\s+after\s+/i)[0] ?? normalized;
  return shortText(splitOnAfter.replace(/[.,;:]+$/, ""), 76);
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function titleFromFileName(fileName) {
  return shortText(
    fileName
      .replace(/\.(md|jsonl)$/i, "")
      .replace(/^\d{4}-\d{2}-\d{2}-/, "")
      .replaceAll("-", " "),
    72
  );
}

function listRecentFiles(directoryPath, limit = 3) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath)
    .filter((entry) => entry.endsWith(".md"))
    .filter((entry) => !["README.md", "report-template.md"].includes(entry))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((entry) => ({
      name: entry,
      title: titleFromFileName(entry),
      relativePath: path.relative(root, path.join(directoryPath, entry)),
      absolutePath: path.join(directoryPath, entry)
    }));
}

function extractSection(changelog, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedHeading}[\\s\\S]*?(?=\\n## |$)`);
  const match = changelog.match(pattern);
  return match?.[0] ?? "";
}

function extractBullets(section, heading) {
  if (!section) {
    return [];
  }

  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`);
  const match = section.match(pattern);

  if (!match) {
    return [];
  }

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim());
}

function loadUpcomingTaskSignals(limit = 3) {
  const tasksDir = path.join(root, "tasks");
  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  const files = fs
    .readdirSync(tasksDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort();

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const statusRank = { in_progress: 0, ready: 1, blocked: 2, planned: 3, completed: 4 };

  const tasks = files
    .map((file) => {
      const task = readJson(path.join(tasksDir, file));
      return { ...task, sourceFile: file, relativePath: path.join("tasks", file) };
    })
    .filter((task) => task.sourceFile !== "task-template.json")
    .filter((task) => task.id !== "task-id")
    .filter((task) => task.title !== "Task title")
    .filter((task) => task.status !== "completed")
    .sort((left, right) => {
      const leftStatus = statusRank[left.status] ?? 99;
      const rightStatus = statusRank[right.status] ?? 99;

      if (leftStatus !== rightStatus) {
        return leftStatus - rightStatus;
      }

      const leftPriority = priorityRank[left.priority] ?? 99;
      const rightPriority = priorityRank[right.priority] ?? 99;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return String(left.title).localeCompare(String(right.title));
    })
    .slice(0, limit)
    .map((task) => ({
      id: task.id,
      title: shortText(task.title, 72),
      nextAction: shortText(task.next_action ?? "", 110),
      relativePath: task.relativePath
    }));

  return tasks;
}

function toDraft(id, category, text, sourcePaths, policy) {
  const normalizedText = shortText(text, policy.max_characters_per_post);

  return {
    id,
    category,
    platform: policy.platform,
    text: normalizedText,
    character_count: normalizedText.length,
    max_characters: policy.max_characters_per_post,
    source_paths: uniquePaths(sourcePaths)
  };
}

function buildDrafts(context) {
  const {
    policy,
    releaseMetadata,
    currentCycle,
    activeTask,
    unreleasedPlanned,
    recentBetaEvidence,
    recentFinalReports,
    upcomingTasks
  } = context;
  const currentRelease = releaseMetadata.currentRelease;
  const upcomingPatch = releaseMetadata.upcomingPatch;
  const highlightTitles = currentRelease.highlights.map((item) => item.title).slice(0, 2).join("; ");
  const plannedItems = unreleasedPlanned.slice(0, 2).join("; ");
  const firstUpcomingTask = upcomingTasks[0]?.title ?? "the next verified backlog slice";
  const latestEvidence = recentBetaEvidence[0]?.title ?? recentFinalReports[0]?.title ?? "recent verification evidence";
  const progressSignal =
    activeTask.status === "completed"
      ? normalizeFocus(currentCycle.current_focus)
      : shortText(activeTask.title, 70);

  return [
    toDraft(
      "progress-update",
      "progress_update",
      `${policy.brand_name} progress: ${progressSignal}. ${currentRelease.label} ${currentRelease.version} stays live. Latest evidence: ${latestEvidence}. Track shipped changes in /changelog.`,
      [path.relative(root, activeTaskPath), path.relative(root, currentCyclePath), recentBetaEvidence[0]?.relativePath ?? "CHANGELOG.md"],
      policy
    ),
    toDraft(
      "patch-release-update",
      "patch_release_update",
      `Patch watch for ${policy.brand_name}: ${upcomingPatch.version} is reserved as the next ${upcomingPatch.channel} ${upcomingPatch.releaseType}. We will only call it shipped after changelog, verification, and deployment evidence line up.`,
      [path.relative(root, releaseMetadataPath), "CHANGELOG.md", recentFinalReports[0]?.relativePath ?? path.relative(root, currentCyclePath)],
      policy
    ),
    toDraft(
      "upcoming-feature-update",
      "upcoming_features",
      `${policy.brand_name} upcoming work: ${plannedItems || firstUpcomingTask}. We only preview items that already exist in repo planning or release notes, not speculative roadmap filler.`,
      [
        "CHANGELOG.md",
        upcomingTasks[0]?.relativePath ?? path.relative(root, nextQueuePath),
        upcomingTasks[1]?.relativePath ?? path.relative(root, nextQueuePath)
      ].filter(Boolean),
      policy
    ),
    toDraft(
      "implementation-snapshot",
      "implementation_snapshot",
      `What is live in ${policy.brand_name} today: ${highlightTitles}. Public trust routes, release markers, and beta evidence stay visible so teams can verify what is actually implemented.`,
      [path.relative(root, releaseMetadataPath), "CHANGELOG.md", recentFinalReports[0]?.relativePath ?? "reports/final/README.md"],
      policy
    )
  ];
}

function buildOverview(context, drafts, roleBriefPaths) {
  return `# Marketing Agent Overview

Generated: ${nowIso()}
Brand: ${context.policy.brand_name}
Platform: ${context.policy.platform}
Approval required: ${context.policy.approval_required ? "yes" : "no"}
Configured account handle: ${context.policy.account_handle || "(not set)"}

## Current Release

Label: ${context.releaseMetadata.currentRelease.label}
Version: ${context.releaseMetadata.currentRelease.version}
Date: ${context.releaseMetadata.currentRelease.date}
Status: ${context.releaseMetadata.currentRelease.status}

## Current Execution Context

Current focus: ${context.currentCycle.current_focus}
Active task: ${context.activeTask.title}
Release posture: ${context.currentCycle.release_posture}

## Upcoming Signals

${formatBullets(context.upcomingTasks, (task) => `${task.title} (${path.join(root, task.relativePath)})`)}

## Recent Evidence

Beta launch:
${formatBullets(context.recentBetaEvidence, (entry) => `${entry.title} (${entry.absolutePath})`)}

Final reports:
${formatBullets(context.recentFinalReports, (entry) => `${entry.title} (${entry.absolutePath})`)}

## Draft Queue

${formatBullets(drafts, (draft) => `${draft.id} [${draft.character_count}/${draft.max_characters}]`)}

## Role Briefs

${formatBullets(context.policy.roles, (role) => `${role} -> ${path.join(root, roleBriefPaths[role])}`)}
`;
}

function buildDraftsMarkdown(drafts) {
  return `# X Draft Queue

Generated: ${nowIso()}

${drafts
    .map(
      (draft) => `## ${draft.id}

Category: ${draft.category}
Platform: ${draft.platform}
Length: ${draft.character_count}/${draft.max_characters}

\`\`\`text
${draft.text}
\`\`\`

Sources:
${formatPaths(draft.source_paths)}
`
    )
    .join("\n")}`;
}

function buildRoleBrief(context, role, briefRelativePath, drafts) {
  const guidance = roleGuidance[role];
  const categoryByRole = {
    marketing_strategist: ["progress_update", "implementation_snapshot"],
    release_announcer: ["patch_release_update"],
    feature_promoter: ["upcoming_features"],
    linkedin_publisher: ["progress_update", "patch_release_update", "upcoming_features", "implementation_snapshot"],
    x_publisher: drafts.map((draft) => draft.category)
  };
  const assignedCategories = categoryByRole[role] ?? [];
  const draftReviewFile =
    role === "x_publisher"
      ? path.join(generatedDir, "x-drafts.md")
      : path.join(generatedDir, "overview.md");
  const draftReviewNote =
    role === "linkedin_publisher"
      ? "Use the shared overview and repo-truth sources to adapt approved LinkedIn copy manually."
      : "Use the generated queue as the final review surface before approval.";

  return `# Marketing Worker Brief

Repo root: ${root}
Generated: ${nowIso()}
Role: ${role}
Brief path: ${path.join(root, briefRelativePath)}

## Role Focus

${guidance.focus}

Deliverables:
${formatBullets(guidance.deliverables)}

## Current Context

- Current release: ${context.releaseMetadata.currentRelease.label} ${context.releaseMetadata.currentRelease.version}
- Upcoming patch: ${context.releaseMetadata.upcomingPatch.version}
- Active task: ${context.activeTask.title}
- Current focus: ${context.currentCycle.current_focus}
- Release posture: ${context.currentCycle.release_posture}
- Account handle: ${context.policy.account_handle || "(not configured)"}

## Assigned Draft Categories

${formatBullets(assignedCategories)}

## Source Of Truth

${formatPaths(context.policy.source_of_truth)}

## Draft Review File

- ${draftReviewFile}
- ${draftReviewNote}

## Recent Signals

Upcoming tasks:
${formatBullets(context.upcomingTasks, (task) => `${task.title} (${path.join(root, task.relativePath)})`)}

Recent beta evidence:
${formatBullets(context.recentBetaEvidence, (entry) => `${entry.title} (${entry.absolutePath})`)}

Recent final reports:
${formatBullets(context.recentFinalReports, (entry) => `${entry.title} (${entry.absolutePath})`)}

## Approval Rules

${formatBullets(context.policy.posting_rules)}
`;
}

function buildContext() {
  const policy = normalizeMarketingPolicy(readJson(policyPath));
  const releaseMetadata = readJson(releaseMetadataPath);

  // Gracefully handle missing state files with sensible defaults
  const currentCycle = fs.existsSync(currentCyclePath)
    ? readJson(currentCyclePath)
    : { current_focus: "MVP scaffold", release_posture: "pre-beta" };
  const activeTask = fs.existsSync(activeTaskPath)
    ? readJson(activeTaskPath)
    : { title: "Social media marketing automation", status: "in_progress" };
  const nextQueue = fs.existsSync(nextQueuePath)
    ? readJson(nextQueuePath)
    : { notes: [] };

  const changelog = readText(changelogPath);
  const unreleasedSection = extractSection(changelog, "## Unreleased");
  const unreleasedPlanned = extractBullets(unreleasedSection, "### Planned");
  const upcomingTasksFromTasks = loadUpcomingTaskSignals();
  const queueSignals = (nextQueue.notes ?? []).slice(0, 3).map((note, index) => ({
    id: `queue-note-${index + 1}`,
    title: shortText(note, 88),
    nextAction: shortText(note, 110),
    relativePath: path.join("state", "next-queue.json")
  }));
  const upcomingTasks = upcomingTasksFromTasks.length > 0 ? upcomingTasksFromTasks : queueSignals;
  const recentBetaEvidence = listRecentFiles(betaLaunchDir, 3);
  const recentFinalReports = listRecentFiles(finalReportsDir, 3);

  return {
    policy,
    releaseMetadata,
    currentCycle,
    activeTask,
    nextQueue,
    unreleasedPlanned,
    upcomingTasks,
    recentBetaEvidence,
    recentFinalReports
  };
}

function generate() {
  ensureDir(generatedDir);

  const context = buildContext();
  const drafts = buildDrafts(context);
  const roleBriefPaths = {};
  const roleBriefs = [];

  for (const role of context.policy.roles) {
    const briefRelativePath = path.join("state", "marketing", "generated", `${role}.md`);
    const briefAbsolutePath = path.join(root, briefRelativePath);
    writeText(briefAbsolutePath, buildRoleBrief(context, role, briefRelativePath, drafts));

    roleBriefPaths[role] = briefRelativePath;
    roleBriefs.push({
      role,
      relative_path: briefRelativePath,
      absolute_path: briefAbsolutePath
    });
  }

  const overviewRelativePath = path.join("state", "marketing", "generated", "overview.md");
  const overviewAbsolutePath = path.join(root, overviewRelativePath);
  writeText(overviewAbsolutePath, buildOverview(context, drafts, roleBriefPaths));

  const draftsRelativePath = path.join("state", "marketing", "generated", "x-drafts.md");
  const draftsAbsolutePath = path.join(root, draftsRelativePath);
  writeText(draftsAbsolutePath, buildDraftsMarkdown(drafts));

  const manifest = {
    generated_at: nowIso(),
    repo_root: root,
    platform: context.policy.platform,
    platforms: context.policy.platforms,
    brand_name: context.policy.brand_name,
    account_handle: context.policy.account_handle,
    account_handles: context.policy.account_handles,
    approval_required: context.policy.approval_required,
    overview: {
      relative_path: overviewRelativePath,
      absolute_path: overviewAbsolutePath
    },
    drafts: {
      relative_path: draftsRelativePath,
      absolute_path: draftsAbsolutePath,
      entries: drafts
    },
    role_briefs: roleBriefs,
    source_paths: context.policy.source_of_truth.map((entry) => path.join(root, entry))
  };

  writeJson(path.join(generatedDir, "current.json"), manifest);

  console.log(`Generated marketing worker briefs for ${context.policy.brand_name}.`);
  console.log(`Overview: ${overviewAbsolutePath}`);
  console.log(`Drafts: ${draftsAbsolutePath}`);
}

function getWatchKey() {
  const relevantFiles = [
    policyPath,
    releaseMetadataPath,
    changelogPath,
    currentCyclePath,
    activeTaskPath,
    nextQueuePath,
    ...listRecentFiles(betaLaunchDir, 3).map((entry) => entry.absolutePath),
    ...listRecentFiles(finalReportsDir, 3).map((entry) => entry.absolutePath)
  ];

  const tasksDir = path.join(root, "tasks");
  const taskStat = fs.existsSync(tasksDir)
    ? fs
        .readdirSync(tasksDir)
        .filter((entry) => entry.endsWith(".json"))
        .sort()
        .map((entry) => fs.statSync(path.join(tasksDir, entry)).mtimeMs)
        .join("|")
    : "";

  return JSON.stringify({
    files: relevantFiles.map((filePath) => ({
      filePath,
      mtimeMs: fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0
    })),
    taskStat
  });
}

function watch() {
  const intervalSeconds = 15;
  console.log(`Watching marketing sources every ${intervalSeconds} second(s).`);

  let lastKey = null;

  const run = () => {
    const nextKey = getWatchKey();
    if (nextKey === lastKey) {
      return;
    }

    lastKey = nextKey;
    generate();
  };

  run();
  setInterval(run, intervalSeconds * 1000);
}

function main() {
  const command = process.argv[2] ?? "generate";

  if (command === "generate") {
    generate();
    return;
  }

  if (command === "watch") {
    watch();
    return;
  }

  throw new Error(`Unsupported command '${command}'. Use 'generate' or 'watch'.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
