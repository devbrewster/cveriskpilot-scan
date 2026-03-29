import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortalSidebarClient } from './portal-sidebar-client';

// ---------------------------------------------------------------------------
// Portal Layout - Simplified layout for client_viewer / client_admin users
// ---------------------------------------------------------------------------

async function getPortalSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('crp_portal_session');
  if (!sessionCookie?.value) return null;

  try {
    // Cookie format: <base64-payload>.<hmac-signature>
    const raw = sessionCookie.value;
    const dotIndex = raw.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payload = raw.slice(0, dotIndex);
    const signature = raw.slice(dotIndex + 1);

    // Verify HMAC signature to prevent forgery
    const crypto = await import('node:crypto');
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8'),
    );
    if (!session?.user?.id || !session?.clientId) return null;
    return session;
  } catch {
    return null;
  }
}


export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();

  if (!session) {
    redirect('/login?redirect=/portal');
  }

  const clientName = session.user?.clientName || 'Client Portal';

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalSidebarClient clientName={clientName} />
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              <span className="text-sm font-medium text-blue-800">{clientName}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{session.user?.name || session.user?.email || 'Portal User'}</span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
