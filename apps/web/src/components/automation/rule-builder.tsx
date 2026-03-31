'use client';

import { useState, useCallback } from 'react';

// --- Local type definitions (no imports from rule engine) ---

type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists';

type ConditionLogic = 'AND' | 'OR';

type ActionType =
  | 'set_status'
  | 'assign_user'
  | 'add_tag'
  | 'set_severity'
  | 'trigger_triage'
  | 'send_notification'
  | 'create_comment';

type FieldName =
  | 'severity'
  | 'epssScore'
  | 'kevListed'
  | 'status'
  | 'cvssScore'
  | 'findingCount'
  | 'cweIds'
  | 'cveIds'
  | 'tags';

type FieldType = 'enum' | 'number' | 'boolean' | 'string' | 'string_array';

interface FieldDef {
  name: FieldName;
  label: string;
  type: FieldType;
  options?: string[];
}

interface Condition {
  id: string;
  field: FieldName;
  operator: ConditionOperator;
  value: string;
}

interface Action {
  id: string;
  type: ActionType;
  params: Record<string, string>;
}

export interface AutomationRule {
  id?: string;
  name: string;
  description: string;
  conditionLogic: ConditionLogic;
  conditions: Condition[];
  actions: Action[];
  priority: number;
  enabled: boolean;
}

interface RuleBuilderProps {
  rule?: AutomationRule;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

// --- Constants ---

const FIELDS: FieldDef[] = [
  { name: 'severity', label: 'Severity', type: 'enum', options: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
  { name: 'epssScore', label: 'EPSS Score', type: 'number' },
  { name: 'kevListed', label: 'KEV Listed', type: 'boolean' },
  { name: 'status', label: 'Status', type: 'enum', options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED', 'FALSE_POSITIVE'] },
  { name: 'cvssScore', label: 'CVSS Score', type: 'number' },
  { name: 'findingCount', label: 'Finding Count', type: 'number' },
  { name: 'cweIds', label: 'CWE IDs', type: 'string_array' },
  { name: 'cveIds', label: 'CVE IDs', type: 'string_array' },
  { name: 'tags', label: 'Tags', type: 'string_array' },
];

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED', 'FALSE_POSITIVE'];

const OPERATORS_BY_TYPE: Record<FieldType, { value: ConditionOperator; label: string }[]> = {
  number: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
    { value: 'gt', label: 'greater than' },
    { value: 'gte', label: 'greater or equal' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'less or equal' },
  ],
  enum: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' },
  ],
  boolean: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
  ],
  string: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'exists', label: 'exists' },
  ],
  string_array: [
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' },
    { value: 'exists', label: 'exists' },
  ],
};

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'set_status', label: 'Set Status' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'set_severity', label: 'Set Severity' },
  { value: 'trigger_triage', label: 'Trigger AI Triage' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_comment', label: 'Create Comment' },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getFieldDef(name: FieldName): FieldDef {
  return FIELDS.find((f) => f.name === name) ?? FIELDS[0];
}

