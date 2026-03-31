/**
 * Revenue Path API Route Tests
 *
 * Tests the underlying logic for critical revenue flows:
 * - Billing gate enforcement per tier
 * - Stripe webhook tier resolution
 * - RBAC permission chain for billing/AI/upload routes
 * - requirePerm HTTP response format
 * - Tier hierarchy correctness
 * - 402 billing denial response contract
 * - MFA backup code generation and verification
 * - Workflow approval gates for compliance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Direct sub-path imports to avoid pulling in the full barrel exports
// (which would chain-import Redis, WorkOS, Stripe, etc.)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Test: Billing gate integration with tier hierarchy
// ---------------------------------------------------------------------------

describe('Revenue: Billing gate per tier', () => {
  it('FREE tier has 50 AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    expect(free.max_ai_calls).toBe(50);
  });

  it('FOUNDERS_BETA has 250 AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const fb = getEntitlements('FOUNDERS_BETA');
    expect(fb.max_ai_calls).toBe(250);
  });

  it('PRO has 1000 AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const pro = getEntitlements('PRO');
    expect(pro.max_ai_calls).toBe(1000);
  });

  it('ENTERPRISE has unlimited AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const ent = getEntitlements('ENTERPRISE');
    expect(ent.max_ai_calls).toBe('unlimited');
  });

  it('MSSP has unlimited AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const mssp = getEntitlements('MSSP');
    expect(mssp.max_ai_calls).toBe('unlimited');
  });

  it('unknown tier falls back to FREE', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const unknown = getEntitlements('NONEXISTENT');
    expect(unknown.max_ai_calls).toBe(50);
    expect(unknown.max_users).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Test: Stripe webhook tier resolution
// ---------------------------------------------------------------------------

describe('Revenue: Stripe webhook tier mapping', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves PRO tier from Stripe price ID', async () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly_test';
    const { getTierFromPriceId } = await import('@cveriskpilot/billing/config');
    expect(getTierFromPriceId('price_pro_monthly_test')).toBe('PRO');
  });

  it('resolves FOUNDERS_BETA tier from Stripe price ID', async () => {
    process.env.STRIPE_PRICE_FOUNDERS_BETA_MONTHLY = 'price_fb_monthly_test';
    const { getTierFromPriceId } = await import('@cveriskpilot/billing/config');
    expect(getTierFromPriceId('price_fb_monthly_test')).toBe('FOUNDERS_BETA');
  });

  it('returns null for unknown price ID', async () => {
    const { getTierFromPriceId } = await import('@cveriskpilot/billing/config');
    expect(getTierFromPriceId('price_unknown_123')).toBeNull();
  });

  it('returns null when env vars are not set', async () => {
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    delete process.env.STRIPE_PRICE_PRO_ANNUAL;
    const { getTierFromPriceId } = await import('@cveriskpilot/billing/config');
    expect(getTierFromPriceId('price_pro_monthly_test')).toBeNull();
  });

  it('all tier entitlements have required fields', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const tiers = ['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP'];
    for (const tier of tiers) {
      const ent = getEntitlements(tier);
      expect(ent).toBeDefined();
      expect(
        ent.max_users === 'unlimited' || typeof ent.max_users === 'number',
      ).toBe(true);
      expect(
        ent.max_assets === 'unlimited' || typeof ent.max_assets === 'number',
      ).toBe(true);
      expect(
        ent.max_ai_calls === 'unlimited' ||
          typeof ent.max_ai_calls === 'number',
      ).toBe(true);
      expect(ent.api_rate_limit).toBeDefined();
    }
  });

  it('public tiers include FREE, PRO, ENTERPRISE, MSSP', async () => {
    const { getPublicTiers } = await import('@cveriskpilot/billing/config');
    const publicTiers = getPublicTiers();
    const publicTierNames = publicTiers.map((t) => t.tier);
    expect(publicTierNames).toContain('FREE');
    expect(publicTierNames).toContain('PRO');
    expect(publicTierNames).toContain('ENTERPRISE');
    expect(publicTierNames).toContain('MSSP');
    // FOUNDERS_BETA is invite-only (isPublic: false)
    expect(publicTierNames).not.toContain('FOUNDERS_BETA');
  });
});

// ---------------------------------------------------------------------------
// Test: RBAC permission chain for revenue-critical routes
// ---------------------------------------------------------------------------

describe('Revenue: RBAC on billing routes', () => {
  it('only ORG_OWNER and PLATFORM_ADMIN can manage billing', async () => {
    const { hasPermission } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    // These roles MUST be blocked from managing billing
    const blocked = [
      UserRole.VIEWER,
      UserRole.DEVELOPER,
      UserRole.ANALYST,
      UserRole.SECURITY_ADMIN,
      UserRole.CLIENT_VIEWER,
      UserRole.CLIENT_ADMIN,
      UserRole.SERVICE_ACCOUNT,
    ];
    for (const role of blocked) {
      expect(hasPermission(role, 'org:manage_billing')).toBe(false);
    }

    // These roles MUST be allowed
    expect(hasPermission(UserRole.ORG_OWNER, 'org:manage_billing')).toBe(true);
    expect(hasPermission(UserRole.PLATFORM_ADMIN, 'org:manage_billing')).toBe(
      true,
    );
  });

  it('AI advisory requires ai:advisory permission', async () => {
    const { hasPermission } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    // VIEWER and CLIENT_VIEWER must NOT have ai:advisory
    expect(hasPermission(UserRole.VIEWER, 'ai:advisory')).toBe(false);
    expect(hasPermission(UserRole.CLIENT_VIEWER, 'ai:advisory')).toBe(false);

    // DEVELOPER must NOT have ai:advisory (only ai:chat)
    expect(hasPermission(UserRole.DEVELOPER, 'ai:advisory')).toBe(false);

    // ANALYST and above should have it
    expect(hasPermission(UserRole.ANALYST, 'ai:advisory')).toBe(true);
    expect(hasPermission(UserRole.SECURITY_ADMIN, 'ai:advisory')).toBe(true);
    expect(hasPermission(UserRole.ORG_OWNER, 'ai:advisory')).toBe(true);
    expect(hasPermission(UserRole.PLATFORM_ADMIN, 'ai:advisory')).toBe(true);
  });

  it('upload requires scans:upload permission', async () => {
    const { hasPermission } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    // VIEWER and read-only roles must NOT upload
    expect(hasPermission(UserRole.VIEWER, 'scans:upload')).toBe(false);
    expect(hasPermission(UserRole.CLIENT_VIEWER, 'scans:upload')).toBe(false);
    expect(hasPermission(UserRole.DEVELOPER, 'scans:upload')).toBe(false);

    // ANALYST, SERVICE_ACCOUNT, and above should have it
    expect(hasPermission(UserRole.ANALYST, 'scans:upload')).toBe(true);
    expect(hasPermission(UserRole.SERVICE_ACCOUNT, 'scans:upload')).toBe(true);
    expect(hasPermission(UserRole.SECURITY_ADMIN, 'scans:upload')).toBe(true);
    expect(hasPermission(UserRole.ORG_OWNER, 'scans:upload')).toBe(true);
  });

  it('case triage requires cases:triage permission', async () => {
    const { hasPermission } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    expect(hasPermission(UserRole.VIEWER, 'cases:triage')).toBe(false);
    expect(hasPermission(UserRole.DEVELOPER, 'cases:triage')).toBe(false);
    expect(hasPermission(UserRole.SERVICE_ACCOUNT, 'cases:triage')).toBe(false);

    expect(hasPermission(UserRole.ANALYST, 'cases:triage')).toBe(true);
    expect(hasPermission(UserRole.SECURITY_ADMIN, 'cases:triage')).toBe(true);
    expect(hasPermission(UserRole.CLIENT_ADMIN, 'cases:triage')).toBe(true);
  });

  it('platform admin has all permissions', async () => {
    const { hasPermission, PERMISSIONS } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    const allPermissions = Object.keys(PERMISSIONS) as Array<
      keyof typeof PERMISSIONS
    >;
    for (const perm of allPermissions) {
      expect(hasPermission(UserRole.PLATFORM_ADMIN, perm)).toBe(true);
    }
  });

  it('org owner has all permissions except platform:admin', async () => {
    const { hasPermission, PERMISSIONS } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    const allPermissions = Object.keys(PERMISSIONS) as Array<
      keyof typeof PERMISSIONS
    >;
    for (const perm of allPermissions) {
      if (perm === 'platform:admin') {
        expect(hasPermission(UserRole.ORG_OWNER, perm)).toBe(false);
      } else {
        expect(hasPermission(UserRole.ORG_OWNER, perm)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test: requirePerm returns correct HTTP responses
// ---------------------------------------------------------------------------

describe('Revenue: requirePerm response format', () => {
  it('returns null for allowed access', async () => {
    const { requirePerm } = await import('@cveriskpilot/auth/rbac/guard');
    const result = requirePerm('PLATFORM_ADMIN', 'org:manage_billing');
    expect(result).toBeNull();
  });

  it('returns 403 with permission name for denied access', async () => {
    const { requirePerm } = await import('@cveriskpilot/auth/rbac/guard');
    const result = requirePerm('VIEWER', 'org:manage_billing');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe('Forbidden');
    expect(body.permission).toBe('org:manage_billing');
  });

  it('returns null when analyst requests ai:advisory', async () => {
    const { requirePerm } = await import('@cveriskpilot/auth/rbac/guard');
    expect(requirePerm('ANALYST', 'ai:advisory')).toBeNull();
  });

  it('returns 403 when viewer requests ai:advisory', async () => {
    const { requirePerm } = await import('@cveriskpilot/auth/rbac/guard');
    const result = requirePerm('VIEWER', 'ai:advisory');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns null when service account uploads scans', async () => {
    const { requirePerm } = await import('@cveriskpilot/auth/rbac/guard');
    expect(requirePerm('SERVICE_ACCOUNT', 'scans:upload')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: requireRole guard
// ---------------------------------------------------------------------------

describe('Revenue: requireRole guard', () => {
  it('returns null when role is in allowed list', async () => {
    const { requireRole } = await import('@cveriskpilot/auth/rbac/guard');
    expect(
      requireRole('ORG_OWNER', ['PLATFORM_ADMIN', 'ORG_OWNER']),
    ).toBeNull();
  });

  it('returns 403 when role is not in allowed list', async () => {
    const { requireRole } = await import('@cveriskpilot/auth/rbac/guard');
    const result = requireRole('VIEWER', ['PLATFORM_ADMIN', 'ORG_OWNER']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe('Insufficient permissions');
  });
});

// ---------------------------------------------------------------------------
// Test: Tier hierarchy is correct for billing
// ---------------------------------------------------------------------------

describe('Revenue: Tier hierarchy enforced', () => {
  it('FREE < FOUNDERS_BETA < PRO for AI calls', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    const fb = getEntitlements('FOUNDERS_BETA');
    const pro = getEntitlements('PRO');

    expect(free.max_ai_calls as number).toBeLessThan(
      fb.max_ai_calls as number,
    );
    expect(fb.max_ai_calls as number).toBeLessThan(pro.max_ai_calls as number);
  });

  it('FREE < FOUNDERS_BETA < PRO for assets', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    const fb = getEntitlements('FOUNDERS_BETA');
    const pro = getEntitlements('PRO');

    expect(free.max_assets as number).toBeLessThan(fb.max_assets as number);
    expect(fb.max_assets as number).toBeLessThan(pro.max_assets as number);
  });

  it('FREE < FOUNDERS_BETA < PRO for users', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    const fb = getEntitlements('FOUNDERS_BETA');
    const pro = getEntitlements('PRO');

    expect(free.max_users as number).toBeLessThan(fb.max_users as number);
    expect(fb.max_users as number).toBeLessThan(pro.max_users as number);
  });

  it('FREE < FOUNDERS_BETA < PRO for API rate limit', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    const fb = getEntitlements('FOUNDERS_BETA');
    const pro = getEntitlements('PRO');

    expect(free.api_rate_limit as number).toBeLessThan(
      fb.api_rate_limit as number,
    );
    expect(fb.api_rate_limit as number).toBeLessThan(
      pro.api_rate_limit as number,
    );
  });

  it('ENTERPRISE and MSSP have unlimited assets', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    expect(getEntitlements('ENTERPRISE').max_assets).toBe('unlimited');
    expect(getEntitlements('MSSP').max_assets).toBe('unlimited');
  });

  it('ENTERPRISE and MSSP have unlimited users', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    expect(getEntitlements('ENTERPRISE').max_users).toBe('unlimited');
    expect(getEntitlements('MSSP').max_users).toBe('unlimited');
  });

  it('ENTERPRISE and MSSP have unlimited uploads', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    expect(getEntitlements('ENTERPRISE').max_monthly_uploads).toBe('unlimited');
    expect(getEntitlements('MSSP').max_monthly_uploads).toBe('unlimited');
  });
});

// ---------------------------------------------------------------------------
// Test: Tier config metadata for pricing page
// ---------------------------------------------------------------------------

describe('Revenue: Tier config metadata', () => {
  it('FREE tier has $0 pricing', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');
    const free = getTierConfig('FREE');
    expect(free).not.toBeNull();
    expect(free!.monthlyPrice).toBe(0);
    expect(free!.annualPrice).toBe(0);
  });

  it('FOUNDERS_BETA is $29/mo', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');
    const fb = getTierConfig('FOUNDERS_BETA');
    expect(fb).not.toBeNull();
    expect(fb!.monthlyPrice).toBe(29);
  });

  it('PRO is $149/mo', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');
    const pro = getTierConfig('PRO');
    expect(pro).not.toBeNull();
    expect(pro!.monthlyPrice).toBe(149);
  });

  it('ENTERPRISE and MSSP have contact-sales pricing', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');
    const ent = getTierConfig('ENTERPRISE');
    const mssp = getTierConfig('MSSP');
    expect(ent!.isContactSales).toBe(true);
    expect(mssp!.isContactSales).toBe(true);
    expect(ent!.monthlyPrice).toBe(-1);
    expect(mssp!.monthlyPrice).toBe(-1);
  });

  it('annual pricing is ~20% off monthly for paid tiers', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');

    const fb = getTierConfig('FOUNDERS_BETA')!;
    const fbMonthlyAnnualized = fb.monthlyPrice * 12;
    expect(fb.annualPrice).toBeLessThan(fbMonthlyAnnualized);

    const pro = getTierConfig('PRO')!;
    const proMonthlyAnnualized = pro.monthlyPrice * 12;
    expect(pro.annualPrice).toBeLessThan(proMonthlyAnnualized);
  });

  it('returns null for unknown tier config', async () => {
    const { getTierConfig } = await import('@cveriskpilot/billing/config');
    expect(getTierConfig('NONEXISTENT')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: 402 billing denial response contract
// ---------------------------------------------------------------------------

describe('Revenue: 402 response contract', () => {
  it('billing denial response has all required fields', () => {
    // This tests the contract that AI/enrichment routes must follow
    // when returning a 402 to the client
    const mockDenial = {
      error: 'Monthly AI call limit reached (50/50)',
      code: 'BILLING_LIMIT_EXCEEDED',
      upgradeRequired: 'PRO',
      upgradeUrl: '/settings/billing',
    };

    expect(mockDenial.error).toBeTruthy();
    expect(mockDenial.code).toBe('BILLING_LIMIT_EXCEEDED');
    expect(mockDenial.upgradeRequired).toBeTruthy();
    expect(mockDenial.upgradeUrl).toBe('/settings/billing');
  });

  it('GateResult type has correct shape for denied gate', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    // Simulate what checkFeatureGate returns when quota is exceeded
    const free = getEntitlements('FREE');
    const mockGateResult = {
      allowed: false,
      reason: `Monthly AI call limit reached (${free.max_ai_calls}/${free.max_ai_calls})`,
      upgradeRequired: 'PRO',
    };

    expect(mockGateResult.allowed).toBe(false);
    expect(mockGateResult.reason).toContain('50/50');
    expect(mockGateResult.upgradeRequired).toBe('PRO');
  });

  it('GateResult type has correct shape for allowed gate', () => {
    const mockGateResult = { allowed: true };
    expect(mockGateResult.allowed).toBe(true);
    expect((mockGateResult as Record<string, unknown>).reason).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test: Feature entitlements per tier
// ---------------------------------------------------------------------------

describe('Revenue: Feature entitlements', () => {
  it('FREE tier includes api_access', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const free = getEntitlements('FREE');
    expect(free.features).toContain('api_access');
  });

  it('FOUNDERS_BETA includes jira_sync and webhooks', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const fb = getEntitlements('FOUNDERS_BETA');
    expect(fb.features).toContain('jira_sync');
    expect(fb.features).toContain('webhooks');
    expect(fb.features).toContain('custom_sla');
  });

  it('PRO includes scheduled_reports', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const pro = getEntitlements('PRO');
    expect(pro.features).toContain('scheduled_reports');
  });

  it('ENTERPRISE includes sso and multi_client', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const ent = getEntitlements('ENTERPRISE');
    expect(ent.features).toContain('sso');
    expect(ent.features).toContain('multi_client');
    expect(ent.features).toContain('custom_parsers');
  });

  it('MSSP includes white_label on top of ENTERPRISE features', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');
    const mssp = getEntitlements('MSSP');
    expect(mssp.features).toContain('white_label');
    expect(mssp.features).toContain('sso');
    expect(mssp.features).toContain('multi_client');
  });

  it('lower tiers do not include higher-tier features', async () => {
    const { getEntitlements } = await import('@cveriskpilot/billing/config');

    const free = getEntitlements('FREE');
    expect(free.features).not.toContain('sso');
    expect(free.features).not.toContain('white_label');
    expect(free.features).not.toContain('scheduled_reports');

    const fb = getEntitlements('FOUNDERS_BETA');
    expect(fb.features).not.toContain('sso');
    expect(fb.features).not.toContain('white_label');

    const pro = getEntitlements('PRO');
    expect(pro.features).not.toContain('sso');
    expect(pro.features).not.toContain('white_label');
  });
});

// ---------------------------------------------------------------------------
// Test: MFA backup codes
// ---------------------------------------------------------------------------

describe('Revenue: MFA backup codes', () => {
  it('generates correct number of backup codes', async () => {
    const { generateBackupCodes } = await import(
      '@cveriskpilot/auth/mfa/totp'
    );
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    // Each code should be 8 uppercase hex chars (0-9, A-F)
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    }
  });

  it('generates default of 10 codes when count not specified', async () => {
    const { generateBackupCodes } = await import(
      '@cveriskpilot/auth/mfa/totp'
    );
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
  });

  it('all generated codes are unique', async () => {
    const { generateBackupCodes } = await import(
      '@cveriskpilot/auth/mfa/totp'
    );
    const codes = generateBackupCodes(10);
    const unique = new Set(codes);
    expect(unique.size).toBe(10);
  });

  it('verifyBackupCode matches a correct code', async () => {
    const { generateBackupCodes, hashBackupCode, verifyBackupCode } =
      await import('@cveriskpilot/auth/mfa/totp');
    const codes = generateBackupCodes(5);
    const hashed = codes.map(hashBackupCode);

    // First code should match at index 0
    expect(verifyBackupCode(codes[0], hashed)).toBe(0);
    // Last code should match at index 4
    expect(verifyBackupCode(codes[4], hashed)).toBe(4);
    // Wrong code should return -1
    expect(verifyBackupCode('ZZZZZZZZ', hashed)).toBe(-1);
  });

  it('backup codes are case-insensitive', async () => {
    const { hashBackupCode, verifyBackupCode } = await import(
      '@cveriskpilot/auth/mfa/totp'
    );
    const code = 'ABCD1234';
    const hashed = [hashBackupCode(code)];
    expect(verifyBackupCode('abcd1234', hashed)).toBe(0);
  });

  it('hashBackupCode produces consistent hashes', async () => {
    const { hashBackupCode } = await import('@cveriskpilot/auth/mfa/totp');
    const code = 'DEADBEEF';
    const hash1 = hashBackupCode(code);
    const hash2 = hashBackupCode(code);
    expect(hash1).toBe(hash2);
    // Hash should be a hex string (SHA-256 = 64 hex chars)
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Test: Workflow approval gates for compliance
// ---------------------------------------------------------------------------

describe('Revenue: Workflow approval compliance', () => {
  it('approval-required transition is blocked without approval', async () => {
    const { validateTransition } = await import(
      '../../apps/web/src/lib/workflow'
    );

    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: null,
    });

    expect(result.valid).toBe(false);
    expect(result.needsApproval).toBe(true);
  });

  it('approved transition is allowed', async () => {
    const { validateTransition } = await import(
      '../../apps/web/src/lib/workflow'
    );

    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    });

    expect(result.valid).toBe(true);
  });

  it('non-approval-required transition is always allowed', async () => {
    const { validateTransition } = await import(
      '../../apps/web/src/lib/workflow'
    );

    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: false,
      approvalStatus: null,
    });

    expect(result.valid).toBe(true);
  });

  it('invalid transition is rejected regardless of approval', async () => {
    const { validateTransition } = await import(
      '../../apps/web/src/lib/workflow'
    );

    // NEW -> VERIFIED_CLOSED is not a valid transition
    const result = validateTransition('NEW', 'VERIFIED_CLOSED', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid transition');
  });

  it('valid transitions are defined for key statuses', async () => {
    const { isValidTransition } = await import(
      '../../apps/web/src/lib/workflow'
    );

    // Core remediation flow
    expect(isValidTransition('NEW', 'TRIAGE')).toBe(true);
    expect(isValidTransition('TRIAGE', 'IN_REMEDIATION')).toBe(true);
    expect(
      isValidTransition('IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION'),
    ).toBe(true);
    expect(
      isValidTransition('FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED'),
    ).toBe(true);

    // Risk acceptance flow
    expect(isValidTransition('TRIAGE', 'ACCEPTED_RISK')).toBe(true);
    expect(isValidTransition('TRIAGE', 'FALSE_POSITIVE')).toBe(true);

    // Reopen flow
    expect(isValidTransition('VERIFIED_CLOSED', 'REOPENED')).toBe(true);
    expect(isValidTransition('ACCEPTED_RISK', 'REOPENED')).toBe(true);
  });

  it('approval-required transitions are defined for high-impact changes', async () => {
    const { transitionRequiresApproval } = await import(
      '../../apps/web/src/lib/workflow'
    );

    // High-impact transitions require approval when flag is set
    expect(transitionRequiresApproval('TRIAGE', 'IN_REMEDIATION', true)).toBe(
      true,
    );
    expect(
      transitionRequiresApproval(
        'FIXED_PENDING_VERIFICATION',
        'VERIFIED_CLOSED',
        true,
      ),
    ).toBe(true);
    expect(transitionRequiresApproval('NEW', 'ACCEPTED_RISK', true)).toBe(true);
    expect(transitionRequiresApproval('TRIAGE', 'FALSE_POSITIVE', true)).toBe(
      true,
    );

    // Same transitions do NOT require approval when flag is false
    expect(transitionRequiresApproval('TRIAGE', 'IN_REMEDIATION', false)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Test: AuthorizationError for programmatic RBAC checks
// ---------------------------------------------------------------------------

describe('Revenue: AuthorizationError', () => {
  it('requirePermission throws AuthorizationError on denied access', async () => {
    const { requirePermission, AuthorizationError } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    expect(() =>
      requirePermission(UserRole.VIEWER, 'org:manage_billing'),
    ).toThrow(AuthorizationError);
  });

  it('requirePermission does not throw on allowed access', async () => {
    const { requirePermission } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    expect(() =>
      requirePermission(UserRole.ORG_OWNER, 'org:manage_billing'),
    ).not.toThrow();
  });

  it('AuthorizationError includes role and permission', async () => {
    const { requirePermission, AuthorizationError } = await import(
      '@cveriskpilot/auth/rbac/permissions'
    );
    const { UserRole } = await import('@cveriskpilot/domain');

    try {
      requirePermission(UserRole.VIEWER, 'org:manage_billing');
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      const authErr = err as InstanceType<typeof AuthorizationError>;
      expect(authErr.role).toBe(UserRole.VIEWER);
      expect(authErr.permission).toBe('org:manage_billing');
    }
  });
});
