import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/* ------------------------------------------------------------------ */
/*  Blog post registry — single source of truth for metadata          */
/* ------------------------------------------------------------------ */

interface BlogPost {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  ogImage: string;
}

const POSTS: Record<string, BlogPost> = {
  "compliance-in-the-shell": {
    title: "Compliance in the Shell: Why Your Vibe-Coded SaaS Will Die at the Enterprise Door",
    description:
      "Most vibe coders are one good distribution channel away from making money. Nobody's building the part where an enterprise prospect asks 'are you SOC 2 compliant?' and the deal dies.",
    date: "2026-03-30",
    author: "George — CVERiskPilot",
    tags: ["Vibe Coding", "Compliance", "SOC 2", "AppSec", "Open Source", "DevSecOps", "NIST 800-53", "CMMC"],
    ogImage: "/graphics/og-hero.svg",
  },
  "missing-link-cicd-compliance": {
    title: "The Missing Link Between CI/CD Scanning and Compliance",
    description:
      "Your pipeline catches vulnerabilities. But who maps them to compliance controls? The 40-hour/quarter gap that costs GRC teams real money.",
    date: "2026-03-29",
    author: "CVERiskPilot",
    tags: ["DevSecOps", "Compliance", "CI/CD", "NIST 800-53", "SOC 2", "CMMC", "Vulnerability Management"],
    ogImage: "/graphics/og-pipeline.svg",
  },
};

/* ------------------------------------------------------------------ */
/*  Static params — enable ISR / static generation                    */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

/* ------------------------------------------------------------------ */
/*  Dynamic metadata — full SEO per post                              */
/* ------------------------------------------------------------------ */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};

  const url = `https://cveriskpilot.com/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author, url: "https://cveriskpilot.com" }],
    keywords: post.tags,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: post.ogImage, width: 1200, height: 675, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.ogImage],
      creator: "@cveriskpilot",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Simple markdown → HTML (no external deps)                         */
/* ------------------------------------------------------------------ */

function markdownTableToHtml(md: string): string {
  // Match markdown tables: header row, separator row, data rows
  return md.replace(
    /^(\|[^\n]+\|)\n(\|[\s:|-]+\|)\n((?:\|[^\n]+\|\n?){1,200})/gm,
    (_match, headerRow: string, _sep: string, bodyBlock: string) => {
      const headers = headerRow.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim());
      const rows = bodyBlock.trim().split("\n").map((row: string) =>
        row.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim()),
      );
      const thCells = headers.map((h: string) => `<th class="px-4 py-2 text-left text-sm font-semibold text-slate-200 bg-slate-800/50">${h}</th>`).join("");
      const bodyRows = rows
        .map((cols: string[]) => {
          const tds = cols.map((c: string) => `<td class="px-4 py-2 text-sm text-slate-300 border-t border-slate-700/50">${c}</td>`).join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `<div class="overflow-x-auto my-6"><table class="w-full border-collapse rounded-lg border border-slate-700"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    },
  );
}

function markdownToHtml(md: string): string {
  // Pre-process tables before other transformations
  const withTables = markdownTableToHtml(md);

  return withTables
    // Remove frontmatter if present
    .replace(/^---[\s\S]*?---\n*/m, "")
    // Code blocks (```lang ... ```)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre class="overflow-x-auto rounded-lg bg-slate-900 border border-slate-700 p-4 text-sm"><code class="language-${lang || "text"}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-blue-300">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="mt-8 mb-4 text-xl font-semibold text-white">$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="mt-12 mb-4 text-2xl font-bold text-white">$1</h2>')
    // H1 (title — skip, we render it separately)
    .replace(/^# (.+)$/gm, "")
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-slate-400">$1</blockquote>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300">$1</li>')
    // Ordered list items
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300">$2</li>')
    // Links [text](url) — validate protocol to prevent javascript: XSS
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
      const safeUrl = /^https?:\/\//.test(url) ? url : '#';
      return `<a href="${safeUrl}" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-8 border-slate-700" />')
    // Paragraphs (lines not already tagged)
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="mb-4 leading-relaxed text-slate-300">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, "");
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  // Read markdown from docs/blog/
  const mdPath = resolve(process.cwd(), `../../docs/blog/${slug}.md`);
  if (!existsSync(mdPath)) notFound();

  const markdown = readFileSync(mdPath, "utf-8");
  const html = markdownToHtml(markdown);

  // JSON-LD Article schema
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "CVERiskPilot LLC",
      url: "https://cveriskpilot.com",
    },
    publisher: {
      "@type": "Organization",
      name: "CVERiskPilot LLC",
      url: "https://cveriskpilot.com",
      logo: {
        "@type": "ImageObject",
        url: "https://cveriskpilot.com/icon-192.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://cveriskpilot.com/blog/${slug}`,
    },
    keywords: post.tags.join(", "),
    image: `https://cveriskpilot.com${post.ogImage}`,
  };

  return (
    <>
      {/* Safe: static JSON-LD from hardcoded metadata, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="prose-invert max-w-none">
        {/* Header */}
        <div className="mb-10 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>·</span>
            <span>By {post.author}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-slate-400">{post.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Body — Safe: HTML generated from local trusted markdown files (docs/blog/*.md),
           not from user input or external CMS. The markdownToHtml() function above
           escapes code block content. No external/untrusted content flows here. */}
        <div
          className="space-y-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <h3 className="text-xl font-bold text-white">
            Ready to close the compliance gap?
          </h3>
          <p className="mt-2 text-slate-400">
            Run your first compliance scan in 90 seconds. No account needed.
          </p>
          <pre className="mx-auto mt-4 max-w-md rounded-lg bg-slate-950 border border-slate-700 p-3 text-sm text-green-400">
            npx @cveriskpilot/scan@latest --preset startup
          </pre>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="/signup"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              Start Free
            </a>
            <a
              href="/docs/pipeline"
              className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 hover:border-blue-500 transition"
            >
              Setup Guide
            </a>
          </div>
        </div>
      </article>
    </>
  );
}
