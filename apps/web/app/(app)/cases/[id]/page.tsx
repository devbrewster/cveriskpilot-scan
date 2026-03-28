import { notFound } from 'next/navigation';
import { CaseDetail } from '@/components/cases/case-detail';
import { prisma } from '@/lib/prisma';

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
  // VulnerabilityCase interface (from mock-findings.ts). Dates become ISO strings.
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
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <CaseDetail vulnCase={serializedCase} />
    </div>
  );
}
