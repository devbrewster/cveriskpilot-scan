import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on vulnerability management, DevSecOps, compliance automation, and building security into CI/CD pipelines. Written by the CVERiskPilot team.",
  alternates: {
    canonical: "https://cveriskpilot.com/blog",
  },
  openGraph: {
    title: "Blog | CVERiskPilot",
    description:
      "Insights on vulnerability management, DevSecOps, and compliance automation.",
    images: ["/graphics/og-hero.svg"],
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Blog post index — add new posts here                              */
/* ------------------------------------------------------------------ */

const posts = [
  {
    slug: "missing-link-cicd-compliance",
    title: "The Missing Link Between CI/CD Scanning and Compliance",
    excerpt:
      "Your pipeline catches vulnerabilities. But who maps them to compliance controls? The 40-hour/quarter gap nobody talks about.",
    date: "2026-03-29",
    readTime: "6 min read",
    tags: ["DevSecOps", "Compliance", "CI/CD", "NIST", "SOC 2"],
  },
];

export default function BlogIndex() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Blog</h1>
        <p className="text-lg text-slate-400">
          Insights on vulnerability management, DevSecOps, and compliance
          automation.
        </p>
      </div>

      <div className="grid gap-8">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-blue-500/50 hover:bg-slate-900"
          >
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
              {post.title}
            </h2>
            <p className="mt-2 text-slate-400 leading-relaxed">
              {post.excerpt}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
