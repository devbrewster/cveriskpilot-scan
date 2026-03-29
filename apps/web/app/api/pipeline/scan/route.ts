import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { validateApiKey, hasScope } from '@cveriskpilot/auth';
import { parse } from '@cveriskpilot/parsers';
import type { ParserFormat } from '@cveriskpilot/parsers';
import {
  mapFindingsToComplianceImpact,
  evaluatePolicy,
  getDefaultPolicy,
  generatePipelinePOAM,
} from '@cveriskpilot/compliance';
import type { PipelinePolicy } from '@cveriskpilot/compliance';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Format mapping: pipeline format names -> internal parser format
// ---------------------------------------------------------------------------

const PIPELINE_FORMAT_MAP: Record<string, ParserFormat> = {
  sarif: 'SARIF',
  cyclonedx: 'CYCLONEDX',
  'trivy-json': 'JSON_FORMAT',
  'generic-json': 'JSON_FORMAT',
  json: 'JSON_FORMAT',
  nessus: 'NESSUS',
  csv: 'CSV',
  qualys: 'QUALYS',
  openvas: 'OPENVAS',
  osv: 'OSV',
  csaf: 'CSAF',
  spdx: 'SPDX',
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

interface PipelineScanInput {
  format: string;
  content: string | object;
  repoUrl?: string;
  commitSha?: string;
  branch?: string;
  prNumber?: number;
  frameworks?: string[];
}

function validateInput(body: unknown): { data: PipelineScanInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const data = body as Record<string, unknown>;

  if (!data['format'] || typeof data['format'] !== 'string') {
    return { error: 'Missing required field: format' };
  }

  if (!data['content']) {
    return { error: 'Missing required field: content' };
  }

  const format = data['format'] as string;
  if (!PIPELINE_FORMAT_MAP[format.toLowerCase()]) {
    return {
      error: `Unsupported format: ${format}. Supported: ${Object.keys(PIPELINE_FORMAT_MAP).join(', ')}`,
    };
  }

  if (data['prNumber'] !== undefined && typeof data['prNumber'] !== 'number') {
    return { error: 'prNumber must be a number' };
  }

  if (data['frameworks'] !== undefined) {
    if (!Array.isArray(data['frameworks'])) {
      return { error: 'frameworks must be an array of framework IDs' };
    }
    for (const fw of data['frameworks']) {
      if (typeof fw !== 'string') {
        return { error: 'frameworks must be an array of strings' };
      }
    }
  }

  return {
    data: {
      format: data['format'] as string,
      content: data['content'] as string | object,
      repoUrl: data['repoUrl'] as string | undefined,
      commitSha: data['commitSha'] as string | undefined,
      branch: data['branch'] as string | undefined,
      prNumber: data['prNumber'] as number | undefined,
      frameworks: data['frameworks'] as string[] | undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/pipeline/scan
// ---------------------------------------------------------------------------

/**
 * POST /api/pipeline/scan
 *
 * Pipeline scan endpoint for CI/CD integration.  Accepts scan results in
 * various formats, maps findings to compliance controls across multiple
 * frameworks, evaluates the org's pipeline policy, auto-generates POAM
 * entries, and returns a verdict.
 *
 * Auth: API key via Authorization: Bearer crp_*
 */
export async function POST(request: NextRequest) {
  try {
    // ---- Auth: API key ----
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected: Bearer crp_*' },
        { status: 401 },
      );
    }

    const apiKey = authHeader.slice(7).trim();
    const keyResult = await validateApiKey(prisma, apiKey);

    if (!keyResult.valid) {
      return NextResponse.json(
        { error: keyResult.error ?? 'Invalid API key' },
        { status: 401 },
      );
    }

    // Check scope
    if (!hasScope(keyResult.scope ?? '', 'pipeline') && !hasScope(keyResult.scope ?? '', 'upload')) {
      return NextResponse.json(
        { error: 'API key does not have pipeline or upload scope' },
        { status: 403 },
      );
    }

    const organizationId = keyResult.organizationId!;

    // ---- Parse request body ----
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 },
      );
    }

    const validation = validateInput(body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const input = validation.data;

    // ---- Resolve parser format ----
    const parserFormat = PIPELINE_FORMAT_MAP[input.format.toLowerCase()];
    if (!parserFormat) {
      return NextResponse.json(
        { error: `Unsupported format: ${input.format}` },
        { status: 400 },
      );
    }

    // ---- Serialize content ----
    const contentStr =
      typeof input.content === 'string'
        ? input.content
        : JSON.stringify(input.content);

    // ---- Parse scan results ----
    const parseResult = await parse(parserFormat, contentStr);

    // ---- Extract CWEs and map to compliance controls ----
    const complianceImpact = mapFindingsToComplianceImpact(
      parseResult.findings,
      input.frameworks,
    );

    // ---- Load or default pipeline policy ----
    let policy: PipelinePolicy;
    try {
      const stored = await (prisma as any).pipelinePolicy?.findUnique?.({
        where: { organizationId },
      });
      if (stored) {
        policy = {
          orgId: organizationId,
          frameworks: stored.frameworks ?? ['nist-800-53'],
          blockOnSeverity: stored.blockOnSeverity ?? 'CRITICAL',
          blockOnControlViolation: stored.blockOnControlViolation ?? false,
          warnOnly: stored.warnOnly ?? false,
          autoExceptionRules: stored.autoExceptionRules ?? [],
          gracePeriodDays: stored.gracePeriodDays ?? 0,
        };
      } else {
        policy = getDefaultPolicy(organizationId);
      }
    } catch {
      // PipelinePolicy table may not exist yet — use defaults
      policy = getDefaultPolicy(organizationId);
    }

    // Override frameworks if the request specifies them
    if (input.frameworks && input.frameworks.length > 0) {
      policy = { ...policy, frameworks: input.frameworks };
    }

    // ---- Evaluate policy ----
    const policyResult = evaluatePolicy(
      parseResult.findings,
      policy,
      complianceImpact,
    );

    // ---- Auto-generate POAM entries ----
    const blockedIndices = new Set<number>();
    for (const blocked of policyResult.blockedFindings) {
      const idx = parseResult.findings.indexOf(blocked);
      if (idx >= 0) blockedIndices.add(idx);
    }

    const poamItems = generatePipelinePOAM(
      parseResult.findings,
      complianceImpact,
      {
        repoUrl: input.repoUrl,
        commitSha: input.commitSha,
        branch: input.branch,
        prNumber: input.prNumber,
      },
      blockedIndices,
    );

    // ---- Generate scan ID ----
    const scanId = crypto.randomUUID();

    // ---- Build severity summary ----
    const summary: Record<string, number> = { total: parseResult.findings.length };
    for (const finding of parseResult.findings) {
      const sev = finding.severity.toLowerCase();
      summary[sev] = (summary[sev] ?? 0) + 1;
    }

    // ---- Build compliance impact response ----
    const complianceImpactResponse = complianceImpact.entries.map((entry) => ({
      framework: entry.framework,
      controlId: entry.controlId,
      controlTitle: entry.controlTitle,
      affectedBy: entry.affectedBy,
    }));

    // ---- Persist scan result for later retrieval ----
    try {
      await (prisma as any).pipelineScanResult?.create?.({
        data: {
          id: scanId,
          organizationId,
          format: input.format,
          repoUrl: input.repoUrl ?? null,
          commitSha: input.commitSha ?? null,
          branch: input.branch ?? null,
          prNumber: input.prNumber ?? null,
          verdict: policyResult.verdict,
          totalFindings: parseResult.findings.length,
          criticalCount: summary['critical'] ?? 0,
          highCount: summary['high'] ?? 0,
          mediumCount: summary['medium'] ?? 0,
          lowCount: summary['low'] ?? 0,
          infoCount: summary['info'] ?? 0,
          complianceImpact: complianceImpactResponse,
          policyReasons: policyResult.reasons,
          poamEntriesCreated: poamItems.length,
          findings: parseResult.findings.map((f) => ({
            title: f.title,
            severity: f.severity,
            cveIds: f.cveIds,
            cweIds: f.cweIds,
            assetName: f.assetName,
            filePath: f.filePath,
            lineNumber: f.lineNumber,
            packageName: f.packageName,
            packageVersion: f.packageVersion,
          })),
        },
      });
    } catch {
      // PipelineScanResult table may not exist yet — continue without persistence
      // The scan result is still returned in the response
    }

    // ---- Audit log (fire-and-forget) ----
    (prisma as any).auditLog?.create?.({
      data: {
        organizationId,
        actorId: keyResult.keyId ?? 'api-key',
        action: 'CREATE',
        entityType: 'PipelineScan',
        entityId: scanId,
        details: {
          format: input.format,
          repoUrl: input.repoUrl,
          commitSha: input.commitSha,
          branch: input.branch,
          prNumber: input.prNumber,
          verdict: policyResult.verdict,
          totalFindings: parseResult.findings.length,
          poamEntriesCreated: poamItems.length,
        },
        hash: `pipeline-scan-${scanId}`,
      },
    }).catch(() => {
      // Best-effort audit logging
    });

    // ---- Response ----
    const appHost = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cveriskpilot.com';

    return NextResponse.json({
      scanId,
      verdict: policyResult.verdict,
      summary,
      policyReasons: policyResult.reasons,
      complianceImpact: complianceImpactResponse,
      poamEntriesCreated: poamItems.length,
      dashboardUrl: `${appHost}/pipelines/${scanId}`,
    });
  } catch (error) {
    console.error('[API] POST /api/pipeline/scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing pipeline scan' },
      { status: 500 },
    );
  }
}
