import { notFound } from 'next/navigation';
import { FindingDetail } from '@/components/findings/finding-detail';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Finding Detail | CVERiskPilot',
};

interface FindingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { id } = await params;

  const finding = await prisma.finding.findUnique({
    where: { id },
    include: {
      asset: true,
      vulnerabilityCase: true,
    },
  });

  if (!finding) {
    notFound();
  }

  // Serialize to a plain object compatible with the FindingDetail component's
  // Finding interface. Dates become ISO strings.
  const serializedFinding = {
    id: finding.id,
    organizationId: finding.organizationId,
    clientId: finding.clientId,
    assetId: finding.assetId,
    scannerType: finding.scannerType,
    scannerName: finding.scannerName,
    observations: finding.observations as Record<string, unknown>,
    dedupKey: finding.dedupKey,
    vulnerabilityCaseId: finding.vulnerabilityCaseId,
    discoveredAt: finding.discoveredAt.toISOString(),
  };

  const serializedAsset = finding.asset
    ? {
        id: finding.asset.id,
        name: finding.asset.name,
        type: finding.asset.type,
        environment: finding.asset.environment,
        criticality: finding.asset.criticality,
        internetExposed: finding.asset.internetExposed,
        tags: finding.asset.tags,
      }
    : null;

  const vc = finding.vulnerabilityCase;
  const serializedCase = vc
    ? {
        id: vc.id,
        organizationId: vc.organizationId,
        clientId: vc.clientId,
        title: vc.title,
        description: vc.description ?? '',
        cveIds: vc.cveIds,
        cweIds: vc.cweIds,
        severity: vc.severity,
        cvssScore: vc.cvssScore,
        cvssVector: vc.cvssVector,
        cvssVersion: vc.cvssVersion,
        epssScore: vc.epssScore,
        epssPercentile: vc.epssPercentile,
        kevListed: vc.kevListed,
        kevDueDate: vc.kevDueDate?.toISOString() ?? null,
        status: vc.status,
        assignedToId: vc.assignedToId,
        dueAt: vc.dueAt?.toISOString() ?? null,
        aiAdvisory: vc.aiAdvisory as Record<string, unknown> | null,
        remediationNotes: vc.remediationNotes ?? '',
        findingCount: vc.findingCount,
        firstSeenAt: vc.firstSeenAt.toISOString(),
        lastSeenAt: vc.lastSeenAt.toISOString(),
      }
    : null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <FindingDetail finding={serializedFinding} asset={serializedAsset} vulnCase={serializedCase} />
    </div>
  );
}
