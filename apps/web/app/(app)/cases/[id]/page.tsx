import { notFound } from 'next/navigation';
import { CaseDetail } from '@/components/cases/case-detail';
import { getCaseById } from '@/lib/mock-findings';

export const metadata = {
  title: 'Case Detail | CVERiskPilot',
};

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;
  const vulnCase = getCaseById(id);

  if (!vulnCase) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <CaseDetail vulnCase={vulnCase} />
    </div>
  );
}
