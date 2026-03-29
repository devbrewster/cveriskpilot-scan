import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import {
  SOC2_FRAMEWORK,
  SSDF_FRAMEWORK,
  ASVS_FRAMEWORK,
} from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// GET /api/compliance/frameworks — List available compliance frameworks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const frameworks = [SOC2_FRAMEWORK, SSDF_FRAMEWORK, ASVS_FRAMEWORK].map(
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
