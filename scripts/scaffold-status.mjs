import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredPaths = [
  "apps/web",
  "packages/domain",
  "packages/shared",
  "packages/auth",
  "packages/ai",
  "packages/parsers",
  "apps/web/src/lib/release-metadata.json",
  "deploy/Dockerfile",
  "deploy/cloudbuild.yaml",
  "deploy/cloudbuild-deploy.yaml",
  "deploy/terraform/cloudrun.tf",
  "deploy/terraform/variables.tf",
  "packages/domain/prisma/schema.prisma",
  "CHANGELOG.md"
];

let missing = 0;

console.log("CVERiskPilot scaffold status");
console.log("");

for (const relativePath of requiredPaths) {
  const fullPath = path.join(root, relativePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? "OK " : "MISS"}  ${relativePath}`);
  if (!exists) {
    missing += 1;
  }
}

console.log("");
if (missing === 0) {
  console.log("Scaffold status: ready for implementation.");
} else {
  console.log(`Scaffold status: ${missing} required path(s) missing.`);
  process.exitCode = 1;
}
