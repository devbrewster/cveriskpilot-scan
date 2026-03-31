// ---------------------------------------------------------------------------
// Landing Page — AI Trust & Data Security Section
// ---------------------------------------------------------------------------
// Addresses the #1 enterprise objection: "What happens to my data when you
// send it to an AI?" Backed by verifiable architecture, not marketing copy.
// ---------------------------------------------------------------------------

const trustPillars = [
  {
    title: "Your AI Learns. Only From You.",
    description:
      "Every human correction — severity overrides, false positive flags, action changes — feeds back into your organization's triage model. The AI adapts to your risk tolerance, your asset priorities, your team's judgment. Not someone else's.",
    detail: "Feedback loop requires 10+ human reviews before activating, preventing noise from skewing early decisions.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    title: "PII Stripped Before Every AI Call",
    description:
      "IP addresses, hostnames, URLs, usernames, AWS account IDs, and API keys are automatically redacted before any data reaches the AI. Your infrastructure topology never leaves your control.",
    detail: "Regex-based redaction engine with 7 pattern categories. Redaction map retained locally for re-identification in results.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Tenant Isolation by Design",
    description:
      "Every AI query, every feedback record, every correction pattern is scoped to your organization ID. There is no shared learning pool. No cross-tenant data leakage. Your corrections improve your AI — nobody else's.",
    detail: "Organization-scoped database indexes enforce isolation at the query layer, not just the application layer.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Zero Training Data Export",
    description:
      "Your vulnerability data is never used to train AI models. Anthropic's API terms prohibit using API inputs for model training. We add a second layer: PII redaction ensures even the API call itself contains no identifiable infrastructure data.",
    detail: "Anthropic API ToS: API data is not used for training. Optional: deploy with local LLM (Ollama) for full air-gap.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
];

const deploymentModels = [
  {
    name: "Cloud API",
    description: "Anthropic Claude via encrypted API. PII redacted before every call.",
    badge: "Default",
  },
  {
    name: "GCP Vertex AI",
    description: "Claude runs inside your Google Cloud tenant. Data never leaves your VPC.",
    badge: "Enterprise",
  },
  {
    name: "Local LLM",
    description: "Ollama, LM Studio, or vLLM. Fully air-gapped. Zero external calls.",
    badge: "Air-Gap",
  },
];

export function AiTrust() {
  return (
    <section
      id="ai-trust"
      className="bg-gray-950 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            AI Trust & Data Security
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your AI gets smarter. Your data stays yours.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-400">
            Enterprise security teams need to know exactly what happens to their data.
            Here is the architecture — not a promise, but a verifiable implementation.
          </p>
        </div>

        {/* Trust Pillars */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {trustPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group relative rounded-2xl border border-gray-800 bg-gray-900 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-800 hover:shadow-lg hover:shadow-emerald-900/20"
            >
              <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400 transition-colors group-hover:bg-emerald-500/15">
                {pillar.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {pillar.description}
              </p>
              <p className="mt-3 rounded-lg bg-gray-800/50 px-3 py-2 text-xs leading-relaxed text-gray-500">
                {pillar.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Deployment Models */}
        <div className="mt-16">
          <h3 className="text-center text-lg font-semibold text-white">
            Choose your trust level
          </h3>
          <p className="mt-2 text-center text-sm text-gray-400">
            Three deployment models — same AI triage, your choice of data boundary.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {deploymentModels.map((model) => (
              <div
                key={model.name}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-center transition-colors hover:border-emerald-800"
              >
                <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  {model.badge}
                </span>
                <h4 className="mt-3 font-semibold text-white">{model.name}</h4>
                <p className="mt-2 text-sm text-gray-400">{model.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Alignment */}
        <div className="mt-12 rounded-2xl border border-gray-800 bg-gray-900/30 p-6 text-center">
          <p className="text-sm font-medium text-gray-300">
            AI data handling mapped to{" "}
            <span className="text-emerald-400">SOC 2 CC6.1</span>{" "}
            (logical access controls),{" "}
            <span className="text-emerald-400">FedRAMP AC-4</span>{" "}
            (information flow enforcement), and{" "}
            <span className="text-emerald-400">NIST 800-53 SI-19</span>{" "}
            (de-identification).
          </p>
        </div>
      </div>
    </section>
  );
}
