"use client";

import { useState } from "react";

const COMPANY_TYPES = [
  "Managed Security Service Provider (MSSP)",
  "Security Consultant / vCISO",
  "GRC Advisory Firm",
  "Penetration Testing Company",
  "IT Audit Firm",
  "Other",
];

const CLIENT_RANGES = [
  "1-5",
  "6-20",
  "21-50",
  "51-100",
  "100+",
];

export function PartnerApplicationForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = {
      companyName: (form.elements.namedItem("companyName") as HTMLInputElement).value.trim(),
      contactName: (form.elements.namedItem("contactName") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value.trim() || undefined,
      companyType: (form.elements.namedItem("companyType") as HTMLSelectElement).value,
      clientCount: (form.elements.namedItem("clientCount") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim(),
    };

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary-500/30 bg-primary-500/10 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/20">
          <svg className="h-7 w-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">Application received</h3>
        <p className="mt-2 text-gray-400">
          Thank you for your interest in the CVERiskPilot partner program. Our
          partnerships team will review your application and reach out within 48
          hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-300">
          Company name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          required
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Acme Security LLC"
        />
      </div>

      {/* Contact Name */}
      <div>
        <label htmlFor="contactName" className="block text-sm font-medium text-gray-300">
          Contact name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="contactName"
          name="contactName"
          required
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="Jane Smith"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="jane@acmesecurity.com"
        />
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
          Phone <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {/* Company Type */}
      <div>
        <label htmlFor="companyType" className="block text-sm font-medium text-gray-300">
          Company type <span className="text-red-400">*</span>
        </label>
        <select
          id="companyType"
          name="companyType"
          required
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Select your company type</option>
          {COMPANY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Number of Clients */}
      <div>
        <label htmlFor="clientCount" className="block text-sm font-medium text-gray-300">
          Number of clients <span className="text-red-400">*</span>
        </label>
        <select
          id="clientCount"
          name="clientCount"
          required
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Select range</option>
          {CLIENT_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-300">
          Tell us about your practice <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1.5 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          placeholder="What services do you offer? What compliance frameworks do your clients need? How do you currently handle vulnerability management?"
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : "Submit Application"}
      </button>

      <p className="text-center text-xs text-gray-500">
        By submitting, you agree to our{" "}
        <a href="/privacy" className="text-primary-400 underline hover:text-primary-300">
          Privacy Policy
        </a>
        . We will never share your information with third parties.
      </p>
    </form>
  );
}
