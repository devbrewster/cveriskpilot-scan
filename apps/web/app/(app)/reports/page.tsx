import { ReportsHub } from '@/components/reports/reports-hub';

export const metadata = {
  title: 'Reports | CVERiskPilot',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate executive summaries, export data, and compare scan results
        </p>
      </div>
      <ReportsHub />
    </div>
  );
}
