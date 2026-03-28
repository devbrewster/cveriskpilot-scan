// ---------------------------------------------------------------------------
// Dev seeder — creates realistic sample data for local development
// ---------------------------------------------------------------------------

export async function seedDevData(prisma: any): Promise<void> {
  // Skip if data already exists
  const existingOrg = await prisma.organization.findFirst({
    where: { slug: 'cveriskpilot' },
  });
  if (existingOrg) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  console.log('Seeding development data...');

  // -------------------------------------------------------------------------
  // Organization — CVERiskPilot LLC (primary)
  // -------------------------------------------------------------------------
  const org = await prisma.organization.create({
    data: {
      name: 'CVERiskPilot LLC',
      slug: 'cveriskpilot',
      tier: 'MSSP',
      domain: 'cveriskpilot.com',
    },
  });

  // -------------------------------------------------------------------------
  // Client
  // -------------------------------------------------------------------------
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Default',
      slug: 'default',
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  // Founder / Platform Admin
  const founder = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'george.ontiveros@cveriskpilot.com',
      name: 'George Ontiveros',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Alias for backward-compatible references in seed
  const owner = founder;

  const analyst = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'analyst@cveriskpilot.com',
      name: 'Demo Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });

  // -------------------------------------------------------------------------
  // Assets
  // -------------------------------------------------------------------------
  const assetDefs = [
    { name: 'web-server', type: 'HOST', criticality: 'HIGH' },
    { name: 'api-gateway', type: 'APPLICATION', criticality: 'CRITICAL' },
    { name: 'payments-db', type: 'HOST', criticality: 'CRITICAL' },
    { name: 'frontend-app', type: 'REPOSITORY', criticality: 'MEDIUM' },
    { name: 'container-registry', type: 'CONTAINER_IMAGE', criticality: 'HIGH' },
  ] as const;

  const assets: Record<string, any> = {};
  for (const def of assetDefs) {
    assets[def.name] = await prisma.asset.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: def.name,
        type: def.type,
        environment: 'PRODUCTION',
        criticality: def.criticality,
        tags: [],
      },
    });
  }

  // -------------------------------------------------------------------------
  // SLA Policy
  // -------------------------------------------------------------------------
  const slaPolicy = await prisma.slaPolicy.create({
    data: {
      organizationId: org.id,
      name: 'Default SLA',
      description: 'Standard remediation timelines',
      criticalDays: 7,
      highDays: 30,
      mediumDays: 90,
      lowDays: 180,
      kevCriticalDays: 3,
      isDefault: true,
    },
  });

  // -------------------------------------------------------------------------
  // VulnerabilityCases (8)
  // -------------------------------------------------------------------------
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  const caseDefs = [
    {
      title: 'CVE-2024-3094: XZ Utils Backdoor',
      cveIds: ['CVE-2024-3094'],
      cweIds: ['CWE-506'],
      severity: 'CRITICAL',
      cvssScore: 10.0,
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      epssScore: 0.93,
      epssPercentile: 0.99,
      kevListed: true,
      kevDueDate: daysAgo(-7),
      status: 'IN_REMEDIATION',
      findingCount: 3,
      firstSeenAt: daysAgo(14),
      lastSeenAt: daysAgo(1),
    },
    {
      title: 'CVE-2024-21762: Fortinet FortiOS Out-of-bound Write',
      cveIds: ['CVE-2024-21762'],
      cweIds: ['CWE-787'],
      severity: 'CRITICAL',
      cvssScore: 9.8,
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      epssScore: 0.87,
      epssPercentile: 0.98,
      kevListed: true,
      kevDueDate: daysAgo(-3),
      status: 'NEW',
      findingCount: 1,
      firstSeenAt: daysAgo(5),
      lastSeenAt: daysAgo(5),
    },
    {
      title: 'CVE-2024-6387: OpenSSH regreSSHion RCE',
      cveIds: ['CVE-2024-6387'],
      cweIds: ['CWE-362'],
      severity: 'HIGH',
      cvssScore: 8.1,
      cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
      epssScore: 0.72,
      epssPercentile: 0.96,
      kevListed: false,
      status: 'TRIAGE',
      findingCount: 4,
      firstSeenAt: daysAgo(30),
      lastSeenAt: daysAgo(2),
    },
    {
      title: 'CVE-2024-1234: SQL Injection in Auth Module',
      cveIds: ['CVE-2024-1234'],
      cweIds: ['CWE-89'],
      severity: 'HIGH',
      cvssScore: 7.5,
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
      epssScore: 0.45,
      epssPercentile: 0.88,
      kevListed: false,
      status: 'VERIFIED_CLOSED',
      findingCount: 1,
      firstSeenAt: daysAgo(60),
      lastSeenAt: daysAgo(45),
    },
    {
      title: 'CVE-2024-2345: Cross-Site Scripting in Dashboard',
      cveIds: ['CVE-2024-2345'],
      cweIds: ['CWE-79'],
      severity: 'MEDIUM',
      cvssScore: 6.1,
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
      epssScore: 0.12,
      epssPercentile: 0.65,
      kevListed: false,
      status: 'NEW',
      findingCount: 2,
      firstSeenAt: daysAgo(10),
      lastSeenAt: daysAgo(3),
    },
    {
      title: 'CVE-2024-3456: Information Disclosure via Debug Endpoint',
      cveIds: ['CVE-2024-3456'],
      cweIds: ['CWE-200'],
      severity: 'MEDIUM',
      cvssScore: 5.3,
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
      epssScore: 0.08,
      epssPercentile: 0.52,
      kevListed: false,
      status: 'ACCEPTED_RISK',
      findingCount: 1,
      firstSeenAt: daysAgo(90),
      lastSeenAt: daysAgo(90),
    },
    {
      title: 'CVE-2024-4567: Outdated TLS Configuration',
      cveIds: ['CVE-2024-4567'],
      cweIds: ['CWE-326'],
      severity: 'LOW',
      cvssScore: 3.7,
      cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
      epssScore: 0.02,
      epssPercentile: 0.30,
      kevListed: false,
      status: 'NEW',
      findingCount: 2,
      firstSeenAt: daysAgo(20),
      lastSeenAt: daysAgo(5),
    },
    {
      title: 'Missing HTTP Security Headers',
      cveIds: [],
      cweIds: ['CWE-693'],
      severity: 'LOW',
      cvssScore: null,
      cvssVector: null,
      epssScore: null,
      epssPercentile: null,
      kevListed: false,
      status: 'FALSE_POSITIVE',
      findingCount: 1,
      firstSeenAt: daysAgo(45),
      lastSeenAt: daysAgo(45),
    },
  ];

  const cases: any[] = [];
  for (const def of caseDefs) {
    const vc = await prisma.vulnerabilityCase.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        title: def.title,
        cveIds: def.cveIds,
        cweIds: def.cweIds,
        severity: def.severity,
        cvssScore: def.cvssScore,
        cvssVector: def.cvssVector,
        cvssVersion: def.cvssScore ? '3.1' : null,
        epssScore: def.epssScore,
        epssPercentile: def.epssPercentile,
        kevListed: def.kevListed,
        kevDueDate: def.kevDueDate ?? null,
        status: def.status,
        assignedToId: def.status === 'IN_REMEDIATION' ? analyst.id : null,
        slaPolicyId: slaPolicy.id,
        findingCount: def.findingCount,
        firstSeenAt: def.firstSeenAt,
        lastSeenAt: def.lastSeenAt,
      },
    });
    cases.push(vc);
  }

  // -------------------------------------------------------------------------
  // Findings (15) — distributed across assets and cases
  // -------------------------------------------------------------------------
  const findingDefs = [
    // Case 0 (CVE-2024-3094) — 3 findings
    { caseIdx: 0, asset: 'web-server', scanner: 'Nessus', type: 'VM', days: 14 },
    { caseIdx: 0, asset: 'api-gateway', scanner: 'Nessus', type: 'VM', days: 10 },
    { caseIdx: 0, asset: 'container-registry', scanner: 'Trivy', type: 'CONTAINER', days: 1 },
    // Case 1 (CVE-2024-21762) — 1 finding
    { caseIdx: 1, asset: 'web-server', scanner: 'Qualys', type: 'VM', days: 5 },
    // Case 2 (CVE-2024-6387) — 4 findings
    { caseIdx: 2, asset: 'web-server', scanner: 'Nessus', type: 'VM', days: 30 },
    { caseIdx: 2, asset: 'api-gateway', scanner: 'Nessus', type: 'VM', days: 28 },
    { caseIdx: 2, asset: 'payments-db', scanner: 'Nessus', type: 'VM', days: 25 },
    { caseIdx: 2, asset: 'container-registry', scanner: 'Trivy', type: 'CONTAINER', days: 2 },
    // Case 3 (CVE-2024-1234) — 1 finding
    { caseIdx: 3, asset: 'api-gateway', scanner: 'Semgrep', type: 'SAST', days: 60 },
    // Case 4 (CVE-2024-2345) — 2 findings
    { caseIdx: 4, asset: 'frontend-app', scanner: 'ZAP', type: 'DAST', days: 10 },
    { caseIdx: 4, asset: 'web-server', scanner: 'ZAP', type: 'DAST', days: 3 },
    // Case 5 (CVE-2024-3456) — 1 finding
    { caseIdx: 5, asset: 'api-gateway', scanner: 'Nessus', type: 'VM', days: 90 },
    // Case 6 (CVE-2024-4567) — 2 findings
    { caseIdx: 6, asset: 'web-server', scanner: 'Nessus', type: 'VM', days: 20 },
    { caseIdx: 6, asset: 'payments-db', scanner: 'Nessus', type: 'VM', days: 5 },
    // Case 7 (Missing headers) — 1 finding
    { caseIdx: 7, asset: 'frontend-app', scanner: 'ZAP', type: 'DAST', days: 45 },
  ];

  for (const def of findingDefs) {
    const caseRecord = cases[def.caseIdx];
    await prisma.finding.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        assetId: assets[def.asset].id,
        scannerType: def.type,
        scannerName: def.scanner,
        observations: {
          title: caseRecord.title,
          cveIds: caseRecord.cveIds,
        },
        dedupKey: `${caseRecord.cveIds[0] ?? caseRecord.title}::${def.asset}::${def.scanner}`,
        vulnerabilityCaseId: caseRecord.id,
        discoveredAt: daysAgo(def.days),
      },
    });
  }

  // -------------------------------------------------------------------------
  // ScanArtifacts + UploadJobs (3)
  // -------------------------------------------------------------------------
  const artifact1 = await prisma.scanArtifact.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      filename: 'nessus-scan-2024-01.nessus',
      mimeType: 'application/xml',
      sizeBytes: 245_000,
      gcsBucket: 'cveriskpilot-dev-scans',
      gcsPath: `orgs/${org.id}/clients/${client.id}/nessus-scan-2024-01.nessus`,
      checksumSha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      parserFormat: 'NESSUS',
      uploadedById: owner.id,
    },
  });

  const artifact2 = await prisma.scanArtifact.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      filename: 'trivy-results.json',
      mimeType: 'application/json',
      sizeBytes: 87_000,
      gcsBucket: 'cveriskpilot-dev-scans',
      gcsPath: `orgs/${org.id}/clients/${client.id}/trivy-results.json`,
      checksumSha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      parserFormat: 'JSON_FORMAT',
      uploadedById: analyst.id,
    },
  });

  const artifact3 = await prisma.scanArtifact.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      filename: 'zap-report.json',
      mimeType: 'application/json',
      sizeBytes: 42_000,
      gcsBucket: 'cveriskpilot-dev-scans',
      gcsPath: `orgs/${org.id}/clients/${client.id}/zap-report.json`,
      checksumSha256: '567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
      parserFormat: 'JSON_FORMAT',
      uploadedById: analyst.id,
    },
  });

  // Completed job 1
  await prisma.uploadJob.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      artifactId: artifact1.id,
      status: 'COMPLETED',
      totalFindings: 10,
      parsedFindings: 10,
      uniqueCvesFound: 6,
      uniqueCvesEnriched: 6,
      findingsCreated: 10,
      casesCreated: 6,
      completedAt: daysAgo(14),
    },
  });

  // Completed job 2
  await prisma.uploadJob.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      artifactId: artifact2.id,
      status: 'COMPLETED',
      totalFindings: 3,
      parsedFindings: 3,
      uniqueCvesFound: 2,
      uniqueCvesEnriched: 2,
      findingsCreated: 3,
      casesCreated: 1,
      completedAt: daysAgo(2),
    },
  });

  // In-progress job 3
  await prisma.uploadJob.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      artifactId: artifact3.id,
      status: 'ENRICHING',
      totalFindings: 2,
      parsedFindings: 2,
      uniqueCvesFound: 1,
      uniqueCvesEnriched: 0,
      findingsCreated: 0,
      casesCreated: 0,
    },
  });

  console.log('Seed data created successfully.');
  console.log(`  Organization: ${org.name} (${org.id})`);
  console.log(`  Client: ${client.name} (${client.id})`);
  console.log(`  Users: ${owner.name}, ${analyst.name}`);
  console.log(`  Assets: ${Object.keys(assets).length}`);
  console.log(`  Cases: ${cases.length}`);
  console.log(`  Findings: ${findingDefs.length}`);
  console.log(`  Upload Jobs: 3`);
}
