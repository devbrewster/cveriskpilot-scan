import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// In-memory AI prompt config store (per org)
// In production, this would be stored in Organization.aiPromptConfig via Prisma.
// ---------------------------------------------------------------------------

const VALID_FRAMEWORKS = new Set([
  'SOC2',
  'SSDF',
  'ASVS',
  'NIST 800-171',
  'FedRAMP',
  'HIPAA',
  'PCI-DSS',
]);

const VALID_STYLES = new Set(['concise', 'detailed', 'step-by-step']);

interface OrgPromptConfig {
  customSystemPrompt?: string;
  techStack?: string;
  complianceFrameworks?: string[];
  remediationStyle?: 'concise' | 'detailed' | 'step-by-step';
  excludePatterns?: string[];
}

// Simple in-memory store keyed by organizationId
const promptConfigs: Record<string, OrgPromptConfig> = {};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfig(body: unknown): { config?: OrgPromptConfig; errors?: string[] } {
  if (!body || typeof body !== 'object') {
    return { errors: ['Request body must be a JSON object'] };
  }

  const input = body as Record<string, unknown>;
  const errors: string[] = [];
  const config: OrgPromptConfig = {};

  // customSystemPrompt
  if (input.customSystemPrompt !== undefined) {
    if (typeof input.customSystemPrompt !== 'string') {
      errors.push('customSystemPrompt must be a string');
    } else if (input.customSystemPrompt.length > 2000) {
      errors.push('customSystemPrompt must be at most 2000 characters');
    } else if (input.customSystemPrompt.length > 0) {
      config.customSystemPrompt = input.customSystemPrompt;
    }
  }

  // techStack
  if (input.techStack !== undefined) {
    if (typeof input.techStack !== 'string') {
      errors.push('techStack must be a string');
    } else if (input.techStack.length > 500) {
      errors.push('techStack must be at most 500 characters');
    } else if (input.techStack.length > 0) {
      config.techStack = input.techStack;
    }
  }

  // complianceFrameworks
  if (input.complianceFrameworks !== undefined) {
    if (!Array.isArray(input.complianceFrameworks)) {
      errors.push('complianceFrameworks must be an array');
    } else {
      const invalid = input.complianceFrameworks.filter(
        (f: unknown) => typeof f !== 'string' || !VALID_FRAMEWORKS.has(f),
      );
      if (invalid.length > 0) {
        errors.push(
          `Invalid compliance frameworks: ${invalid.join(', ')}. Valid: ${[...VALID_FRAMEWORKS].join(', ')}`,
        );
      } else if (input.complianceFrameworks.length > 0) {
        config.complianceFrameworks = input.complianceFrameworks as string[];
      }
    }
  }

  // remediationStyle
  if (input.remediationStyle !== undefined) {
    if (typeof input.remediationStyle !== 'string' || !VALID_STYLES.has(input.remediationStyle)) {
      errors.push(
        `remediationStyle must be one of: ${[...VALID_STYLES].join(', ')}`,
      );
    } else {
      config.remediationStyle = input.remediationStyle as OrgPromptConfig['remediationStyle'];
    }
  }

  // excludePatterns
  if (input.excludePatterns !== undefined) {
    if (!Array.isArray(input.excludePatterns)) {
      errors.push('excludePatterns must be an array');
    } else if (input.excludePatterns.length > 20) {
      errors.push('excludePatterns must have at most 20 entries');
    } else {
      const invalidEntries = input.excludePatterns.filter(
        (p: unknown) => typeof p !== 'string' || p.length > 100,
      );
      if (invalidEntries.length > 0) {
        errors.push('Each excludePattern must be a string of at most 100 characters');
      } else if (input.excludePatterns.length > 0) {
        config.excludePatterns = input.excludePatterns as string[];
      }
    }
  }

  if (errors.length > 0) return { errors };
  return { config };
}

// ---------------------------------------------------------------------------
// GET /api/settings/ai-prompts — current org AI prompt config
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;
    const config = promptConfigs[organizationId] ?? {};

    return NextResponse.json({ organizationId, config });
  } catch (error) {
    console.error('AI prompt config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI prompt config' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/ai-prompts — update org AI prompt config
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

    const organizationId = session.organizationId;
    const body = await request.json();

    const { config, errors } = validateConfig(body);
    if (errors) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    promptConfigs[organizationId] = config!;

    return NextResponse.json({
      organizationId,
      config: config!,
      message: 'AI prompt config updated successfully',
    });
  } catch (error) {
    console.error('AI prompt config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI prompt config' },
      { status: 500 },
    );
  }
}
