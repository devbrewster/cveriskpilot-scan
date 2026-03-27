import { ClientList } from '@/components/clients/client-list';

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your client portfolio. Each client is a separate tenant with isolated data.
        </p>
      </div>
      <ClientList />
    </div>
  );
}
