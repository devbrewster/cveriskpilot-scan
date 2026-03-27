/**
 * Executive Summary PDF report generation for CVERiskPilot.
 * Generates a print-friendly HTML page that can be printed/saved as PDF via the browser.
 */

export interface ExecutiveReportData {
  organizationName: string;
  reportDate: string;
  dateRange: { from: string; to: string };
  totalCases: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  kevCount: number;
  avgEpssScore: number;
  meanTimeToRemediate: string;
  topCriticalCases: {
    cveIds: string[];
    title: string;
    cvssScore: number | null;
    epssScore: number | null;
    kevListed: boolean;
    status: string;
  }[];
  kevExposure: {
    cveIds: string[];
    title: string;
    kevDueDate: string | null;
    status: string;
  }[];
  epssHighRisk: {
    cveIds: string[];
    title: string;
    epssScore: number | null;
    severity: string;
    status: string;
  }[];
  openCount: number;
  closedCount: number;
  includeSections: {
    keyMetrics: boolean;
    severityDistribution: boolean;
    topCritical: boolean;
    kevExposure: boolean;
    epssHighRisk: boolean;
    trend: boolean;
    recommendations: boolean;
  };
}

/**
 * Build a complete, print-friendly HTML document from executive report data.
 */
export function buildExecutiveHTML(data: ExecutiveReportData): string {
  const total = data.totalCases || 1;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  const timestamp = new Date().toISOString();

  const sections: string[] = [];

  // Header (always included)
  sections.push(`
    <div class="header">
      <div class="logo-placeholder">CVERiskPilot</div>
      <h1>Executive Vulnerability Summary</h1>
      <div class="meta">
        <span><strong>Organization:</strong> ${esc(data.organizationName)}</span>
        <span><strong>Report Date:</strong> ${esc(data.reportDate)}</span>
        <span><strong>Period:</strong> ${esc(data.dateRange.from)} to ${esc(data.dateRange.to)}</span>
      </div>
    </div>
  `);

  // Key Metrics
  if (data.includeSections.keyMetrics) {
    sections.push(`
      <div class="section">
        <h2>Key Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.totalCases}</div>
            <div class="metric-label">Total Cases</div>
          </div>
          <div class="metric-card critical">
            <div class="metric-value">${data.criticalCount + data.highCount}</div>
            <div class="metric-label">Critical / High</div>
          </div>
          <div class="metric-card kev">
            <div class="metric-value">${data.kevCount}</div>
            <div class="metric-label">KEV Listed</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.avgEpssScore.toFixed(3)}</div>
            <div class="metric-label">Avg EPSS Score</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${esc(data.meanTimeToRemediate)}</div>
            <div class="metric-label">Mean Time to Remediate</div>
          </div>
        </div>
      </div>
    `);
  }

  // Severity Distribution
  if (data.includeSections.severityDistribution) {
    sections.push(`
      <div class="section">
        <h2>Severity Distribution</h2>
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr class="severity-critical"><td>Critical</td><td>${data.criticalCount}</td><td>${pct(data.criticalCount)}%</td></tr>
            <tr class="severity-high"><td>High</td><td>${data.highCount}</td><td>${pct(data.highCount)}%</td></tr>
            <tr class="severity-medium"><td>Medium</td><td>${data.mediumCount}</td><td>${pct(data.mediumCount)}%</td></tr>
            <tr class="severity-low"><td>Low</td><td>${data.lowCount}</td><td>${pct(data.lowCount)}%</td></tr>
            <tr class="severity-info"><td>Info</td><td>${data.infoCount}</td><td>${pct(data.infoCount)}%</td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td><strong>${data.totalCases}</strong></td><td><strong>100%</strong></td></tr>
          </tbody>
        </table>
      </div>
    `);
  }

  // Top 10 Critical Cases
  if (data.includeSections.topCritical && data.topCriticalCases.length > 0) {
    const caseRows = data.topCriticalCases
      .slice(0, 10)
      .map(
        (c) => `
        <tr>
          <td>${esc(c.cveIds.join(', ') || 'N/A')}</td>
          <td>${esc(c.title)}</td>
          <td>${c.cvssScore !== null ? c.cvssScore.toFixed(1) : 'N/A'}</td>
          <td>${c.epssScore !== null ? c.epssScore.toFixed(4) : 'N/A'}</td>
          <td>${c.kevListed ? 'Yes' : 'No'}</td>
          <td>${esc(c.status)}</td>
        </tr>`,
      )
      .join('');

    sections.push(`
      <div class="section page-break-before">
        <h2>Top 10 Critical Cases</h2>
        <table>
          <thead>
            <tr>
              <th>CVE</th>
              <th>Title</th>
              <th>CVSS</th>
              <th>EPSS</th>
              <th>KEV</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${caseRows}</tbody>
        </table>
      </div>
    `);
  }

  // KEV Exposure
  if (data.includeSections.kevExposure && data.kevExposure.length > 0) {
    const kevRows = data.kevExposure
      .map(
        (k) => `
        <tr>
          <td>${esc(k.cveIds.join(', ') || 'N/A')}</td>
          <td>${esc(k.title)}</td>
          <td>${esc(k.kevDueDate ?? 'N/A')}</td>
          <td>${esc(k.status)}</td>
        </tr>`,
      )
      .join('');

    sections.push(`
      <div class="section">
        <h2>KEV Exposure</h2>
        <p>The following vulnerabilities appear on CISA's Known Exploited Vulnerabilities catalog and require priority remediation.</p>
        <table>
          <thead>
            <tr>
              <th>CVE</th>
              <th>Title</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${kevRows}</tbody>
        </table>
      </div>
    `);
  }

  // EPSS High Risk
  if (data.includeSections.epssHighRisk && data.epssHighRisk.length > 0) {
    const epssRows = data.epssHighRisk
      .map(
        (e) => `
        <tr>
          <td>${esc(e.cveIds.join(', ') || 'N/A')}</td>
          <td>${esc(e.title)}</td>
          <td>${e.epssScore !== null ? e.epssScore.toFixed(4) : 'N/A'}</td>
          <td>${esc(e.severity)}</td>
          <td>${esc(e.status)}</td>
        </tr>`,
      )
      .join('');

    sections.push(`
      <div class="section">
        <h2>EPSS High-Risk (Score &gt; 0.5)</h2>
        <p>Cases with a high probability of exploitation in the next 30 days based on EPSS data.</p>
        <table>
          <thead>
            <tr>
              <th>CVE</th>
              <th>Title</th>
              <th>EPSS Score</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${epssRows}</tbody>
        </table>
      </div>
    `);
  }

  // Trend
  if (data.includeSections.trend) {
    sections.push(`
      <div class="section">
        <h2>Open vs Closed Trend</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.openCount}</div>
            <div class="metric-label">Open Cases</div>
          </div>
          <div class="metric-card closed">
            <div class="metric-value">${data.closedCount}</div>
            <div class="metric-label">Closed Cases</div>
          </div>
        </div>
        <p class="note">Detailed trend charts will be available in a future release.</p>
      </div>
    `);
  }

  // Recommendations
  if (data.includeSections.recommendations) {
    sections.push(`
      <div class="section page-break-before">
        <h2>Recommendations</h2>
        <ol>
          <li><strong>Prioritize KEV-listed vulnerabilities.</strong> Ensure all CISA KEV entries are remediated before their due dates. Currently ${data.kevCount} case(s) are KEV-listed.</li>
          <li><strong>Address Critical and High severity cases first.</strong> There are ${data.criticalCount + data.highCount} critical/high cases requiring immediate attention.</li>
          <li><strong>Monitor high EPSS scores.</strong> Cases with EPSS > 0.5 have a significant probability of exploitation and should be fast-tracked for remediation.</li>
          <li><strong>Reduce mean time to remediate.</strong> Current average is ${esc(data.meanTimeToRemediate)}. Target improvement through automated patching and streamlined approval workflows.</li>
          <li><strong>Establish regular scan cadence.</strong> Schedule recurring scans to detect new vulnerabilities early and verify remediation effectiveness.</li>
          <li><strong>Review accepted risks periodically.</strong> Cases marked as accepted risk should be re-evaluated quarterly to ensure the risk posture remains acceptable.</li>
        </ol>
      </div>
    `);
  }

  // Footer
  sections.push(`
    <div class="footer">
      <p>Generated by CVERiskPilot &mdash; ${esc(timestamp)}</p>
    </div>
  `);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Vulnerability Summary - ${esc(data.organizationName)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 20px 40px;
    }

    .header {
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .logo-placeholder {
      font-size: 24pt;
      font-weight: bold;
      color: #2563eb;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 9pt;
      color: #555;
    }

    .section {
      margin-bottom: 28px;
    }

    .section h2 {
      font-size: 14pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 12px;
    }

    .metrics-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .metric-card {
      flex: 1;
      min-width: 120px;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px 16px;
      text-align: center;
    }

    .metric-card.critical { border-color: #dc2626; }
    .metric-card.kev { border-color: #ea580c; }
    .metric-card.closed { border-color: #16a34a; }

    .metric-value {
      font-size: 20pt;
      font-weight: bold;
    }

    .metric-label {
      font-size: 9pt;
      color: #666;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 8px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background: #f5f5f5;
      font-weight: bold;
    }

    .severity-critical td:first-child { color: #dc2626; font-weight: bold; }
    .severity-high td:first-child { color: #ea580c; font-weight: bold; }
    .severity-medium td:first-child { color: #ca8a04; font-weight: bold; }
    .severity-low td:first-child { color: #2563eb; }
    .severity-info td:first-child { color: #6b7280; }
    .total-row { background: #f9fafb; }

    ol {
      margin-left: 24px;
    }

    ol li {
      margin-bottom: 8px;
    }

    .note {
      font-style: italic;
      color: #888;
      font-size: 9pt;
    }

    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      text-align: center;
      font-size: 8pt;
      color: #999;
    }

    .page-break-before {
      page-break-before: always;
    }

    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page-break-before {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>`;
}

/**
 * Open the executive report HTML in a new window and trigger the print dialog (Save as PDF).
 */
export function generateExecutivePDF(data: ExecutiveReportData): void {
  const html = buildExecutiveHTML(data);
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
    // Slight delay to let styles render before print
    setTimeout(() => newWindow.print(), 500);
  }
}

/**
 * Open the executive report HTML in a new tab for preview (no print dialog).
 */
export function previewExecutiveReport(data: ExecutiveReportData): void {
  const html = buildExecutiveHTML(data);
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

/** Escape HTML special characters */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
