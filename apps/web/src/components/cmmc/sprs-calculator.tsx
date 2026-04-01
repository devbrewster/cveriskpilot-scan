"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  NIST 800-171 Control Families for SPRS Estimation                  */
/*                                                                     */
/*  Each family has a total point value based on the sum of weighted   */
/*  practices (1, 3, or 5 points each). These are approximate totals  */
/*  used for a rough estimator — not a full 110-practice assessment.   */
/* ------------------------------------------------------------------ */

interface ControlFamily {
  id: string;
  name: string;
  practiceCount: number;
  /** Total point deduction if the entire family is unimplemented */
  maxDeduction: number;
  description: string;
}

const CONTROL_FAMILIES: ControlFamily[] = [
  {
    id: "AC",
    name: "Access Control",
    practiceCount: 22,
    maxDeduction: 48,
    description:
      "Account management, access enforcement, least privilege, remote access, session controls",
  },
  {
    id: "AT",
    name: "Awareness & Training",
    practiceCount: 3,
    maxDeduction: 5,
    description:
      "Security awareness training, role-based training, insider threat awareness",
  },
  {
    id: "AU",
    name: "Audit & Accountability",
    practiceCount: 9,
    maxDeduction: 19,
    description:
      "Event logging, audit record content, review and reporting, protection of audit info",
  },
  {
    id: "CM",
    name: "Configuration Management",
    practiceCount: 9,
    maxDeduction: 17,
    description:
      "Baseline configuration, change control, least functionality, software restrictions",
  },
  {
    id: "IA",
    name: "Identification & Authentication",
    practiceCount: 11,
    maxDeduction: 25,
    description:
      "User identification, multi-factor authentication, authenticator management, replay resistance",
  },
  {
    id: "IR",
    name: "Incident Response",
    practiceCount: 3,
    maxDeduction: 7,
    description:
      "Incident handling, reporting, testing incident response capabilities",
  },
  {
    id: "MA",
    name: "Maintenance",
    practiceCount: 6,
    maxDeduction: 12,
    description:
      "Controlled maintenance, maintenance tools, nonlocal maintenance, maintenance personnel",
  },
  {
    id: "MP",
    name: "Media Protection",
    practiceCount: 9,
    maxDeduction: 15,
    description:
      "Media access, marking, storage, transport, sanitization, CUI on portable media",
  },
  {
    id: "PS",
    name: "Personnel Security",
    practiceCount: 2,
    maxDeduction: 4,
    description: "Personnel screening, termination and transfer procedures",
  },
  {
    id: "PE",
    name: "Physical Protection",
    practiceCount: 6,
    maxDeduction: 10,
    description:
      "Physical access authorizations, monitoring, visitor management, alternative work sites",
  },
  {
    id: "RA",
    name: "Risk Assessment",
    practiceCount: 2,
    maxDeduction: 6,
    description: "Risk assessments, vulnerability scanning and remediation",
  },
  {
    id: "CA",
    name: "Security Assessment",
    practiceCount: 4,
    maxDeduction: 8,
    description:
      "System security plans, assessments, continuous monitoring, system connections",
  },
  {
    id: "SC",
    name: "System & Comms Protection",
    practiceCount: 16,
    maxDeduction: 40,
    description:
      "Boundary protection, encryption in transit and at rest, session authenticity, CUI separation",
  },
  {
    id: "SI",
    name: "System & Info Integrity",
    practiceCount: 7,
    maxDeduction: 17,
    description:
      "Flaw remediation, malicious code protection, monitoring, security alerts, integrity verification",
  },
];

const TOTAL_MAX_DEDUCTION = CONTROL_FAMILIES.reduce(
  (sum, f) => sum + f.maxDeduction,
  0,
); // Should be ~203 + some, but we cap at 203 per SPRS spec

