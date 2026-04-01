const stats = [
  { value: "200+", label: "Compliance controls mapped", sublabel: "across 10 frameworks, automatically" },
  { value: "60%", label: "of GRC teams still use spreadsheets", sublabel: "we replace the spreadsheet" },
  { value: "90s", label: "from scan to compliance verdict", sublabel: "not 40 hours per quarter" },
];

export function SocialProof() {
  return (
    <section className="relative border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative text-center">
              {/* Divider between stats on desktop */}
              {i > 0 && (
                <div className="absolute left-0 top-1/2 hidden h-12 w-px -translate-y-1/2 bg-gray-200 sm:block dark:bg-gray-800" />
              )}
              <p className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {stat.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                {stat.sublabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
