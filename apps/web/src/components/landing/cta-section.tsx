export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-indigo-700 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start securing your stack in 60 seconds
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Upload your first scan and see AI-powered remediation in action.
            No credit card required.
          </p>

          {/* Email Input + CTA */}
          <form
            className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="cta-email" className="sr-only">
              Email address
            </label>
            <input
              id="cta-email"
              type="email"
              placeholder="you@company.com"
              className="flex-1 rounded-lg border-0 bg-white/10 px-4 py-3 text-sm text-white placeholder-primary-200 ring-1 ring-white/20 backdrop-blur-sm transition-all focus:bg-white/15 focus:ring-2 focus:ring-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm transition-all hover:bg-primary-50"
            >
              Get Started Free
            </button>
          </form>

          <p className="mt-4 text-xs text-primary-200">
            Free plan includes 3 uploads/month and 50 AI calls. No credit card
            required.
          </p>
        </div>
      </div>
    </section>
  );
}