const MAX_SCORE = 110;
const MIN_SCORE = -203;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SprsCalculator() {
  // Each family can be: "implemented" | "partial" | "not_implemented"
  const [familyStatus, setFamilyStatus] = useState<
    Record<string, "implemented" | "partial" | "not_implemented">
  >(() => {
    const initial: Record<string, "implemented" | "partial" | "not_implemented"> = {};
    for (const f of CONTROL_FAMILIES) {
      initial[f.id] = "not_implemented";
    }
    return initial;
  });

  const score = useMemo(() => {
    let deduction = 0;
    for (const family of CONTROL_FAMILIES) {
      const status = familyStatus[family.id];
      if (status === "not_implemented") {
        deduction += family.maxDeduction;
      } else if (status === "partial") {
        deduction += Math.round(family.maxDeduction * 0.5);
      }
      // "implemented" = 0 deduction
    }
    // Clamp to valid SPRS range
    const raw = MAX_SCORE - deduction;
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, raw));
  }, [familyStatus]);

  // Score position on the gauge (0% = -203, 100% = 110)
  const scorePercent =
    ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100;

  // Color based on score
  const scoreColor =
    score > 70
      ? "text-green-400"
      : score >= 0
        ? "text-amber-400"
        : "text-red-400";

  const barColor =
    score > 70
      ? "bg-green-500"
      : score >= 0
        ? "bg-amber-500"
        : "bg-red-500";

  const bgGlow =
    score > 70
      ? "shadow-green-500/10"
      : score >= 0
        ? "shadow-amber-500/10"
        : "shadow-red-500/10";

  function cycleStatus(familyId: string) {
    setFamilyStatus((prev) => {
      const current = prev[familyId];
      const next =
        current === "not_implemented"
          ? "partial"
          : current === "partial"
            ? "implemented"
            : "not_implemented";
      return { ...prev, [familyId]: next };
    });
  }

  function setAll(status: "implemented" | "partial" | "not_implemented") {
    const updated: Record<string, "implemented" | "partial" | "not_implemented"> = {};
    for (const f of CONTROL_FAMILIES) {
      updated[f.id] = status;
    }
    setFamilyStatus(updated);
  }

  const implementedCount = CONTROL_FAMILIES.filter(
    (f) => familyStatus[f.id] === "implemented",
  ).length;
  const partialCount = CONTROL_FAMILIES.filter(
    (f) => familyStatus[f.id] === "partial",
  ).length;

  return (
    <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            Self-Assessment
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Estimate Your SPRS Score
          </h2>
          <p className="mt-4 text-gray-400">
            Select the implementation status for each of the 14 NIST 800-171
            control families. Click a family to cycle through: Not Implemented,
            Partially Implemented, Fully Implemented.
          </p>
        </div>

        {/* Score Display */}
        <div
          className={`mx-auto mt-12 max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl ${bgGlow}`}
        >
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Estimated SPRS Score
            </p>
            <p className={`mt-2 text-6xl font-extrabold tabular-nums ${scoreColor}`}>
              {score}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Range: -203 (worst) to 110 (perfect)
            </p>
          </div>

          {/* Gauge Bar */}
          <div className="mt-6">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${scorePercent}%` }}
              />
              {/* Markers */}
              <div
                className="absolute inset-y-0 w-px bg-gray-600"
                style={{
                  left: `${((0 - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100}%`,
                }}
                title="Score: 0"
              />
              <div
                className="absolute inset-y-0 w-px bg-gray-600"
                style={{
                  left: `${((70 - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100}%`,
                }}
                title="Score: 70"
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>-203</span>
              <span>0</span>
              <span>70</span>
              <span>110</span>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <span className="text-green-400">
              {implementedCount} implemented
            </span>
            <span className="text-amber-400">{partialCount} partial</span>
            <span className="text-red-400">
              {14 - implementedCount - partialCount} not implemented
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mx-auto mt-6 flex max-w-2xl justify-center gap-3">
          <button
            onClick={() => setAll("implemented")}
            className="rounded-lg border border-green-800 bg-green-900/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-900/40"
          >
            Mark All Implemented
          </button>
          <button
            onClick={() => setAll("partial")}
            className="rounded-lg border border-amber-800 bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-900/40"
          >
            Mark All Partial
          </button>
          <button
            onClick={() => setAll("not_implemented")}
            className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800"
          >
            Reset
          </button>
        </div>

        {/* Control Family Grid */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROL_FAMILIES.map((family) => {
            const status = familyStatus[family.id];
            const borderColor =
              status === "implemented"
                ? "border-green-700 bg-green-950/30"
                : status === "partial"
                  ? "border-amber-700 bg-amber-950/30"
                  : "border-gray-800 bg-gray-900";
            const statusLabel =
              status === "implemented"
                ? "Implemented"
                : status === "partial"
                  ? "Partial"
                  : "Not Implemented";
            const statusBadgeColor =
              status === "implemented"
                ? "bg-green-900/50 text-green-400"
                : status === "partial"
                  ? "bg-amber-900/50 text-amber-400"
                  : "bg-gray-800 text-gray-500";

            return (
              <button
                key={family.id}
                onClick={() => cycleStatus(family.id)}
                className={`group cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-semibold text-gray-500">
                      {family.id}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {family.name}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  {family.description}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>{family.practiceCount} practices</span>
                  <span>
                    {family.maxDeduction} pts max deduction
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-primary-800/50 bg-primary-950/30 p-8 text-center">
          <h3 className="text-xl font-bold text-white">
            Get a precise SPRS score with a full scan
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            This estimator uses control family-level granularity. For a
            practice-by-practice assessment mapping your actual infrastructure to
            all 110 NIST 800-171 practices, run the CVERiskPilot scanner.
          </p>
          <pre className="mx-auto mt-4 max-w-md overflow-x-auto rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-left text-sm text-green-400">
            <code>npx @cveriskpilot/scan --preset defense</code>
          </pre>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup?ref=sprs-calculator"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500"
            >
              Start Full Assessment
            </Link>
            <Link
              href="/blog/cmmc-compliance-30-days"
              className="inline-flex items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-6 py-3 text-sm font-semibold text-primary-300 transition-all hover:border-primary-400/50 hover:bg-primary-500/20"
            >
              Read the 30-Day Playbook
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
