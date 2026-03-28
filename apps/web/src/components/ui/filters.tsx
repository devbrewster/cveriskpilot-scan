'use client';

import { useRef, useState, useEffect } from 'react';

// --- FilterPill ---

interface FilterPillProps {
  label: string;
  active?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  color?: string;
}

export function FilterPill({ label, active = false, onToggle, onRemove }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary-100 text-primary-800 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {label}
      {onRemove && active && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

// --- FilterDropdown ---

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- FilterSearch ---

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FilterSearch({ value, onChange, placeholder = 'Search...' }: FilterSearchProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-1.5 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}

// --- FilterToggle ---

interface FilterToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterToggle({ label, checked, onChange }: FilterToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow-sm ring-0 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

// --- FilterSlider ---

interface FilterSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (v: number) => string;
}

export function FilterSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (v) => `${v}%`,
}: FilterSliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [_localValue, _setLocalValue] = useState(value);

  useEffect(() => {
    _setLocalValue(value);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</label>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={_localValue}
        onChange={(e) => {
          const v = Number(e.target.value);
          _setLocalValue(v);
          onChange(v);
        }}
        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700 accent-primary-600"
      />
      <span className="min-w-[3rem] text-xs font-medium text-gray-700 dark:text-gray-300">{formatValue(_localValue)}</span>
    </div>
  );
}
