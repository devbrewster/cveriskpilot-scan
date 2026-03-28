#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = new URL("..", import.meta.url).pathname;
const NPM_BIN = process.platform === "win32" ? "npm.cmd" : "npm";

const TARGETS = {
  preview: {
    baseUrl: "https://preview.cveriskpilot.com",
    deployScript: "deploy:web:preview"
  },
  production: {
    baseUrl: "https://cveriskpilot.com",
    deployScript: "deploy:web:production"
  }
};

const VERIFY_STEPS = [
  ["Scaffold status", ["run", "release:status"]],
  ["Release metadata validation", ["run", "release:validate"]],
  ["Typecheck", ["run", "type-check"]],
  ["Test suite", ["run", "test"]],
  ["Next.js build", ["run", "build"]]
];

function usage() {
  console.log(`CVERiskPilot web release workflow

Usage:
  node scripts/web-release-workflow.mjs verify
  node scripts/web-release-workflow.mjs smoke <preview|production>
  node scripts/web-release-workflow.mjs deploy <preview|production> [--skip-smoke]

Examples:
  npm run release:workflow -- verify
  npm run release:workflow -- smoke preview
  npm run release:workflow -- deploy production
`);
}

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

function logSection(title) {
  console.log(`\n== ${title} ==`);
}

function runStep(index, total, label, args) {
  console.log(`\n[${index}/${total}] ${label}`);
  const result = spawnSync(NPM_BIN, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function smokeCheck(targetName) {
  const target = TARGETS[targetName];

  if (!target) {
    fail(`Unknown smoke target: ${targetName}`);
  }

  const checks = [
    {
      label: "login page returns 200 and includes branding",
      path: "/login",
      validate: async (response) => {
        if (response.status !== 200) {
          throw new Error(`expected 200, received ${response.status}`);
        }

        const body = await response.text();
        if (!body.includes("CVERiskPilot")) {
          throw new Error("login page is missing CVERiskPilot branding");
        }
      }
    },
    {
      label: "workspace redirects signed-out visitors to /login",
      path: "/workspace",
      validate: async (response) => {
        if (response.status !== 307) {
          throw new Error(`expected 307, received ${response.status}`);
        }

        const location = response.headers.get("location");
        if (location !== "/login") {
          throw new Error(`expected redirect to /login, received ${location ?? "none"}`);
        }
      }
    },
    {
      label: "findings workspace redirects signed-out visitors to /login",
      path: "/findings",
      validate: async (response) => {
        if (response.status !== 307) {
          throw new Error(`expected 307, received ${response.status}`);
        }

        const location = response.headers.get("location");
        if (location !== "/login") {
          throw new Error(`expected redirect to /login, received ${location ?? "none"}`);
        }
      }
    },
    {
      label: "tickets workspace redirects signed-out visitors to /login",
      path: "/tickets",
      validate: async (response) => {
        if (response.status !== 307) {
          throw new Error(`expected 307, received ${response.status}`);
        }

        const location = response.headers.get("location");
        if (location !== "/login") {
          throw new Error(`expected redirect to /login, received ${location ?? "none"}`);
        }
      }
    },
    {
      label: "findings API rejects unauthenticated access",
      path: "/api/findings",
      validate: async (response) => {
        if (response.status !== 401) {
          throw new Error(`expected 401, received ${response.status}`);
        }
      }
    },
    {
      label: "tickets API rejects unauthenticated access",
      path: "/api/tickets",
      validate: async (response) => {
        if (response.status !== 401) {
          throw new Error(`expected 401, received ${response.status}`);
        }
      }
    },
    {
      label: "upload runner API rejects unauthenticated access",
      path: "/api/uploads/process",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ limit: 1 })
      },
      validate: async (response) => {
        if (response.status !== 401) {
          throw new Error(`expected 401, received ${response.status}`);
        }
      }
    },
    {
      label: "health endpoint returns 200",
      path: "/api/health",
      validate: async (response) => {
        if (response.status !== 200) {
          throw new Error(`expected 200, received ${response.status}`);
        }
      }
    }
  ];

  logSection(`Smoke checks for ${targetName}`);

  for (const check of checks) {
    let lastError = null;

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const response = await fetch(new URL(check.path, target.baseUrl), {
          method: check.init?.method,
          body: check.init?.body,
          redirect: "manual",
          headers: {
            "user-agent": "cveriskpilot-web-release-workflow/1.0",
            ...(check.init?.headers ?? {})
          }
        });

        await check.validate(response);
        console.log(`PASS  ${check.label}`);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;

        if (attempt < 6) {
          await sleep(2000);
        }
      }
    }

    if (lastError) {
      fail(`${check.label} at ${target.baseUrl}${check.path}: ${lastError.message}`);
    }
  }
}

async function main() {
  const [mode, targetOrFlag, ...rest] = process.argv.slice(2);

  if (!mode || mode === "--help" || mode === "-h") {
    usage();
    return;
  }

  if (mode === "verify") {
    logSection("Web verification");
    VERIFY_STEPS.forEach(([label, args], index) => runStep(index + 1, VERIFY_STEPS.length, label, args));
    return;
  }

  if (mode === "smoke") {
    await smokeCheck(targetOrFlag);
    return;
  }

  if (mode === "deploy") {
    const targetName = targetOrFlag;
    const target = TARGETS[targetName];

    if (!target) {
      fail(`Unknown deploy target: ${targetName}`);
    }

    const skipSmoke = rest.includes("--skip-smoke");
    const steps = [...VERIFY_STEPS, [`Deploy ${targetName} via Cloud Build`, ["run", target.deployScript]]];

    logSection(`Verified ${targetName} deploy`);
    steps.forEach(([label, args], index) => runStep(index + 1, steps.length, label, args));

    if (!skipSmoke) {
      await smokeCheck(targetName);
    }

    return;
  }

  usage();
  process.exit(1);
}

await main();
