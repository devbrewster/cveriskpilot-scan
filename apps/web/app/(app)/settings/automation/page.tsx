'use client';

import { useState, useEffect, useCallback } from 'react';
import { RuleBuilder, type AutomationRule } from '@/components/automation/rule-builder';

// --- Types ---

interface RuleListItem extends AutomationRule {
  id: string;
  conditionCount: number;
  actionCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface TestResult {
  ruleId: string;
  ruleName: string;
  matchedFindings: number;
}

// --- Templates ---

const RULE_TEMPLATES: { name: string; description: string; rule: Omit<AutomationRule, 'id'> }[] = [
  {
    name: 'Auto-escalate KEV findings',
    description: 'Automatically set KEV-listed findings to CRITICAL severity and trigger AI triage.',
    rule: {
      name: 'Auto-escalate KEV findings',
      description: 'Escalate any finding listed in CISA KEV to critical and trigger triage.',
      conditionLogic: 'AND',
      conditions: [
        { id: 't1c1', field: 'kevListed', operator: 'eq', value: 'true' },
      ],
      actions: [
        { id: 't1a1', type: 'set_severity', params: { severity: 'CRITICAL' } },
        { id: 't1a2', type: 'trigger_triage', params: {} },
        { id: 't1a3', type: 'add_tag', params: { tag: 'kev-escalated' } },
      ],
      priority: 1,
      enabled: true,
    },
  },
  {
    name: 'Auto-triage high EPSS (>0.9)',
    description: 'Trigger AI triage for findings with EPSS probability above 0.9.',
    rule: {
      name: 'Auto-triage high EPSS (>0.9)',
      description: 'Findings with very high exploitation probability get automatic AI triage.',
      conditionLogic: 'AND',
      conditions: [
        { id: 't2c1', field: 'epssScore', operator: 'gt', value: '0.9' },
      ],
      actions: [
        { id: 't2a1', type: 'trigger_triage', params: {} },
        { id: 't2a2', type: 'send_notification', params: { message: 'High EPSS finding detected and queued for triage' } },
      ],
      priority: 2,
      enabled: true,
    },
  },
  {
    name: 'Assign critical findings',
    description: 'Auto-assign critical-severity findings to the security lead and add a tag.',
    rule: {
      name: 'Assign critical findings',
      description: 'Route critical findings to the security lead for immediate review.',
      conditionLogic: 'AND',
      conditions: [
        { id: 't3c1', field: 'severity', operator: 'eq', value: 'CRITICAL' },
      ],
      actions: [
        { id: 't3a1', type: 'assign_user', params: { userId: 'security-lead' } },
        { id: 't3a2', type: 'add_tag', params: { tag: 'needs-review' } },
        { id: 't3a3', type: 'create_comment', params: { comment: 'Auto-assigned: critical severity finding requires immediate attention.' } },
      ],
      priority: 3,
      enabled: true,
    },
  },
];

// --- Main page ---

export default function AutomationRulesPage() {
  const [rules, setRules] = useState<RuleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [saving, setSaving] = useState(false);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | undefined>(undefined);

  // Test state
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/automation/rules');
      if (!res.ok) throw new Error('Failed to load rules');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data.rules ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async (rule: AutomationRule) => {
    try {
      setSaving(true);
      const isUpdate = !!rule.id;
      const url = isUpdate ? `/api/automation/rules/${rule.id}` : '/api/automation/rules';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to ${isUpdate ? 'update' : 'create'} rule`);
      }

      setShowBuilder(false);
      setEditingRule(undefined);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation rule? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleToggle = async (rule: RuleListItem) => {
    try {
      const res = await fetch(`/api/automation/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle rule');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleEdit = (rule: RuleListItem) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleUseTemplate = (template: (typeof RULE_TEMPLATES)[number]) => {
    setEditingRule({ ...template.rule, id: undefined });
    setShowBuilder(true);
  };

  const handleTestRules = async () => {
    try {
      setTesting(true);
      setTestResults(null);
      const res = await fetch('/api/automation/rules/test', { method: 'POST' });
      if (!res.ok) throw new Error('Test failed');
      const data = await res.json();
      setTestResults(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create IF/THEN rules to automate vulnerability management workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestRules}
            disabled={testing || rules.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Rules'}
          </button>
          <button
            onClick={() => {
              setEditingRule(undefined);
              setShowBuilder(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Create Rule
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-sm font-medium text-red-700 hover:text-red-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Test results */}
      {testResults && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-800">Test Results</h3>
            <button
              onClick={() => setTestResults(null)}
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              Dismiss
            </button>
          </div>
          {testResults.length === 0 ? (
            <p className="text-sm text-blue-700">No rules matched any current findings.</p>
          ) : (
            <ul className="space-y-1">
              {testResults.map((r) => (
                <li key={r.ruleId} className="text-sm text-blue-700">
                  <span className="font-medium">{r.ruleName}</span> — matched{' '}
                  <span className="font-semibold">{r.matchedFindings}</span> finding
                  {r.matchedFindings !== 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Rule Builder panel */}
      {showBuilder && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            {editingRule?.id ? 'Edit Rule' : 'Create Rule'}
          </h2>
          <RuleBuilder
            rule={editingRule}
            onSave={handleSave}
            onCancel={() => {
              setShowBuilder(false);
              setEditingRule(undefined);
            }}
          />
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : rules.length === 0 && !showBuilder ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mb-1 text-base font-semibold text-gray-900">No automation rules yet</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
            Create your first rule to automate vulnerability management. Use templates below to get started quickly.
          </p>
          <button
            onClick={() => {
              setEditingRule(undefined);
              setShowBuilder(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Create Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-gray-900">{rule.name}</h3>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {rule.conditionCount ?? rule.conditions?.length ?? 0} condition
                    {(rule.conditionCount ?? rule.conditions?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {rule.actionCount ?? rule.actions?.length ?? 0} action
                    {(rule.actionCount ?? rule.actions?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    P{rule.priority}
                  </span>
                </div>
                {rule.description && (
                  <p className="mt-0.5 truncate text-sm text-gray-500">{rule.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {rule.lastTriggeredAt
                    ? `Last triggered ${new Date(rule.lastTriggeredAt).toLocaleDateString()}`
                    : 'Never triggered'}
                </p>
              </div>

              <div className="ml-4 flex items-center gap-3">
                {/* Enable/disable toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  onClick={() => handleToggle(rule)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      rule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                <button
                  onClick={() => handleEdit(rule)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Templates */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Templates</h2>
        <p className="mb-4 text-sm text-gray-500">
          Start from a pre-built template and customize to your needs.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {RULE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.name}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
              <p className="mt-1 flex-1 text-sm text-gray-500">{tpl.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {tpl.rule.conditions.length} condition{tpl.rule.conditions.length !== 1 ? 's' : ''},{' '}
                  {tpl.rule.actions.length} action{tpl.rule.actions.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => handleUseTemplate(tpl)}
                  className="ml-auto rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Use template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
