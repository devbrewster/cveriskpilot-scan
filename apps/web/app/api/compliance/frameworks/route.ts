import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import {
  SOC2_FRAMEWORK,
  SSDF_FRAMEWORK,
  ASVS_FRAMEWORK,
  CMMC_FRAMEWORK,
  FEDRAMP_FRAMEWORK,
  NIST_800_53_FRAMEWORK,
  GDPR_FRAMEWORK,
  HIPAA_FRAMEWORK,
  PCI_DSS_FRAMEWORK,
  ISO27001_FRAMEWORK,
} from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// GET /api/compliance/frameworks — List available compliance frameworks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const frameworks = [
    SOC2_FRAMEWORK,
    SSDF_FRAMEWORK,
    ASVS_FRAMEWORK,
    CMMC_FRAMEWORK,
    FEDRAMP_FRAMEWORK,
    NIST_800_53_FRAMEWORK,
    GDPR_FRAMEWORK,
    HIPAA_FRAMEWORK,
    PCI_DSS_FRAMEWORK,
    ISO27001_FRAMEWORK,
  ].map(
    (fw) => ({
      id: fw.id,
      name: fw.name,
      version: fw.version,
      description: fw.description,
      controlCount: fw.controls.length,
    }),
  );

  return NextResponse.json({ frameworks });
}
