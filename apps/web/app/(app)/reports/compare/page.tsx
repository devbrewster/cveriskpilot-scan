import { ScanCompare } from '@/components/reports/scan-compare';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Scan Comparison | CVERiskPilot',
};

export default function ScanComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Comparison</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare two scan results to identify new, resolved, and unchanged findings
        </p>
      </div>
      <ScanCompare />
    </div>
  );
}
