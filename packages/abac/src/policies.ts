// ---------------------------------------------------------------------------
// ABAC Policy Engine — Built-in Policies
// ---------------------------------------------------------------------------

import type { Policy } from './types';

/**
 * Tenant isolation policy.
 * Enforces that subjects can only access resources within their own organization.
 */
export const tenantIsolation: Policy = {
  id: 'builtin:tenant-isolation',
  name: 'Tenant Isolation',
  description: 'Enforces organization boundary — subjects can only access resources owned by their org',
  priority: 0,
  enabled: true,
  combiningAlgorithm: 'deny-overrides',
  rules: [
    {
      actions: [],
      resourceTypes: [],
      conditions: [{ type: 'tenant-boundary' }],
      decision: 'allow',
    },
  ],
};

/**
 * Data classification policy.
 * Restricts access based on the resource classification vs. the subject's allowed classifications.
 */
export const dataClassification: Policy = {
  id: 'builtin:data-classification',
  name: 'Data Classification',
  description: 'Restricts access based on data sensitivity level (public, internal, confidential, restricted)',
  priority: 10,
  enabled: true,
  combiningAlgorithm: 'deny-overrides',
  rules: [
    {
      actions: [],
      resourceTypes: [],
      conditions: [{ type: 'data-classification' }],
      decision: 'allow',
    },
  ],
};

/**
 * MSSP client boundary policy.
 * Ensures MSSP users can only access data belonging to their assigned clients.
 */
export const msspClientBoundary: Policy = {
  id: 'builtin:mssp-client-boundary',
  name: 'MSSP Client Boundary',
  description: 'MSSP users can only access resources belonging to their assigned clients',
  priority: 5,
  enabled: true,
  combiningAlgorithm: 'deny-overrides',
  rules: [
    {
      actions: [],
      resourceTypes: [],
      conditions: [{ type: 'mssp-client-boundary' }],
      decision: 'allow',
    },
  ],
};

/**
 * Time-based access policy.
 * Restricts access to business hours (09:00–17:00 UTC by default).
 */
export const timeBasedAccess: Policy = {
  id: 'builtin:time-based-access',
  name: 'Business Hours Access',
  description: 'Restricts access to business hours (09:00–17:00 UTC)',
  priority: 20,
  enabled: true,
  combiningAlgorithm: 'deny-overrides',
  rules: [
    {
      actions: [],
      resourceTypes: [],
      conditions: [
        {
          type: 'time-based',
          allowedHoursStart: 9,
          allowedHoursEnd: 17,
          timezone: 'UTC',
        },
      ],
      decision: 'allow',
    },
  ],
};

/**
 * Returns all built-in policies as an array.
 */
export function getBuiltinPolicies(): Policy[] {
  return [tenantIsolation, dataClassification, msspClientBoundary, timeBasedAccess];
}
