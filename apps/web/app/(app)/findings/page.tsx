import { FindingsList } from '@/components/findings/findings-list';

export const metadata = {
  title: 'Findings | CVERiskPilot',
  description: 'View and manage vulnerability findings',
};

export default function FindingsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Findings</h1>
        <p className="mt-1 text-sm text-gray-500">
          View, filter, and manage vulnerability findings from all scanners.
        </p>
      </div>
      <FindingsList />
    </div>
  );
}
