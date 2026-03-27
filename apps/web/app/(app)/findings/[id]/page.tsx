import { notFound } from 'next/navigation';
import { FindingDetail } from '@/components/findings/finding-detail';
import { getFindingById } from '@/lib/mock-findings';

export const metadata = {
  title: 'Finding Detail | CVERiskPilot',
};

interface FindingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { id } = await params;
  const finding = getFindingById(id);

  if (!finding) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <FindingDetail finding={finding} />
    </div>
  );
}
