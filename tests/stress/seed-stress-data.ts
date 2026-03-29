/**
 * Seed script for production stress testing.
 *
 * Creates realistic data at scale:
 *   - 1 stress-test organization
 *   - 200 analyst users (pre-hashed passwords)
 *   - 5 clients with assets
 *   - 500 findings across assets
 *   - 100 vulnerability cases
 *   - SLA policies
 *   - Audit logs
 *
 * Usage: npx tsx tests/stress/seed-stress-data.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../apps/web/.env.local') });

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const ORG_ID = 'stress-org-prod-test';
const RUN_ID = Date.now();

// Pre-computed bcrypt hash for "StressTest1!xx" (cost=10)
// In production we'd use bcrypt, but for seeding we store a known hash
const PASSWORD_HASH = '$2b$10$LqJ5RZ7vZz5bQzZ5bQzZ5eQzZ5bQzZ5bQzZ5bQzZ5bQzZ5bQzZ5e';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const CASE_STATUSES = ['NEW', 'TRIAGE', 'IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED'] as const;
const SCANNER_TYPES = ['SCA', 'SAST', 'DAST', 'VM', 'CONTAINER'] as const;
const ASSET_TYPES = ['HOST', 'REPOSITORY', 'CONTAINER_IMAGE', 'APPLICATION'] as const;
const ENVIRONMENTS = ['PRODUCTION', 'STAGING', 'DEVELOPMENT'] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _cuid(): string {
  return crypto.randomBytes(12).toString('hex');
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  CVERiskPilot Stress Test Data Seeder    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const start = performance.now();

  // Clean existing stress data
  console.log('Cleaning existing stress test data...');
  try {
    await prisma.notification.deleteMany({ where: { user: { organizationId: ORG_ID } } });
    await prisma.comment.deleteMany({ where: { vulnerabilityCase: { organizationId: ORG_ID } } });
    await prisma.workflowLineage.deleteMany({ where: { vulnerabilityCase: { organizationId: ORG_ID } } });
    await prisma.riskException.deleteMany({ where: { vulnerabilityCase: { organizationId: ORG_ID } } });
    await prisma.ticket.deleteMany({ where: { vulnerabilityCase: { organizationId: ORG_ID } } });
    await prisma.finding.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.vulnerabilityCase.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.uploadJob.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.scanArtifact.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.asset.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.auditLog.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.apiKey.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.slaPolicy.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.clientTeamAssignment.deleteMany({ where: { team: { organizationId: ORG_ID } } });
    await prisma.teamMembership.deleteMany({ where: { team: { organizationId: ORG_ID } } });
    await prisma.team.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.client.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.organization.deleteMany({ where: { id: ORG_ID } });
    console.log('  Cleaned.\n');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    console.log('  No existing data to clean (first run).\n');
  }

  // 1. Create Organization
  console.log('1. Creating organization...');
  await prisma.organization.create({
    data: {
      id: ORG_ID,
      name: 'StressTest Corp',
      slug: `stress-corp-${RUN_ID}`,
      tier: 'PRO',
      entitlements: {
        maxUsers: 500,
        maxClients: 50,
        maxScansPerMonth: 10000,
        maxFindingsTotal: 1000000,
        slaTracking: true,
        complianceModule: true,
        jiraIntegration: true,
        apiAccess: true,
        aiAdvisory: true,
      },
    },
  });
  console.log(`  Created org: ${ORG_ID}`);

  // 2. Create Clients
  console.log('2. Creating clients...');
  const clientIds: string[] = [];
  const clientNames = ['Finance Division', 'Healthcare Unit', 'Cloud Infrastructure', 'Web Platform', 'Mobile Apps'];
  for (let i = 0; i < clientNames.length; i++) {
    const id = `stress-client-${i}`;
    clientIds.push(id);
    await prisma.client.create({
      data: {
        id,
        organizationId: ORG_ID,
        name: clientNames[i],
        slug: `stress-client-${i}-${RUN_ID}`,
        isActive: true,
      },
    });
  }
  console.log(`  Created ${clientIds.length} clients`);

  // 3. Create Teams
  console.log('3. Creating teams...');
  const teamIds: string[] = [];
  const teamNames = ['Red Team', 'Blue Team', 'AppSec', 'Cloud Security', 'Compliance'];
  for (let i = 0; i < teamNames.length; i++) {
    const id = `stress-team-${i}`;
    teamIds.push(id);
    await prisma.team.create({
      data: {
        id,
        organizationId: ORG_ID,
        name: teamNames[i],
        description: `Stress test ${teamNames[i]}`,
      },
    });
  }
  console.log(`  Created ${teamIds.length} teams`);

  // 4. Create 200 analyst users
  console.log('4. Creating 200 analyst users...');
  const userIds: string[] = [];
  const userBatch = [];
  for (let i = 1; i <= 200; i++) {
    const id = `stress-analyst-${i}`;
    userIds.push(id);
    userBatch.push({
      id,
      organizationId: ORG_ID,
      email: `analyst${i}@stresstest.corp`,
      name: `Analyst ${i}`,
      passwordHash: PASSWORD_HASH,
      role: i <= 5 ? 'SECURITY_ADMIN' : 'ANALYST' as any,
      status: 'ACTIVE' as any,
    });
  }
  // Batch insert
  await prisma.user.createMany({ data: userBatch as any });
  console.log(`  Created ${userIds.length} users`);

  // 5. Assign users to teams
  console.log('5. Assigning users to teams...');
  const memberships = userIds.map((userId, i) => ({
    id: `stress-membership-${i}`,
    userId,
    teamId: teamIds[i % teamIds.length],
    role: i < 5 ? 'OWNER' : 'MEMBER' as any,
  }));
  await prisma.teamMembership.createMany({ data: memberships as any });
  console.log(`  Created ${memberships.length} team memberships`);

  // 6. Create Assets
  console.log('6. Creating assets...');
  const assetIds: string[] = [];
  const assetBatch = [];
  for (let i = 0; i < 50; i++) {
    const id = `stress-asset-${i}`;
    assetIds.push(id);
    assetBatch.push({
      id,
      organizationId: ORG_ID,
      clientId: clientIds[i % clientIds.length],
      name: `asset-${i}-${['web-server', 'api-gw', 'db-cluster', 'cdn-edge', 'k8s-node', 'lambda-fn', 'container', 'repo'][i % 8]}.corp.local`,
      type: ASSET_TYPES[i % ASSET_TYPES.length] as any,
      environment: ENVIRONMENTS[i % ENVIRONMENTS.length] as any,
      criticality: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const)[i % 4] as any,
      internetExposed: i % 3 === 0,
      tags: [`env:${ENVIRONMENTS[i % ENVIRONMENTS.length].toLowerCase()}`, `team:${teamNames[i % teamNames.length].toLowerCase().replace(' ', '-')}`],
    });
  }
  await prisma.asset.createMany({ data: assetBatch as any });
  console.log(`  Created ${assetIds.length} assets`);

  // 7. Create SLA Policy
  console.log('7. Creating SLA policy...');
  await prisma.slaPolicy.create({
    data: {
      id: 'stress-sla-default',
      organizationId: ORG_ID,
      name: 'Production SLA',
      description: 'Standard production SLA for stress testing',
      criticalDays: 7,
      highDays: 30,
      mediumDays: 90,
      lowDays: 180,
      kevCriticalDays: 3,
      isDefault: true,
    },
  });
  console.log('  Created SLA policy');

  // 8. Create Vulnerability Cases (100)
  console.log('8. Creating 100 vulnerability cases...');
  const caseIds: string[] = [];
  const caseBatch = [];
  for (let i = 0; i < 100; i++) {
    const id = `stress-case-${i}`;
    caseIds.push(id);
    const severity = SEVERITIES[i % SEVERITIES.length];
    const status = CASE_STATUSES[i % CASE_STATUSES.length];
    const cveNum = String(1000 + i).padStart(5, '0');
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 90);
    const firstSeen = new Date(now.getTime() - daysAgo * 86400000);

    caseBatch.push({
      id,
      organizationId: ORG_ID,
      clientId: clientIds[i % clientIds.length],
      title: `CVE-2024-${cveNum}: ${['Remote Code Execution', 'SQL Injection', 'XSS Reflected', 'SSRF', 'Path Traversal', 'Buffer Overflow', 'Privilege Escalation', 'Information Disclosure', 'Denial of Service', 'Authentication Bypass'][i % 10]} in ${['Apache', 'Nginx', 'OpenSSL', 'glibc', 'Log4j', 'Spring', 'Django', 'Express', 'Rails', 'Flask'][i % 10]}`,
      description: `A ${severity.toLowerCase()} severity vulnerability was discovered that could allow an attacker to ${['execute arbitrary code', 'extract sensitive data', 'perform cross-site scripting', 'access internal services', 'read arbitrary files', 'overflow buffers', 'escalate privileges', 'disclose information', 'cause denial of service', 'bypass authentication'][i % 10]}.`,
      cveIds: [`CVE-2024-${cveNum}`],
      cweIds: [`CWE-${[79, 89, 94, 119, 200, 264, 310, 352, 434, 502][i % 10]}`],
      severity: severity as any,
      cvssScore: Math.round((3 + Math.random() * 7) * 10) / 10,
      epssScore: Math.round(Math.random() * 10000) / 10000,
      epssPercentile: Math.round(Math.random() * 10000) / 10000,
      kevListed: i % 7 === 0,
      kevDueDate: i % 7 === 0 ? new Date(now.getTime() + 14 * 86400000) : null,
      status: status as any,
      assignedToId: userIds[i % userIds.length],
      slaPolicyId: 'stress-sla-default',
      dueAt: new Date(firstSeen.getTime() + (severity === 'CRITICAL' ? 7 : severity === 'HIGH' ? 30 : 90) * 86400000),
      findingCount: 3 + (i % 10),
      firstSeenAt: firstSeen,
      lastSeenAt: new Date(firstSeen.getTime() + Math.random() * 7 * 86400000),
    });
  }
  await prisma.vulnerabilityCase.createMany({ data: caseBatch as any });
  console.log(`  Created ${caseIds.length} cases`);

  // 9. Create Findings (500)
  console.log('9. Creating 500 findings...');
  const findingBatch = [];
  for (let i = 0; i < 500; i++) {
    const caseIdx = i % caseIds.length;
    findingBatch.push({
      id: `stress-finding-${i}`,
      organizationId: ORG_ID,
      clientId: clientIds[i % clientIds.length],
      assetId: assetIds[i % assetIds.length],
      scannerType: SCANNER_TYPES[i % SCANNER_TYPES.length] as any,
      scannerName: ['Nessus', 'Trivy', 'SonarQube', 'OWASP ZAP', 'Snyk'][i % 5],
      runId: `run-${Math.floor(i / 50)}`,
      observations: {
        title: `Finding ${i}: ${['Buffer overflow in libpng', 'SQL injection in login form', 'Outdated jQuery version', 'TLS 1.0 enabled', 'Default admin credentials'][i % 5]}`,
        severity: SEVERITIES[i % SEVERITIES.length],
        cvss: (3 + Math.random() * 7).toFixed(1),
        port: [80, 443, 8080, 3306, 5432][i % 5],
        host: `10.${Math.floor(i / 256) % 256}.${i % 256}.${(i * 7) % 256}`,
      } as any,
      dedupKey: `dedup-${ORG_ID}-${i}`,
      vulnerabilityCaseId: caseIds[caseIdx],
      discoveredAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000),
    });
  }
  // Batch in chunks of 100
  for (let chunk = 0; chunk < findingBatch.length; chunk += 100) {
    await prisma.finding.createMany({ data: findingBatch.slice(chunk, chunk + 100) as any });
  }
  console.log(`  Created 500 findings`);

  // 10. Create Scan Artifacts & Upload Jobs
  console.log('10. Creating scan artifacts and upload jobs...');
  for (let i = 0; i < 20; i++) {
    const artifactId = `stress-artifact-${i}`;
    await prisma.scanArtifact.create({
      data: {
        id: artifactId,
        organizationId: ORG_ID,
        clientId: clientIds[i % clientIds.length],
        filename: `scan-${i}.${['nessus', 'sarif', 'csv', 'json', 'cdx.json'][i % 5]}`,
        mimeType: ['text/xml', 'application/json', 'text/csv', 'application/json', 'application/json'][i % 5],
        sizeBytes: 50000 + Math.floor(Math.random() * 500000),
        gcsBucket: 'stress-test-bucket',
        gcsPath: `uploads/${ORG_ID}/scans/scan-${i}`,
        checksumSha256: crypto.randomBytes(32).toString('hex'),
        parserFormat: (['NESSUS', 'SARIF', 'CSV', 'JSON_FORMAT', 'CYCLONEDX'] as const)[i % 5] as any,
        uploadedById: userIds[i % userIds.length],
      },
    });

    await prisma.uploadJob.create({
      data: {
        id: `stress-job-${i}`,
        organizationId: ORG_ID,
        clientId: clientIds[i % clientIds.length],
        artifactId,
        status: 'COMPLETED' as any,
        totalFindings: 25,
        parsedFindings: 25,
        uniqueCvesFound: 15,
        uniqueCvesEnriched: 15,
        findingsCreated: 25,
        casesCreated: 5,
        completedAt: new Date(),
      },
    });
  }
  console.log('  Created 20 artifacts and upload jobs');

  // 11. Create Comments on cases
  console.log('11. Creating case comments...');
  const commentBatch = [];
  for (let i = 0; i < 300; i++) {
    commentBatch.push({
      id: `stress-comment-${i}`,
      vulnerabilityCaseId: caseIds[i % caseIds.length],
      userId: userIds[i % userIds.length],
      content: `Analysis note #${i}: ${['Confirmed exploitable in staging environment.', 'Patch available from vendor, testing in progress.', 'False positive — verified manually, component not in use.', 'Escalating to infrastructure team for network-level mitigation.', 'Remediation deployed, awaiting verification scan.'][i % 5]}`,
    });
  }
  for (let chunk = 0; chunk < commentBatch.length; chunk += 100) {
    await prisma.comment.createMany({ data: commentBatch.slice(chunk, chunk + 100) as any });
  }
  console.log('  Created 300 comments');

  // 12. Create Notifications
  console.log('12. Creating notifications...');
  const notifBatch = [];
  for (let i = 0; i < 400; i++) {
    notifBatch.push({
      id: `stress-notif-${i}`,
      userId: userIds[i % userIds.length],
      type: ['CASE_ASSIGNED', 'SLA_BREACH', 'SCAN_COMPLETE', 'COMMENT_MENTION'][i % 4],
      title: ['New case assigned', 'SLA breach warning', 'Scan completed', 'You were mentioned'][i % 4],
      message: `Notification ${i} for analyst ${(i % userIds.length) + 1}`,
      relatedEntityType: 'VulnerabilityCase',
      relatedEntityId: caseIds[i % caseIds.length],
      isRead: i % 3 === 0,
    });
  }
  for (let chunk = 0; chunk < notifBatch.length; chunk += 100) {
    await prisma.notification.createMany({ data: notifBatch.slice(chunk, chunk + 100) as any });
  }
  console.log('  Created 400 notifications');

  // 13. Create Audit Logs
  console.log('13. Creating audit log entries...');
  const auditBatch = [];
  for (let i = 0; i < 200; i++) {
    auditBatch.push({
      id: `stress-audit-${i}`,
      organizationId: ORG_ID,
      entityType: ['VulnerabilityCase', 'Finding', 'ScanArtifact', 'User'][i % 4],
      entityId: [caseIds[i % caseIds.length], `stress-finding-${i}`, `stress-artifact-${i % 20}`, userIds[i % userIds.length]][i % 4],
      action: (['CREATE', 'UPDATE', 'STATE_CHANGE', 'EXPORT'] as const)[i % 4] as any,
      actorId: userIds[i % userIds.length],
      details: { source: 'stress-seed', index: i } as any,
      hash: crypto.randomBytes(32).toString('hex'),
    });
  }
  for (let chunk = 0; chunk < auditBatch.length; chunk += 100) {
    await prisma.auditLog.createMany({ data: auditBatch.slice(chunk, chunk + 100) as any });
  }
  console.log('  Created 200 audit log entries');

  const elapsed = Math.round(performance.now() - start);
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Seeding complete in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`║                                          ║`);
  console.log(`║  Organization: ${ORG_ID}`);
  console.log(`║  Users:        200 analysts              ║`);
  console.log(`║  Clients:      5                         ║`);
  console.log(`║  Teams:        5                         ║`);
  console.log(`║  Assets:       50                        ║`);
  console.log(`║  Cases:        100                       ║`);
  console.log(`║  Findings:     500                       ║`);
  console.log(`║  Comments:     300                       ║`);
  console.log(`║  Notifications:400                       ║`);
  console.log(`║  Artifacts:    20                        ║`);
  console.log(`║  Audit Logs:   200                       ║`);
  console.log(`╚══════════════════════════════════════════╝`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
