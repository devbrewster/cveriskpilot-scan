import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/ui/toast';
import { ClientContextProvider } from '@/components/layout/client-context-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ClientContextProvider>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <div className="pl-64">
            <Header />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </ClientContextProvider>
    </ToastProvider>
  );
}
