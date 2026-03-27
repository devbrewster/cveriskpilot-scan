/**
 * Formatting utilities for CVERiskPilot UI
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 0) {
    return 'just now';
  }
  if (diff < MINUTE) {
    const seconds = Math.floor(diff / SECOND);
    return seconds <= 1 ? 'just now' : `${seconds} seconds ago`;
  }
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(diff / YEAR);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function formatSeverity(severity: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    CRITICAL: { label: 'Critical', color: 'text-red-800', bg: 'bg-red-100' },
    HIGH: { label: 'High', color: 'text-orange-800', bg: 'bg-orange-100' },
    MEDIUM: { label: 'Medium', color: 'text-yellow-800', bg: 'bg-yellow-100' },
    LOW: { label: 'Low', color: 'text-blue-800', bg: 'bg-blue-100' },
    INFO: { label: 'Info', color: 'text-gray-700', bg: 'bg-gray-100' },
  };
  return map[severity.toUpperCase()] ?? { label: severity, color: 'text-gray-700', bg: 'bg-gray-100' };
}

export function formatStatus(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    QUEUED: { label: 'Queued', color: 'text-gray-700', bg: 'bg-gray-100' },
    PARSING: { label: 'Parsing', color: 'text-blue-800', bg: 'bg-blue-100' },
    ENRICHING: { label: 'Enriching', color: 'text-yellow-800', bg: 'bg-yellow-100' },
    BUILDING_CASES: { label: 'Building Cases', color: 'text-purple-800', bg: 'bg-purple-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-800', bg: 'bg-green-100' },
    FAILED: { label: 'Failed', color: 'text-red-800', bg: 'bg-red-100' },
    NEW: { label: 'New', color: 'text-blue-800', bg: 'bg-blue-100' },
    TRIAGE: { label: 'Triage', color: 'text-purple-800', bg: 'bg-purple-100' },
    IN_REMEDIATION: { label: 'In Remediation', color: 'text-yellow-800', bg: 'bg-yellow-100' },
    FIXED_PENDING_VERIFICATION: { label: 'Fix Pending', color: 'text-teal-800', bg: 'bg-teal-100' },
    VERIFIED_CLOSED: { label: 'Closed', color: 'text-green-800', bg: 'bg-green-100' },
    REOPENED: { label: 'Reopened', color: 'text-red-800', bg: 'bg-red-100' },
    ACCEPTED_RISK: { label: 'Accepted Risk', color: 'text-amber-800', bg: 'bg-amber-100' },
    FALSE_POSITIVE: { label: 'False Positive', color: 'text-gray-600', bg: 'bg-gray-100' },
    NOT_APPLICABLE: { label: 'N/A', color: 'text-gray-500', bg: 'bg-gray-100' },
    DUPLICATE: { label: 'Duplicate', color: 'text-slate-600', bg: 'bg-slate-100' },
  };
  return map[status.toUpperCase()] ?? { label: status, color: 'text-gray-700', bg: 'bg-gray-100' };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatPercentage(n: number, decimals: number = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '\u2026';
}
