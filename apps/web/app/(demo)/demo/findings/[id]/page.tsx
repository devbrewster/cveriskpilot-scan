'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDemoFindingById } from '@/lib/demo-data';
import { FindingDetail } from '@/components/findings/finding-detail';

export default function DemoFindingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const data = getDemoFindingById(id);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-gray-900">Finding not found</h2>
        <p className="mt-2 text-sm text-gray-500">The finding &quot;{id}&quot; does not exist in the demo dataset.</p>
        <Link
          href="/demo/findings"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Findings
        </Link>
      </div>
    );
  }

  return <FindingDetail finding={data.finding} asset={data.asset} vulnCase={data.vulnCase} basePath="/demo" />;
}
