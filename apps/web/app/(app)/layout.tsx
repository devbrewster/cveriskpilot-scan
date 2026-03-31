import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/ui/toast';
import { ClientContextProvider } from '@/components/layout/client-context-provider';
import { AuthContextProvider } from '@/components/layout/auth-context-provider';
import { TrialBanner } from '@/components/layout/trial-banner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthContextProvider>
          <ClientContextProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
              <TrialBanner />
              <Sidebar />
              <div className="pl-64">
                <Header />
                <main className="p-6">{children}</main>
              </div>
            </div>
          </ClientContextProvider>
      </AuthContextProvider>
    </ToastProvider>
  );
}
