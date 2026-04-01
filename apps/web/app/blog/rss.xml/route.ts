/**
 * Blog RSS 2.0 Feed
 *
 * GET /blog/rss.xml — generates a standards-compliant RSS feed from the blog
 * post registry. Cacheable for 1 hour.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveriskpilot.com';

// Keep in sync with apps/web/app/(docs)/blog/page.tsx
const posts = [
  {
    slug: 'cmmc-compliance-30-days',
    title: 'CMMC Level 2 in 30 Days: A Defense Contractor\'s Compliance Playbook',
    excerpt: 'The CMMC Level 2 deadline is November 10, 2026. Here is a week-by-week playbook to get from "we handle CUI somewhere" to "assessment-ready" in 30 days.',
    date: '2026-03-31',
    tags: ['CMMC', 'NIST 800-171', 'Defense', 'Compliance', 'POAM'],
  },
  {
    slug: 'npm-supply-chain-compliance',
    title: "Two npm Supply Chain Attacks in One Day — Here's What Your Compliance Framework Says About It",
    excerpt: 'Axios v1.14.1 was hijacked and Claude Code leaked 512K lines of source. If you\'re tracking compliance, these trigger specific controls that require documented evidence.',
    date: '2026-03-31',
    tags: ['Supply Chain', 'npm', 'Compliance', 'NIST 800-53', 'SOC 2'],
  },
  {
    slug: 'we-scanned-ourselves',
    title: 'We Scanned Ourselves: What 87 Findings Taught Us About Our Own Compliance Posture',
    excerpt: 'We pointed our own scanner at our own codebase. 87 findings, 48 true positives, 8 compliance controls affected. Real data from a real scan.',
    date: '2026-03-31',
    tags: ['Dogfooding', 'Security Scanning', 'SOC 2', 'DevSecOps'],
  },
  {
    slug: 'compliance-in-the-shell',
    title: "Compliance in the Shell: Why Your Vibe-Coded SaaS Will Die at the Enterprise Door",
    excerpt: "Most vibe coders are one good distribution channel away from making money. But nobody's building the part that comes after.",
    date: '2026-03-30',
    tags: ['Vibe Coding', 'Compliance', 'SOC 2', 'AppSec'],
  },
  {
    slug: 'missing-link-cicd-compliance',
    title: 'The Missing Link Between CI/CD Scanning and Compliance',
    excerpt: 'Your pipeline catches vulnerabilities. But who maps them to compliance controls? The 40-hour/quarter gap nobody talks about.',
    date: '2026-03-29',
    tags: ['DevSecOps', 'Compliance', 'CI/CD', 'NIST', 'SOC 2'],
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const items = posts
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      ${post.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CVERiskPilot Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Insights on vulnerability management, DevSecOps, compliance automation, and building security into CI/CD pipelines.</description>
    <language>en-us</language>
    <managingEditor>support@cveriskpilot.com (CVERiskPilot)</managingEditor>
    <webMaster>support@cveriskpilot.com (CVERiskPilot)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/icon-192.png</url>
      <title>CVERiskPilot Blog</title>
      <link>${BASE_URL}/blog</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