// --- Sub-components ---

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const fieldDef = getFieldDef(condition.field);
  const operators = OPERATORS_BY_TYPE[fieldDef.type];

  const handleFieldChange = (field: FieldName) => {
    const newDef = getFieldDef(field);
    const newOps = OPERATORS_BY_TYPE[newDef.type];
    const opValid = newOps.some((o) => o.value === condition.operator);
    onChange({
      ...condition,
      field,
      operator: opValid ? condition.operator : newOps[0].value,
      value: '',
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value as FieldName)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {FIELDS.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {operators.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Value — adapts to field type */}
      {condition.operator !== 'exists' && (
        <ValueInput fieldDef={fieldDef} value={condition.value} onChange={(v) => onChange({ ...condition, value: v })} />
      )}

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="Remove condition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ValueInput({
  fieldDef,
  value,
  onChange,
}: {
  fieldDef: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (fieldDef.type === 'boolean') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Select...</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  if (fieldDef.type === 'enum' && fieldDef.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Select...</option>
        {fieldDef.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (fieldDef.type === 'number') {
    return (
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    );
  }

  // string / string_array
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={fieldDef.type === 'string_array' ? 'comma-separated values' : 'value'}
      className="min-w-[160px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

function ActionRow({
  action,
  onChange,
  onRemove,
}: {
  action: Action;
  onChange: (a: Action) => void;
  onRemove: () => void;
}) {
  const handleTypeChange = (type: ActionType) => {
    onChange({ ...action, type, params: {} });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      {/* Action type */}
      <select
        value={action.type}
        onChange={(e) => handleTypeChange(e.target.value as ActionType)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {ACTION_TYPES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      {/* Params — vary by type */}
      <ActionParams action={action} onChange={onChange} />

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="Remove action"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ActionParams({ action, onChange }: { action: Action; onChange: (a: Action) => void }) {
  const setParam = (key: string, value: string) => {
    onChange({ ...action, params: { ...action.params, [key]: value } });
  };

  switch (action.type) {
    case 'set_status':
      return (
        <select
          value={action.params.status ?? ''}
          onChange={(e) => setParam('status', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select status...</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );

    case 'set_severity':
      return (
        <select
          value={action.params.severity ?? ''}
          onChange={(e) => setParam('severity', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select severity...</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );

    case 'assign_user':
      return (
        <input
          type="text"
          value={action.params.userId ?? ''}
          onChange={(e) => setParam('userId', e.target.value)}
          placeholder="User ID or role"
          className="min-w-[180px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      );

    case 'add_tag':
      return (
        <input
          type="text"
          value={action.params.tag ?? ''}
          onChange={(e) => setParam('tag', e.target.value)}
          placeholder="Tag name"
          className="min-w-[160px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      );

    case 'send_notification':
      return (
        <input
          type="text"
          value={action.params.message ?? ''}
          onChange={(e) => setParam('message', e.target.value)}
          placeholder="Notification message"
          className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      );

    case 'create_comment':
      return (
        <input
          type="text"
          value={action.params.comment ?? ''}
          onChange={(e) => setParam('comment', e.target.value)}
          placeholder="Comment text"
          className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      );

    case 'trigger_triage':
      return <span className="text-sm text-gray-500 italic">No additional parameters</span>;

    default:
      return null;
  }
}

// --- Main component ---

const emptyRule: AutomationRule = {
  name: '',
  description: '',
  conditionLogic: 'AND',
  conditions: [],
  actions: [],
  priority: 10,
  enabled: true,
};

export function RuleBuilder({ rule, onSave, onCancel }: RuleBuilderProps) {
  const [form, setForm] = useState<AutomationRule>(rule ?? emptyRule);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof AutomationRule>(key: K, value: AutomationRule[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Conditions
  const addCondition = () => {
    const c: Condition = { id: uid(), field: 'severity', operator: 'eq', value: '' };
    updateField('conditions', [...form.conditions, c]);
  };

  const updateCondition = (id: string, updated: Condition) => {
    updateField(
      'conditions',
      form.conditions.map((c) => (c.id === id ? updated : c))
    );
  };

  const removeCondition = (id: string) => {
    updateField(
      'conditions',
      form.conditions.filter((c) => c.id !== id)
    );
  };

  // Actions
  const addAction = () => {
    const a: Action = { id: uid(), type: 'set_status', params: {} };
    updateField('actions', [...form.actions, a]);
  };

  const updateAction = (id: string, updated: Action) => {
    updateField(
      'actions',
      form.actions.map((a) => (a.id === id ? updated : a))
    );
  };

  const removeAction = (id: string) => {
    updateField(
      'actions',
      form.actions.filter((a) => a.id !== id)
    );
  };

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Rule name is required';
    if (form.conditions.length === 0) errs.conditions = 'At least one condition is required';
    if (form.actions.length === 0) errs.actions = 'At least one action is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(form);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
      {/* Rule name + description */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Rule Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. Auto-escalate KEV findings"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="What does this rule do?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">IF</h3>
            <div className="inline-flex overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium">
              <button
                type="button"
                onClick={() => updateField('conditionLogic', 'AND')}
                className={`px-3 py-1 transition-colors ${
                  form.conditionLogic === 'AND'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => updateField('conditionLogic', 'OR')}
                className={`px-3 py-1 transition-colors ${
                  form.conditionLogic === 'OR'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                OR
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={addCondition}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Add condition
          </button>
        </div>

        {errors.conditions && <p className="mb-2 text-xs text-red-600">{errors.conditions}</p>}

        <div className="space-y-2">
          {form.conditions.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
              No conditions yet. Click &quot;+ Add condition&quot; to start.
            </p>
          )}
          {form.conditions.map((c) => (
            <ConditionRow
              key={c.id}
              condition={c}
              onChange={(updated) => updateCondition(c.id, updated)}
              onRemove={() => removeCondition(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">THEN</h3>
          <button
            type="button"
            onClick={addAction}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Add action
          </button>
        </div>

        {errors.actions && <p className="mb-2 text-xs text-red-600">{errors.actions}</p>}

        <div className="space-y-2">
          {form.actions.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
              No actions yet. Click &quot;+ Add action&quot; to define what happens.
            </p>
          )}
          {form.actions.map((a) => (
            <ActionRow
              key={a.id}
              action={a}
              onChange={(updated) => updateAction(a.id, updated)}
              onRemove={() => removeAction(a.id)}
            />
          ))}
        </div>
      </div>

      {/* Priority + Enabled */}
      <div className="flex items-center gap-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.priority}
            onChange={(e) => updateField('priority', parseInt(e.target.value, 10) || 1)}
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-0.5 text-xs text-gray-400">Lower = higher priority</p>
        </div>
        <div className="pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              onClick={() => updateField('enabled', !form.enabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                form.enabled ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  form.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            Enabled
          </label>
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {form.id ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </div>
  );
}
