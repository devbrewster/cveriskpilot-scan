import { OpsSidebar } from '@/components/ops/ops-sidebar';
import { ToastProvider } from '@/components/ui/toast';
import { AuthContextProvider } from '@/components/layout/auth-context-provider';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthContextProvider>
        <div className="min-h-screen bg-gray-950">
          <OpsSidebar />
          <div className="pl-60">
            {/* Ops Header */}
            <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
              <div className="flex h-14 items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold text-white">CVERiskPilot Ops</h1>
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/30">
                    Internal
                  </span>
                </div>
              </div>
            </header>
            <main className="p-6">{children}</main>
          </div>
        </div>
      </AuthContextProvider>
    </ToastProvider>
  );
}
