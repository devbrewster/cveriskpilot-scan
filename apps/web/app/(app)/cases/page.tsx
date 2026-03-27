import { CasesList } from '@/components/cases/cases-list';

export const metadata = {
  title: 'Vulnerability Cases | CVERiskPilot',
  description: 'View and manage vulnerability cases',
};

export default function CasesPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vulnerability Cases</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage vulnerability cases across your organization.
        </p>
      </div>
      <CasesList />
    </div>
  );
}
