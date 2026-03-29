import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';

/**
 * GET /api/ops/billing
 * Returns mock billing operations data for the ops dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }
  const mrr = 42_850;
  const arr = mrr * 12;
  const customerCount = 365;

  const tierDistribution = {
    FREE: 312,
    FOUNDERS_BETA: 87,
    PRO: 204,
    ENTERPRISE: 56,
    MSSP: 18,
  };

  const overdueInvoices = [
    {
      id: 'inv_01',
      orgName: 'Acme Corp',
      amount: 2400,
      daysOverdue: 32,
      stripeInvoiceId: 'in_1ABC123',
      email: 'billing@acme.com',
    },
    {
      id: 'inv_02',
      orgName: 'TechVault Inc',
      amount: 890,
      daysOverdue: 18,
      stripeInvoiceId: 'in_2DEF456',
      email: 'finance@techvault.io',
    },
    {
      id: 'inv_03',
      orgName: 'CloudWatch Systems',
      amount: 4500,
      daysOverdue: 7,
      stripeInvoiceId: 'in_3GHI789',
      email: 'ap@cloudwatch.dev',
    },
    {
      id: 'inv_04',
      orgName: 'NexGen Security',
      amount: 199,
      daysOverdue: 45,
      stripeInvoiceId: 'in_4JKL012',
      email: 'admin@nexgen.sec',
    },
    {
      id: 'inv_05',
      orgName: 'PatchPro Inc',
      amount: 1200,
      daysOverdue: 3,
      stripeInvoiceId: 'in_5MNO345',
      email: 'billing@patchpro.com',
    },
  ];

  const recentTransactions = [
    { id: 'txn_01', date: '2026-03-28', orgName: 'SecureDef LLC', amount: 499, type: 'payment' as const, status: 'succeeded' as const },
    { id: 'txn_02', date: '2026-03-28', orgName: 'GovSec Partners', amount: 1299, type: 'upgrade' as const, status: 'succeeded' as const },
    { id: 'txn_03', date: '2026-03-27', orgName: 'DataShield Corp', amount: 199, type: 'payment' as const, status: 'succeeded' as const },
    { id: 'txn_04', date: '2026-03-27', orgName: 'CyberFirst LLC', amount: -99, type: 'refund' as const, status: 'succeeded' as const },
    { id: 'txn_05', date: '2026-03-27', orgName: 'VulnHunters', amount: 499, type: 'payment' as const, status: 'succeeded' as const },
    { id: 'txn_06', date: '2026-03-26', orgName: 'Acme Corp', amount: 2400, type: 'payment' as const, status: 'failed' as const },
    { id: 'txn_07', date: '2026-03-26', orgName: 'NexGen Security', amount: 799, type: 'upgrade' as const, status: 'succeeded' as const },
    { id: 'txn_08', date: '2026-03-25', orgName: 'PatchPro Inc', amount: 199, type: 'payment' as const, status: 'succeeded' as const },
    { id: 'txn_09', date: '2026-03-25', orgName: 'TechVault Inc', amount: -450, type: 'refund' as const, status: 'succeeded' as const },
    { id: 'txn_10', date: '2026-03-24', orgName: 'CloudWatch Systems', amount: 1299, type: 'payment' as const, status: 'succeeded' as const },
  ];

  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    mrr,
    arr,
    customerCount,
    overdueTotal,
    tierDistribution,
    overdueInvoices,
    recentTransactions,
  });
}
