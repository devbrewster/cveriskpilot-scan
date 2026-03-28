'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDemoCaseById } from '@/lib/demo-data';
import { CaseDetail } from '@/components/cases/case-detail';

export default function DemoCaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const data = getDemoCaseById(id);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-gray-900">Case not found</h2>
        <p className="mt-2 text-sm text-gray-500">The case &quot;{id}&quot; does not exist in the demo dataset.</p>
        <Link
          href="/demo/cases"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <CaseDetail
      vulnCase={data.vulnCase}
      findings={data.findings}
      assignedUserName={data.assignedUserName}
      basePath="/demo"
    />
  );
}
