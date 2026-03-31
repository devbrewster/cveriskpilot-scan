const personas = [
  {
    title: 'Startups & Indie Builders',
    hook: 'Enterprise prospect asked "are you SOC 2 compliant?" and the deal died?',
    description: 'Run one CLI command and get compliance coverage across 6 frameworks. No $10K/year Vanta contract. No compliance consultant. Just compliance in the shell.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    title: 'GRC & Compliance Teams',
    hook: '60% of GRC teams still use spreadsheets. You deserve better.',
    description: 'CVERiskPilot maps every vulnerability to NIST 800-53, CMMC, FedRAMP, and SOC 2 controls automatically. POAMs generate themselves. Replace the 40-hour quarterly mapping sprint with one command.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Federal & Defense Contractors',
    hook: 'CMMC Phase 2 deadline: November 10, 2026. The clock is ticking.',
    description: 'Built by a Veteran Owned business with federal compliance presets baked in. Run --preset federal or --preset defense and get audit-ready output mapped to the exact controls your assessor checks.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    title: 'DevSecOps Teams',
    hook: 'Your scanners find vulnerabilities. But who maps them to controls?',
    description: 'Drop crp-scan into your CI/CD pipeline. Every PR gets scanned for dependencies, secrets, and IaC misconfigs — with 135 compliance controls mapped across 6 frameworks automatically.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
];

export function WhoItsFor() {
  return (
    <section className="bg-white py-20 sm:py-24 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Built for your team
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Who is CVERiskPilot for?
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div key={p.title} className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
                {p.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">{p.hook}</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
