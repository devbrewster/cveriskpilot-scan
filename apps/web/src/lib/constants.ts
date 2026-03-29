/**
 * Application-wide constants and configuration maps for CVERiskPilot
 */

export const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    icon: 'XCircle',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    icon: 'AlertTriangle',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    icon: 'AlertCircle',
  },
  LOW: {
    label: 'Low',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    icon: 'Info',
  },
  INFO: {
    label: 'Info',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: 'Info',
  },
} as const;

export const STATUS_CONFIG = {
  QUEUED: { label: 'Queued', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  PARSING: { label: 'Parsing', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  ENRICHING: { label: 'Enriching', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  BUILDING_CASES: { label: 'Building Cases', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-800', bgColor: 'bg-green-100' },
  FAILED: { label: 'Failed', color: 'text-red-800', bgColor: 'bg-red-100' },
} as const;

export const SCANNER_CONFIG = {
  NESSUS: { label: 'Nessus', color: 'text-green-800', icon: 'Shield' },
  QUALYS: { label: 'Qualys', color: 'text-blue-800', icon: 'Shield' },
  OPENVAS: { label: 'OpenVAS', color: 'text-teal-800', icon: 'Shield' },
  GITHUB: { label: 'GitHub SAST', color: 'text-gray-800', icon: 'Code' },
  SNYK: { label: 'Snyk', color: 'text-purple-800', icon: 'Search' },
  TRIVY: { label: 'Trivy', color: 'text-cyan-800', icon: 'Box' },
} as const;

export const PARSER_FORMAT_CONFIG = {
  NESSUS: { label: 'Nessus', extension: '.nessus', mimeType: 'application/xml' },
  SARIF: { label: 'SARIF', extension: '.sarif', mimeType: 'application/json' },
  CSV: { label: 'CSV', extension: '.csv', mimeType: 'text/csv' },
  JSON_FORMAT: { label: 'JSON', extension: '.json', mimeType: 'application/json' },
  CYCLONEDX: { label: 'CycloneDX', extension: '.cdx.json', mimeType: 'application/json' },
  OSV: { label: 'OSV', extension: '.json', mimeType: 'application/json' },
  SPDX: { label: 'SPDX', extension: '.spdx.json', mimeType: 'application/json' },
  CSAF: { label: 'CSAF', extension: '.json', mimeType: 'application/json' },
  QUALYS: { label: 'Qualys', extension: '.csv', mimeType: 'text/csv' },
  OPENVAS: { label: 'OpenVAS', extension: '.csv', mimeType: 'text/csv' },
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Upload', href: '/upload', icon: 'Upload' },
  { label: 'Findings', href: '/findings', icon: 'Search' },
  { label: 'Cases', href: '/cases', icon: 'Briefcase' },
  { label: 'Reports', href: '/reports', icon: 'FileText' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_UPLOAD_SIZE_LABEL = '100 MB';

export const ACCEPTED_FILE_TYPES = [
  '.nessus',
  '.sarif',
  '.json',
  '.csv',
  '.cdx.json',
  '.xml',
  '.xlsx',
] as const;

export const ACCEPTED_MIME_TYPES = [
  'application/xml',
  'text/xml',
  'application/json',
  'text/csv',
] as const;
