import { TeamManagement } from '@/components/teams/team-management';

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Teams</h2>
        <p className="mt-1 text-sm text-gray-500">
          Organize your analysts into teams and assign them to client accounts.
        </p>
      </div>
      <TeamManagement />
    </div>
  );
}
