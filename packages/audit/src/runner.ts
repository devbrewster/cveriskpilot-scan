import { allChecks } from './checks/index.js';
import type { AuditReport, CheckResult, Severity } from './types.js';

export async function runAudit(rootDir: string): Promise<AuditReport> {
  const start = performance.now();

  const results: CheckResult[] = await Promise.all(
    allChecks.map(async (check) => {
      const checkStart = performance.now();
      try {
        const findings = await check.run(rootDir);
        return {
          name: check.name,
          findings,
          duration_ms: Math.round(performance.now() - checkStart),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        return {
          name: check.name,
          findings: [
            {
              id: `runner-error-${check.name}`,
              severity: 'INFO' as Severity,
              category: 'runner',
              title: `Check "${check.name}" threw an error`,
              detail: message,
              file: '',
            },
          ],
          duration_ms: Math.round(performance.now() - checkStart),
        };
      }
    }),
  );

  const summary: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  let totalFindings = 0;
  for (const result of results) {
    for (const finding of result.findings) {
      summary[finding.severity]++;
      totalFindings++;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    duration_ms: Math.round(performance.now() - start),
    checks: results,
    summary,
    totalFindings,
  };
}
