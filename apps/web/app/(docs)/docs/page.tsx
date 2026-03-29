import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | CVERiskPilot",
  description:
    "Everything you need to integrate CVERiskPilot into your workflow. Pipeline scanner setup, CLI reference, GitHub Actions, compliance frameworks, API docs, and POAM generation.",
  openGraph: {
    title: "Documentation | CVERiskPilot",
    description:
      "Everything you need to integrate CVERiskPilot into your workflow.",
    siteName: "CVERiskPilot",
    type: "website",
  },
};

const sections = [
  {
    title: "Pipeline Compliance Scanner",
    href: "/docs/pipeline",
    description:
      "Set up compliance scanning in your CI/CD pipeline in under 5 minutes.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    ),
    comingSoon: false,
  },
  {
    title: "CLI Reference",
    href: "/docs/cli",
    description: "Local scanning with the crp-scan CLI tool.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
    comingSoon: true,
  },
  {
    title: "GitHub Action",
    href: "/docs/github-action",
    description: "One-line GitHub Actions integration.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    comingSoon: true,
  },
  {
    title: "Frameworks",
    href: "/docs/frameworks",
    description:
      "Supported compliance frameworks and control mappings.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
        />
      </svg>
    ),
    comingSoon: true,
  },
  {
    title: "API Reference",
    href: "/docs/api",
    description: "REST API documentation.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        />
      </svg>
    ),
    comingSoon: true,
  },
  {
    title: "POAM Generation",
    href: "/docs/poam",
    description: "Automatic Plan of Action & Milestones.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
        />
      </svg>
    ),
    comingSoon: true,
  },
];

export default function DocsPage() {
  return (
    <div>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Documentation
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-400">
          Everything you need to integrate CVERiskPilot into your workflow.
        </p>
      </div>

      {/* Card Grid */}
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.comingSoon ? "#" : section.href}
            className={`group relative rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-200 ${
              section.comingSoon
                ? "cursor-default opacity-70"
                : "hover:-translate-y-0.5 hover:border-primary-800 hover:bg-gray-900/80"
            }`}
            aria-disabled={section.comingSoon}
            tabIndex={section.comingSoon ? -1 : undefined}
          >
            {section.comingSoon && (
              <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Coming Soon
              </span>
            )}
            <div className="mb-4 inline-flex rounded-xl bg-primary-500/10 p-3 text-primary-400 transition-colors group-hover:bg-primary-500/15">
              {section.icon}
            </div>
            <h3 className="text-base font-semibold text-white">
              {section.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              {section.description}
            </p>
            {!section.comingSoon && (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-400 transition-colors group-hover:text-primary-300">
                Get started
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
