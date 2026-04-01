import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import { buildAssessmentInput } from '@/lib/compliance-assessment';
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
  assessSOC2,
  assessSSDF,
  assessASVS,
  assessCMMC,
  assessFedRAMP,
  assessNIST80053,
  assessGDPR,
  assessHIPAA,
  assessPCIDSS,
  assessISO27001,
} from '@cveriskpilot/compliance';
import type { ComplianceAssessmentInput, ComplianceFramework, ComplianceEvidence } from '@cveriskpilot/compliance';
import { syncAssessmentEvidence } from '@/lib/evidence-sync';

const FRAMEWORKS: Record<string, ComplianceFramework> = {
  'soc2-type2': SOC2_FRAMEWORK,
  'nist-ssdf': SSDF_FRAMEWORK,
  'owasp-asvs': ASVS_FRAMEWORK,
  'cmmc-l2': CMMC_FRAMEWORK,
  'fedramp-moderate': FEDRAMP_FRAMEWORK,
  'nist-800-53-r5': NIST_800_53_FRAMEWORK,
  'gdpr': GDPR_FRAMEWORK,
  'hipaa': HIPAA_FRAMEWORK,
  'pci-dss': PCI_DSS_FRAMEWORK,
  'iso-27001': ISO27001_FRAMEWORK,
};

const ASSESSORS: Record<string, (input: ComplianceAssessmentInput) => ComplianceEvidence[]> = {
  'soc2-type2': assessSOC2,
  'nist-ssdf': assessSSDF,
  'owasp-asvs': assessASVS,
  'cmmc-l2': assessCMMC,
  'fedramp-moderate': assessFedRAMP,
  'nist-800-53-r5': assessNIST80053,
  'gdpr': assessGDPR,
  'hipaa': assessHIPAA,
  'pci-dss': assessPCIDSS,
  'iso-27001': assessISO27001,
};

// ---------------------------------------------------------------------------
// GET /api/compliance/frameworks/[id] — Framework controls with auto-assessed status
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await params;
    const organizationId = session.organizationId;

    const framework = FRAMEWORKS[id];
    const assessor = ASSESSORS[id];

    if (!framework || !assessor) {
      return NextResponse.json(
        { error: 'Framework not found' },
        { status: 404 },
      );
    }

    // Build assessment input from shared helper (deduplicates DB queries)
    const assessmentInput = await buildAssessmentInput(prisma, organizationId);

    const evidences = assessor(assessmentInput);

    // Persist evidence records to the database (fire-and-forget, non-blocking)
    syncAssessmentEvidence(prisma, organizationId, framework, evidences).catch((err) => {
      console.error('Evidence sync error (non-blocking):', err);
    });

    // Calculate overall score
    const applicableEvidences = evidences.filter((e) => e.status !== 'na');
    const metCount = evidences.filter((e) => e.status === 'met').length;
    const partialCount = evidences.filter((e) => e.status === 'partial').length;
    const notMetCount = evidences.filter((e) => e.status === 'not_met').length;
    const naCount = evidences.filter((e) => e.status === 'na').length;
    const overallScore =
      applicableEvidences.length > 0
        ? Math.round(
            ((metCount + partialCount * 0.5) / applicableEvidences.length) * 100,
          )
        : 0;

    return NextResponse.json({
      frameworkId: framework.id,
      frameworkName: framework.name,
      version: framework.version,
      description: framework.description,
      assessedAt: new Date().toISOString(),
      totalControls: framework.controls.length,
      metCount,
      partialCount,
      notMetCount,
      naCount,
      overallScore,
      controls: framework.controls.map((ctrl: any) => {
        const evidence = evidences.find((e) => e.controlId === ctrl.id);
        return {
          ...ctrl,
          status: evidence?.status ?? 'na',
          evidence: evidence?.evidence ?? '',
          lastVerified: evidence?.lastVerified ?? null,
          autoAssessed: evidence?.autoAssessed ?? false,
        };
      }),
    });
  } catch (error) {
    console.error('Framework assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to assess compliance framework' },
      { status: 500 },
    );
  }
}
