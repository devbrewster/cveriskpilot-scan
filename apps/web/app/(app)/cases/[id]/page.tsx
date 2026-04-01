import { notFound } from 'next/navigation';
import { CaseDetail } from '@/components/cases/case-detail';
import { prisma } from '@/lib/prisma';
import { mapCweToAllFrameworks } from '@cveriskpilot/compliance';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Case Detail | CVERiskPilot',
};

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;

  const vulnCase = await prisma.vulnerabilityCase.findUnique({
    where: { id },
    include: {
      findings: true,
      assignedTo: true,
    },
  });

  if (!vulnCase) {
    notFound();
  }

  // Serialize to a plain object compatible with the CaseDetail component's
  // VulnerabilityCase interface. Dates become ISO strings.
  const serializedCase = {
    id: vulnCase.id,
    organizationId: vulnCase.organizationId,
    clientId: vulnCase.clientId,
    title: vulnCase.title,
    description: vulnCase.description ?? '',
    cveIds: vulnCase.cveIds,
    cweIds: vulnCase.cweIds,
    severity: vulnCase.severity,
    cvssScore: vulnCase.cvssScore,
    cvssVector: vulnCase.cvssVector,
    cvssVersion: vulnCase.cvssVersion,
    epssScore: vulnCase.epssScore,
    epssPercentile: vulnCase.epssPercentile,
    kevListed: vulnCase.kevListed,
    kevDueDate: vulnCase.kevDueDate?.toISOString() ?? null,
    status: vulnCase.status,
    assignedToId: vulnCase.assignedToId,
    dueAt: vulnCase.dueAt?.toISOString() ?? null,
    aiAdvisory: vulnCase.aiAdvisory as Record<string, unknown> | null,
    remediationNotes: vulnCase.remediationNotes ?? '',
    findingCount: vulnCase.findingCount,
    firstSeenAt: vulnCase.firstSeenAt.toISOString(),
    lastSeenAt: vulnCase.lastSeenAt.toISOString(),
    triageVerdict: vulnCase.triageVerdict ?? null,
    triageConfidence: vulnCase.triageConfidence ?? null,
    triageModel: vulnCase.triageModel ?? null,
    triageAt: vulnCase.triageAt?.toISOString() ?? null,
    severityOverride: vulnCase.severityOverride ?? null,
  };

  const serializedFindings = vulnCase.findings.map((f) => ({
    id: f.id,
    organizationId: f.organizationId,
    clientId: f.clientId,
    assetId: f.assetId,
    scannerType: f.scannerType,
    scannerName: f.scannerName,
    observations: f.observations as Record<string, unknown>,
    dedupKey: f.dedupKey,
    vulnerabilityCaseId: f.vulnerabilityCaseId,
    discoveredAt: f.discoveredAt.toISOString(),
  }));

  const assignedUserName = vulnCase.assignedTo?.name ?? null;

  // Compute compliance impact from CWE IDs
  let complianceImpact = null;
  if (vulnCase.cweIds.length > 0) {
    const controlMap = new Map<string, { framework: string; controlId: string; controlTitle: string; cweIds: string[] }>();
    for (const cwe of vulnCase.cweIds) {
      const mappings = mapCweToAllFrameworks(cwe);
      for (const mapping of mappings) {
        for (const ctrl of mapping.mappedControls) {
          const key = `${ctrl.frameworkId}:${ctrl.controlId}`;
          const existing = controlMap.get(key);
          if (existing) {
            if (!existing.cweIds.includes(cwe)) existing.cweIds.push(cwe);
          } else {
            controlMap.set(key, { framework: ctrl.frameworkName, controlId: ctrl.controlId, controlTitle: ctrl.controlTitle, cweIds: [cwe] });
          }
        }
      }
    }
    const controls = Array.from(controlMap.values());
    const frameworkCounts = new Map<string, { name: string; count: number; controlIds: string[] }>();
    for (const ctrl of controls) {
      const existing = frameworkCounts.get(ctrl.framework);
      if (existing) { existing.count++; existing.controlIds.push(ctrl.controlId); }
      else { frameworkCounts.set(ctrl.framework, { name: ctrl.framework, count: 1, controlIds: [ctrl.controlId] }); }
    }
    complianceImpact = {
      totalAffectedControls: controls.length,
      frameworks: Array.from(frameworkCounts.values()),
      controls,
    };
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <CaseDetail vulnCase={serializedCase} findings={serializedFindings} assignedUserName={assignedUserName} complianceImpact={complianceImpact} />
    </div>
  );
}
