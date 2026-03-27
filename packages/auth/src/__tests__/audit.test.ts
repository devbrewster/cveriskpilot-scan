import { describe, it, expect } from 'vitest';
import { createAuditEntry, verifyAuditEntry } from '../security/audit';

describe('Audit logging', () => {
  const baseParams = {
    organizationId: 'org-1',
    entityType: 'vulnerability',
    entityId: 'vuln-42',
    action: 'status_change',
    actorId: 'user-7',
    actorIp: '10.0.0.1',
    details: { from: 'open', to: 'mitigated' },
  };

  describe('createAuditEntry', () => {
    it('creates an entry with all required fields', () => {
      const entry = createAuditEntry(baseParams);

      expect(entry.id).toBeDefined();
      expect(entry.organizationId).toBe('org-1');
      expect(entry.entityType).toBe('vulnerability');
      expect(entry.entityId).toBe('vuln-42');
      expect(entry.action).toBe('status_change');
      expect(entry.actorId).toBe('user-7');
      expect(entry.actorIp).toBe('10.0.0.1');
      expect(entry.details).toEqual({ from: 'open', to: 'mitigated' });
      expect(entry.timestamp).toBeDefined();
      expect(entry.hash).toBeDefined();
      expect(entry.hash.length).toBe(64); // SHA-256 hex
    });

    it('generates unique IDs for each entry', () => {
      const a = createAuditEntry(baseParams);
      const b = createAuditEntry(baseParams);
      expect(a.id).not.toBe(b.id);
    });

    it('includes previousHash when provided', () => {
      const first = createAuditEntry(baseParams);
      const second = createAuditEntry({
        ...baseParams,
        previousHash: first.hash,
      });

      expect(second.previousHash).toBe(first.hash);
      // The hash should differ because previousHash is part of the computation
      expect(second.hash).not.toBe(first.hash);
    });
  });

  describe('verifyAuditEntry', () => {
    it('returns true for an untampered entry', () => {
      const entry = createAuditEntry(baseParams);
      expect(verifyAuditEntry(entry)).toBe(true);
    });

    it('returns false when the action is tampered', () => {
      const entry = createAuditEntry(baseParams);
      entry.action = 'delete';
      expect(verifyAuditEntry(entry)).toBe(false);
    });

    it('returns false when details are tampered', () => {
      const entry = createAuditEntry(baseParams);
      entry.details = { from: 'open', to: 'deleted' };
      expect(verifyAuditEntry(entry)).toBe(false);
    });

    it('returns false when the hash itself is changed', () => {
      const entry = createAuditEntry(baseParams);
      entry.hash = 'a'.repeat(64);
      expect(verifyAuditEntry(entry)).toBe(false);
    });

    it('detects broken hash chain', () => {
      const first = createAuditEntry(baseParams);
      const second = createAuditEntry({
        ...baseParams,
        previousHash: first.hash,
      });

      // Tamper with the previousHash link
      second.previousHash = 'b'.repeat(64);
      expect(verifyAuditEntry(second)).toBe(false);
    });
  });

  describe('hash chain integrity', () => {
    it('builds a verifiable chain of entries', () => {
      const entries = [];
      let prevHash: string | undefined;

      for (let i = 0; i < 5; i++) {
        const entry = createAuditEntry({
          ...baseParams,
          action: `action_${i}`,
          previousHash: prevHash,
        });
        entries.push(entry);
        prevHash = entry.hash;
      }

      // Every entry should verify independently
      for (const entry of entries) {
        expect(verifyAuditEntry(entry)).toBe(true);
      }

      // Chain links should be consistent
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i]!.previousHash).toBe(entries[i - 1]!.hash);
      }
    });
  });
});
