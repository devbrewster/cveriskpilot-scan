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
  // Finding interface (from mock-findings.ts). Dates become ISO strings.
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

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <FindingDetail finding={serializedFinding} />
    </div>
  );
}
