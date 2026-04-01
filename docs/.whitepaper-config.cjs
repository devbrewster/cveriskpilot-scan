module.exports = {
  stylesheet: [],
  css: `
    @page {
      size: letter;
      margin: 1in 0.9in 1in 0.9in;
      @top-right {
        content: "CRP-WP-2026-002 | From Vulnerability Noise to Audit-Ready Decisions | Public";
        font-size: 7.5pt;
        color: #94a3b8;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      @bottom-center {
        content: "Copyright 2026 CVERiskPilot LLC. All rights reserved.";
        font-size: 7pt;
        color: #94a3b8;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 7.5pt;
        color: #64748b;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
    }

    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1e293b;
      max-width: none;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      page-break-after: avoid;
    }

    h2 {
      font-size: 16pt;
      margin-top: 28pt;
      margin-bottom: 10pt;
      padding-bottom: 4pt;
      border-bottom: 2px solid #2563eb;
    }

    h3 {
      font-size: 12.5pt;
      margin-top: 20pt;
      margin-bottom: 8pt;
      color: #1e3a5f;
    }

    h4 {
      font-size: 11pt;
      margin-top: 14pt;
      margin-bottom: 6pt;
    }

    p {
      margin-bottom: 8pt;
      text-align: justify;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th {
      background-color: #1e3a5f;
      color: white;
      font-family: "Segoe UI", system-ui, sans-serif;
      font-weight: 600;
      text-align: left;
      padding: 6pt 8pt;
      font-size: 9pt;
    }

    td {
      padding: 5pt 8pt;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    tr:last-child td {
      border-bottom: 2px solid #1e3a5f;
    }

    code {
      font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 1pt 4pt;
      border-radius: 3pt;
      color: #334155;
    }

    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 14pt;
      border-radius: 6pt;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
      margin: 10pt 0;
    }

    pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: inherit;
    }

    blockquote {
      border-left: 3px solid #2563eb;
      margin: 10pt 0;
      padding: 8pt 14pt;
      background: #eff6ff;
      font-style: italic;
      color: #334155;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    em {
      color: #64748b;
      font-size: 9.5pt;
    }

    strong {
      color: #0f172a;
    }

    hr {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: 16pt 0;
    }

    ul, ol {
      margin-bottom: 8pt;
      padding-left: 18pt;
    }

    li {
      margin-bottom: 3pt;
    }
  `,
  pdf_options: {
    format: 'Letter',
    margin: {
      top: '1in',
      bottom: '1in',
      left: '0.9in',
      right: '0.9in'
    },
    printBackground: true,
    displayHeaderFooter: false
  }
};
