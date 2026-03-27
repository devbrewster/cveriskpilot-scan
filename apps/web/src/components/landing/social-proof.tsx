const stats = [
  { value: "8,000+", label: "CVEs processed per scan in < 90s" },
  { value: "5", label: "Scanner formats supported" },
  { value: "AI", label: "Powered remediation with code examples" },
];

export function SocialProof() {
  return (
    <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Trusted by security teams at forward-thinking companies
        </p>

        {/* Placeholder company logos */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {["Acme Corp", "TechSecure", "CloudGuard", "DevShield", "NetWatch"].map(
            (name) => (
              <span
                key={name}
                className="text-lg font-bold tracking-wide text-gray-300 dark:text-gray-700"
              >
                {name}
              </span>
            )
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-6 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
