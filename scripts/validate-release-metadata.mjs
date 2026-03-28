import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metadataPath = path.join(root, "apps/web/src/lib/release-metadata.json");
const changelogPath = path.join(root, "CHANGELOG.md");

let failed = 0;

function ok(message) {
  console.log(`OK    ${message}`);
}

function fail(message) {
  console.log(`FAIL  ${message}`);
  failed += 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseVersion(value) {
  const match = /^v(\d+)\.(\d+)\.(\d+)(-[A-Za-z0-9.-]+)?$/.exec(value);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    suffix: match[4] ?? ""
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

console.log("CVERiskPilot release metadata validation");
console.log("");

if (!fs.existsSync(metadataPath)) {
  fail(`Missing release metadata file: ${metadataPath}`);
} else {
  ok("Release metadata file exists");
}

if (!fs.existsSync(changelogPath)) {
  fail(`Missing changelog: ${changelogPath}`);
}

if (failed > 0) {
  process.exit(1);
}

const metadata = readJson(metadataPath);
const changelog = fs.readFileSync(changelogPath, "utf8");

if (metadata.schemaVersion === 1) {
  ok("Release metadata schema version is supported");
} else {
  fail(`Unsupported release metadata schema version: ${metadata.schemaVersion}`);
}

if (Array.isArray(metadata.releasePolicy?.patchRequirements) && metadata.releasePolicy.patchRequirements.length > 0) {
  ok("Patch release requirements are defined");
} else {
  fail("Patch release requirements are missing");
}

if (Array.isArray(metadata.releasePolicy?.minorRequirements) && metadata.releasePolicy.minorRequirements.length > 0) {
  ok("Minor release requirements are defined");
} else {
  fail("Minor release requirements are missing");
}

const currentRelease = metadata.currentRelease ?? {};
const upcomingPatch = metadata.upcomingPatch ?? {};
const history = Array.isArray(metadata.history) ? metadata.history : [];

for (const [label, value] of Object.entries({
  "current release label": currentRelease.label,
  "current release version": currentRelease.version,
  "current release date": currentRelease.date,
  "current release changelog heading": currentRelease.changelogHeading,
  "upcoming patch version": upcomingPatch.version
})) {
  if (isNonEmptyString(value)) {
    ok(`${label} is present`);
  } else {
    fail(`${label} is missing`);
  }
}

const currentVersion = parseVersion(currentRelease.version ?? "");
if (currentVersion) {
  ok(`Current release version parses (${currentRelease.version})`);
} else {
  fail(`Current release version is not semver-like: ${currentRelease.version}`);
}

const upcomingVersion = parseVersion(upcomingPatch.version ?? "");
if (upcomingVersion) {
  ok(`Upcoming patch version parses (${upcomingPatch.version})`);
} else {
  fail(`Upcoming patch version is not semver-like: ${upcomingPatch.version}`);
}

if (currentVersion && upcomingVersion) {
  const sameMajorMinor =
    currentVersion.major === upcomingVersion.major &&
    currentVersion.minor === upcomingVersion.minor;
  const patchIncremented = upcomingVersion.patch === currentVersion.patch + 1;
  const sameSuffix = currentVersion.suffix === upcomingVersion.suffix;

  if (sameMajorMinor && patchIncremented && sameSuffix) {
    ok("Upcoming patch version increments the current live version correctly");
  } else {
    fail(
      `Upcoming patch version must advance ${currentRelease.version} by one patch on the same channel`
    );
  }
}

if (Array.isArray(currentRelease.highlights) && currentRelease.highlights.length > 0) {
  ok("Current release highlights are populated");
} else {
  fail("Current release highlights are missing");
}

if (Array.isArray(currentRelease.trustSignals) && currentRelease.trustSignals.length > 0) {
  ok("Current release trust signals are populated");
} else {
  fail("Current release trust signals are missing");
}

if (history.length > 0 && history[0]?.version === currentRelease.version) {
  ok("Release history starts with the current live release");
} else {
  fail("Release history must include the current live release as the first entry");
}

if (changelog.includes("## Unreleased")) {
  ok("CHANGELOG.md includes an Unreleased section");
} else {
  fail("CHANGELOG.md must include an Unreleased section");
}

if (isNonEmptyString(currentRelease.changelogHeading) && changelog.includes(currentRelease.changelogHeading)) {
  ok("CHANGELOG.md includes the current live release heading");
} else {
  fail("CHANGELOG.md is missing the current live release heading from release metadata");
}

if (failed > 0) {
  process.exit(1);
}

console.log("");
console.log("Release metadata validation passed.");
