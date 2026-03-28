#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const outputJson = args.has("--json");

const metadataPath = path.join(root, "apps/web/src/lib/release-metadata.json");
const layoutPath = path.join(root, "apps/web/app/layout.tsx");
const apiRoutePath = path.join(root, "apps/web/app/api/public/release/route.ts");

const failures = [];
const warnings = [];
const passes = [];

function record(collection, code, message, evidence = []) {
  collection.push({ code, message, evidence });
}

function ok(message) {
  passes.push(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function printText() {
  console.log("CVERiskPilot release doctor");
  console.log("");

  for (const message of passes) {
    console.log(`OK    ${message}`);
  }

  for (const warning of warnings) {
    console.log(`WARN  ${warning.message}`);
    for (const line of warning.evidence) {
      console.log(`      ${line}`);
    }
  }

  for (const failure of failures) {
    console.log(`FAIL  ${failure.message}`);
    for (const line of failure.evidence) {
      console.log(`      ${line}`);
    }
  }

  console.log("");
  if (failures.length > 0) {
    console.log(`Release doctor failed with ${failures.length} issue(s).`);
  } else if (warnings.length > 0) {
    console.log(`Release doctor passed with ${warnings.length} warning(s).`);
  } else {
    console.log("Release doctor passed.");
  }
}

function printJson() {
  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        failures,
        warnings,
        passes
      },
      null,
      2
    )
  );
}

function runReleaseMetadataValidation() {
  const result = spawnSync("node", ["scripts/validate-release-metadata.mjs"], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status === 0) {
    ok("Release metadata validation passed.");
    return;
  }

  const evidence = [
    ...(result.stdout ? result.stdout.trim().split("\n").filter(Boolean).slice(-8) : []),
    ...(result.stderr ? result.stderr.trim().split("\n").filter(Boolean).slice(-8) : [])
  ];

  record(failures, "release_metadata_invalid", "Release metadata validation failed.", evidence);
}

function readReservedPreviewCandidate(metadata) {
  const candidate = metadata.upcomingPatch;
  if (!candidate?.version) {
    return null;
  }

  if (candidate.status === "shipped" || candidate.status === "superseded") {
    return null;
  }

  return {
    label: candidate.label,
    version: candidate.version,
    date: candidate.date ?? metadata.currentRelease?.date ?? null,
    source: "upcomingPatch",
    isCandidate: true
  };
}

async function fetchRelease(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "cveriskpilot-release-doctor/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`expected 200, received ${response.status}`);
  }

  const payload = await response.json();
  const release = payload?.data?.release;

  if (!release?.label || !release?.version || !release?.date) {
    throw new Error("missing release payload fields");
  }

  return release;
}

async function checkRemoteReleaseSurfaces(metadata) {
  const currentRelease = metadata.currentRelease;
  const previewCandidate = readReservedPreviewCandidate(metadata);

  const targets = [
    {
      name: "production",
      url: "https://cveriskpilot.com/api/public/release",
      expected: {
        label: currentRelease.label,
        version: currentRelease.version,
        date: currentRelease.date,
        source: "currentRelease",
        isCandidate: false
      }
    },
    {
      name: "preview",
      url: "https://preview.cveriskpilot.com/api/public/release",
      expected: previewCandidate ?? {
        label: currentRelease.label,
        version: currentRelease.version,
        date: currentRelease.date,
        source: "currentRelease",
        isCandidate: false
      }
    }
  ];

  for (const target of targets) {
    try {
      const release = await fetchRelease(target.url);

      const mismatches = [];
      for (const field of ["label", "version", "date", "source", "isCandidate"]) {
        if (release[field] !== target.expected[field]) {
          mismatches.push(`${field}: expected ${target.expected[field]}, received ${release[field]}`);
        }
      }

      if (mismatches.length > 0) {
        record(
          failures,
          `${target.name}_release_mismatch`,
          `${target.name} public release surface does not match repo release truth.`,
          [target.url, ...mismatches]
        );
        continue;
      }

      ok(`${target.name} public release surface matches repo release truth.`);
    } catch (error) {
      record(
        failures,
        `${target.name}_release_unreachable`,
        `Unable to verify ${target.name} public release surface.`,
        [target.url, String(error instanceof Error ? error.message : error)]
      );
    }
  }
}

function checkRenderPathConsistency() {
  if (!fs.existsSync(layoutPath) || !fs.existsSync(apiRoutePath)) {
    record(
      warnings,
      "release_render_files_missing",
      "Cannot check render path consistency — layout or API route file not found.",
      [
        `layout: ${fs.existsSync(layoutPath) ? "exists" : "missing"}`,
        `api route: ${fs.existsSync(apiRoutePath) ? "exists" : "missing"}`
      ]
    );
    return;
  }

  const layoutSource = fs.readFileSync(layoutPath, "utf8");
  const apiRouteSource = fs.readFileSync(apiRoutePath, "utf8");

  const layoutPassesHostname = /buildPublicReleaseDisplay\(\{\s*[\s\S]*hostname\s*:/m.test(layoutSource);
  const apiRoutePassesHostname = /buildPublicReleaseDisplay\(\{\s*[\s\S]*hostname\s*:/m.test(apiRouteSource);

  if (layoutPassesHostname === apiRoutePassesHostname) {
    ok("SSR and API release display paths use the same hostname-awareness posture.");
    return;
  }

  record(
    warnings,
    "release_render_consistency_risk",
    "SSR and API release display paths do not use the same hostname inputs.",
    [
      "apps/web/app/layout.tsx currently builds the initial release display without hostname context.",
      "apps/web/app/api/public/release/route.ts passes both APP_ENV and request hostname.",
      "This can create SSR/API mismatches on preview-like hosts."
    ]
  );
}

function checkGcpDeployArtifacts() {
  const deployFiles = [
    "deploy/Dockerfile",
    "deploy/cloudbuild.yaml",
    "deploy/cloudbuild-deploy.yaml",
    "deploy/terraform/cloudrun.tf",
    "deploy/terraform/variables.tf"
  ];

  for (const relativePath of deployFiles) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) {
      ok(`Deploy artifact exists: ${relativePath}`);
    } else {
      record(
        warnings,
        "deploy_artifact_missing",
        `Deploy artifact missing: ${relativePath}`,
        [`Expected at ${fullPath}`]
      );
    }
  }
}

async function main() {
  runReleaseMetadataValidation();

  if (!fs.existsSync(metadataPath)) {
    record(failures, "missing_release_metadata", `Missing release metadata: ${metadataPath}`);
  }

  if (failures.length > 0) {
    outputJson ? printJson() : printText();
    process.exit(1);
  }

  const metadata = readJson(metadataPath);
  await checkRemoteReleaseSurfaces(metadata);
  checkRenderPathConsistency();
  checkGcpDeployArtifacts();

  outputJson ? printJson() : printText();

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
