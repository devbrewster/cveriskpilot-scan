import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For individual security researchers and small teams getting started.",
    features: [
      "1 user",
      "3 uploads per month",
      "50 AI remediation calls",
      "50 assets",
      "Community support",
      "Standard reports",
    ],
    cta: "Get Started",
    ctaHref: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    annualNote: "$39/mo billed annually",
    description: "For security teams that need full coverage and priority support.",
    features: [
      "10 users",
      "Unlimited uploads",
      "500 AI remediation calls",
      "500 assets",
      "Priority support",
      "Executive PDF reports",
      "Scan-over-scan comparison",
      "SLA policy engine",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-28 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-primary-500 bg-white shadow-xl ring-1 ring-primary-500 dark:border-primary-400 dark:bg-gray-900 dark:ring-primary-400"
                  : "border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  {plan.price}
                </span>
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                  {plan.period}
                </span>
              </div>
              {plan.annualNote && (
                <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  {plan.annualNote}
                </p>
              )}

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-primary-600 text-white shadow-sm hover:bg-primary-700"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise mention */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need more?{" "}
            <a
              href="mailto:sales@cveriskpilot.com"
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Contact us
            </a>{" "}
            for Enterprise and MSSP plans with unlimited users, custom
            integrations, and dedicated support.
          </p>
        </div>
      </div>
    </section>
  );
}
