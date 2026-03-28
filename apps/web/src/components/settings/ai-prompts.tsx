'use client';

import { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgPromptConfig {
  customSystemPrompt?: string;
  techStack?: string;
  complianceFrameworks?: string[];
  remediationStyle?: 'concise' | 'detailed' | 'step-by-step';
  excludePatterns?: string[];
}

const COMPLIANCE_FRAMEWORKS = [
  'SOC2',
  'SSDF',
  'ASVS',
  'NIST 800-171',
  'FedRAMP',
  'HIPAA',
  'PCI-DSS',
] as const;

const REMEDIATION_STYLES = [
  { value: 'concise', label: 'Concise', description: 'Brief, to-the-point guidance' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough explanations with context and rationale' },
  { value: 'step-by-step', label: 'Step-by-Step', description: 'Numbered instructions, one action per step' },
] as const;

const BASE_SYSTEM_PROMPT = `You are a senior application security engineer specializing in vulnerability remediation.
Provide actionable, specific remediation guidance.`;

const DEFAULT_CONFIG: OrgPromptConfig = {};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiPrompts({ organizationId }: { organizationId: string }) {
  const [config, setConfig] = useState<OrgPromptConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [excludeInput, setExcludeInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/settings/ai-prompts?organizationId=${organizationId}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.config && Object.keys(data.config).length > 0) {
            setConfig(data.config);
          }
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  // Build preview of merged prompt
  const mergedPrompt = useMemo(() => {
    const sections: string[] = [BASE_SYSTEM_PROMPT];

    if (config.techStack) {
      sections.push(
        `\nThe organization's technology stack: ${config.techStack}. Tailor all code examples and configuration guidance to this stack.`,
      );
    }
    if (config.complianceFrameworks && config.complianceFrameworks.length > 0) {
      sections.push(
        `\nThe organization must comply with: ${config.complianceFrameworks.join(', ')}. Include relevant compliance references and control mappings in your guidance.`,
      );
    }
    if (config.remediationStyle) {
      const styleMap: Record<string, string> = {
        concise: 'Keep remediation guidance brief and to the point. Omit verbose explanations.',
        detailed:
          'Provide thorough remediation guidance with full explanations, context, and rationale for each step.',
        'step-by-step':
          'Format remediation as numbered step-by-step instructions. Each step should be a single, clear action.',
      };
      sections.push(`\nRemediation style: ${styleMap[config.remediationStyle]}`);
    }
    if (config.excludePatterns && config.excludePatterns.length > 0) {
      sections.push(
        `\nDo NOT include recommendations involving: ${config.excludePatterns.join(', ')}. These technologies or approaches are not applicable to this organization.`,
      );
    }
    if (config.customSystemPrompt) {
      sections.push(
        `\nAdditional instructions from the organization:\n${config.customSystemPrompt}`,
      );
    }

    return sections.join('');
  }, [config]);

  // Handlers
  const handleFrameworkToggle = (framework: string) => {
    setConfig((prev) => {
      const current = prev.complianceFrameworks ?? [];
      const next = current.includes(framework)
        ? current.filter((f) => f !== framework)
        : [...current, framework];
      return { ...prev, complianceFrameworks: next };
    });
  };

  const handleAddExcludePattern = () => {
    const trimmed = excludeInput.trim();
    if (!trimmed) return;
    if ((config.excludePatterns ?? []).includes(trimmed)) {
      setExcludeInput('');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      excludePatterns: [...(prev.excludePatterns ?? []), trimmed],
    }));
    setExcludeInput('');
  };

  const handleRemoveExcludePattern = (pattern: string) => {
    setConfig((prev) => ({
      ...prev,
      excludePatterns: (prev.excludePatterns ?? []).filter((p) => p !== pattern),
    }));
  };

  const handleExcludeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddExcludePattern();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/settings/ai-prompts?organizationId=${organizationId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        },
      );
      if (res.ok) {
        setMessage({ type: 'success', text: 'AI prompt configuration updated successfully.' });
      } else {
        const data = await res.json();
        const errorText =
          data.errors
            ? Object.values(data.errors).flat().join(', ')
            : 'Failed to update AI prompt configuration.';
        setMessage({ type: 'error', text: errorText });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">AI Prompt Customization</h3>
        <p className="mt-1 text-sm text-gray-500">
          Customize how AI-generated remediation guidance is tailored to your organization.
          These settings are merged into the system prompt for all AI requests.
        </p>
      </div>

      {/* Tech Stack */}
      <div className="space-y-1">
        <label htmlFor="techStack" className="block text-sm font-medium text-gray-900">
          Technology Stack
        </label>
        <p className="text-xs text-gray-500">
          Describe your tech stack so AI guidance includes relevant code examples and tooling.
        </p>
        <input
          id="techStack"
          type="text"
          placeholder="e.g. Java 17, Spring Boot 3, PostgreSQL 15, Kubernetes"
          value={config.techStack ?? ''}
          onChange={(e) => setConfig((prev) => ({ ...prev, techStack: e.target.value || undefined }))}
          maxLength={500}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Compliance Frameworks */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Compliance Frameworks</label>
        <p className="text-xs text-gray-500">
          Select frameworks your organization must comply with. AI guidance will include relevant control mappings.
        </p>
        <div className="flex flex-wrap gap-3">
          {COMPLIANCE_FRAMEWORKS.map((fw) => {
            const checked = (config.complianceFrameworks ?? []).includes(fw);
            return (
              <label
                key={fw}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  checked
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleFrameworkToggle(fw)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {fw}
              </label>
            );
          })}
        </div>
      </div>

      {/* Remediation Style */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Remediation Style</label>
        <p className="text-xs text-gray-500">
          Choose the level of detail for AI-generated remediation guidance.
        </p>
        <div className="space-y-2">
          {REMEDIATION_STYLES.map((style) => (
            <label
              key={style.value}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                config.remediationStyle === style.value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <input
                type="radio"
                name="remediationStyle"
                value={style.value}
                checked={config.remediationStyle === style.value}
                onChange={() =>
                  setConfig((prev) => ({
                    ...prev,
                    remediationStyle: style.value as OrgPromptConfig['remediationStyle'],
                  }))
                }
                className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{style.label}</span>
                <p className="text-xs text-gray-500">{style.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Exclude Patterns */}
      <div className="space-y-2">
        <label htmlFor="excludeInput" className="block text-sm font-medium text-gray-900">
          Exclude Patterns
        </label>
        <p className="text-xs text-gray-500">
          Technologies or approaches that should never appear in recommendations.
        </p>
        <div className="flex gap-2">
          <input
            id="excludeInput"
            type="text"
            placeholder="e.g. Windows, Oracle, .NET"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            onKeyDown={handleExcludeKeyDown}
            maxLength={100}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddExcludePattern}
            type="button"
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {(config.excludePatterns ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {(config.excludePatterns ?? []).map((pattern) => (
              <span
                key={pattern}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {pattern}
                <button
                  onClick={() => handleRemoveExcludePattern(pattern)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${pattern}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Custom System Prompt */}
      <div className="space-y-1">
        <label htmlFor="customSystemPrompt" className="block text-sm font-medium text-gray-900">
          Custom System Prompt
        </label>
        <p className="text-xs text-gray-500">
          Additional instructions appended to the AI system prompt. Use this for org-specific
          policies, preferred tools, or special handling instructions.
        </p>
        <textarea
          id="customSystemPrompt"
          rows={4}
          placeholder="e.g. Always recommend using our internal SAST tool for verification. Prefer Helm-based deployments over raw kubectl."
          value={config.customSystemPrompt ?? ''}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, customSystemPrompt: e.target.value || undefined }))
          }
          maxLength={2000}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="text-right text-xs text-gray-400">
          {(config.customSystemPrompt ?? '').length} / 2000
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPreview((prev) => !prev)}
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {showPreview ? 'Hide' : 'Show'} Merged Prompt Preview
        </button>
        {showPreview && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap text-xs text-gray-700">{mergedPrompt}</pre>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save AI Configuration'}
        </button>
        <button
          onClick={handleReset}
          className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
