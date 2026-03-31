import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuditEntry,
  verifyAuditEntry,
  signAuditEntry,
  verifyAuditSignature,
} from '@cveriskpilot/auth';
import {
  buildMerkleTree,
  hashLeaf,
  hashPair,
  verifyInclusionProof,
  appendLeaf,
  generateInclusionProof,
  getRootHash,
  createInMemoryStorage,
  type MerkleStorage,
} from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Audit Entry Hash Chain Tests
// ---------------------------------------------------------------------------

describe('Audit Entry Hash Chain', () => {
  it('should create an audit entry with a valid hash', () => {
    const entry = createAuditEntry({
      organizationId: 'org-1',
      entityType: 'VulnerabilityCase',
      entityId: 'case-1',
      action: 'CREATE',
      actorId: 'user-1',
    });

    expect(entry.hash).toBeTruthy();
    expect(entry.hash).toHaveLength(64); // SHA-256 hex
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it('should verify a valid audit entry', () => {
    const entry = createAuditEntry({
      organizationId: 'org-1',
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'UPDATE',
      actorId: 'user-1',
      details: { field: 'severity', from: 'HIGH', to: 'CRITICAL' },
    });

    expect(verifyAuditEntry(entry)).toBe(true);
  });

  it('should detect tampered entries', () => {
    const entry = createAuditEntry({
      organizationId: 'org-1',
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'UPDATE',
      actorId: 'user-1',
    });

    // Tamper with the entry
    const tampered = { ...entry, action: 'DELETE' };
    expect(verifyAuditEntry(tampered)).toBe(false);
  });

  it('should include previousHash in the hash chain', () => {
    const entry1 = createAuditEntry({
      organizationId: 'org-1',
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'CREATE',
      actorId: 'user-1',
    });

    const entry2 = createAuditEntry({
      organizationId: 'org-1',
      entityType: 'Finding',
      entityId: 'finding-2',
      action: 'CREATE',
      actorId: 'user-1',
      previousHash: entry1.hash,
    });

    expect(entry2.previousHash).toBe(entry1.hash);
    expect(verifyAuditEntry(entry2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ed25519 Signing Tests (local fallback)
// ---------------------------------------------------------------------------

describe('Ed25519 Audit Signing', () => {
  const orgId = 'test-org-1';

  it('should sign an audit entry', async () => {
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'VulnerabilityCase',
      entityId: 'case-1',
      action: 'CREATE',
      actorId: 'user-1',
    });

    const sigData = await signAuditEntry(entry, orgId);

    expect(sigData.signature).toBeTruthy();
    expect(sigData.keyVersion).toBe('local'); // No KMS in test
    expect(sigData.entryHash).toBe(entry.hash);
    expect(sigData.signedAt).toBeTruthy();
  });

  it('should verify a valid signature', async () => {
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'UPDATE',
      actorId: 'user-1',
    });

    const sigData = await signAuditEntry(entry, orgId);
    const valid = await verifyAuditSignature(entry.hash, sigData, orgId);

    expect(valid).toBe(true);
  });

  it('should reject a signature with wrong hash', async () => {
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'UPDATE',
      actorId: 'user-1',
    });

    const sigData = await signAuditEntry(entry, orgId);
    const valid = await verifyAuditSignature('tampered-hash', sigData, orgId);

    expect(valid).toBe(false);
  });

  it('should reject a signature from a different org', async () => {
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'CREATE',
      actorId: 'user-1',
    });

    const sigData = await signAuditEntry(entry, orgId);
    // Verify with a different org's key
    const valid = await verifyAuditSignature(entry.hash, sigData, 'different-org');

    expect(valid).toBe(false);
  });

  it('should produce deterministic signatures for the same org', async () => {
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'Finding',
      entityId: 'finding-1',
      action: 'CREATE',
      actorId: 'user-1',
    });

    const sig1 = await signAuditEntry(entry, orgId);
    const sig2 = await signAuditEntry(entry, orgId);

    // Same key signs same data → same signature (Ed25519 is deterministic)
    expect(sig1.signature).toBe(sig2.signature);
  });
});

// ---------------------------------------------------------------------------
// Merkle Tree Tests
// ---------------------------------------------------------------------------

describe('Merkle Tree', () => {
  describe('Hash functions', () => {
    it('should produce consistent leaf hashes', () => {
      const h1 = hashLeaf('abc');
      const h2 = hashLeaf('abc');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different inputs', () => {
      const h1 = hashLeaf('abc');
      const h2 = hashLeaf('def');
      expect(h1).not.toBe(h2);
    });

    it('should produce consistent pair hashes', () => {
      const h = hashPair('left', 'right');
      expect(h).toBe(hashPair('left', 'right'));
      expect(h).not.toBe(hashPair('right', 'left'));
    });
  });

  describe('buildMerkleTree', () => {
    it('should handle empty tree', () => {
      const tree = buildMerkleTree([]);
      expect(tree.leafCount).toBe(0);
      expect(tree.rootHash).toBeTruthy();
    });

    it('should handle single leaf', () => {
      const tree = buildMerkleTree(['a']);
      expect(tree.leafCount).toBe(1);
      expect(tree.rootHash).toBe(hashLeaf('a'));
    });

    it('should handle two leaves', () => {
      const tree = buildMerkleTree(['a', 'b']);
      expect(tree.leafCount).toBe(2);
      const expected = hashPair(hashLeaf('a'), hashLeaf('b'));
      expect(tree.rootHash).toBe(expected);
    });

    it('should handle power-of-2 leaves', () => {
      const tree = buildMerkleTree(['a', 'b', 'c', 'd']);
      expect(tree.leafCount).toBe(4);
      const ab = hashPair(hashLeaf('a'), hashLeaf('b'));
      const cd = hashPair(hashLeaf('c'), hashLeaf('d'));
      const root = hashPair(ab, cd);
      expect(tree.rootHash).toBe(root);
    });

    it('should handle non-power-of-2 leaves', () => {
      const tree = buildMerkleTree(['a', 'b', 'c']);
      expect(tree.leafCount).toBe(3);
      expect(tree.rootHash).toBeTruthy();
    });
  });

  describe('Incremental append with storage', () => {
    let storage: MerkleStorage;
    const orgId = 'test-org';

    beforeEach(() => {
      storage = createInMemoryStorage();
    });

    it('should append a single leaf', async () => {
      const result = await appendLeaf(storage, orgId, 'entry-1');
      expect(result.leafIndex).toBe(0);
      expect(result.rootHash).toBeTruthy();
    });

    it('should append multiple leaves', async () => {
      const r1 = await appendLeaf(storage, orgId, 'entry-1');
      const r2 = await appendLeaf(storage, orgId, 'entry-2');

      expect(r1.leafIndex).toBe(0);
      expect(r2.leafIndex).toBe(1);
      expect(r2.rootHash).not.toBe(r1.rootHash);
    });

    it('should produce same root as batch build for 2 leaves', async () => {
      await appendLeaf(storage, orgId, 'a');
      const r2 = await appendLeaf(storage, orgId, 'b');

      const batchTree = buildMerkleTree(['a', 'b']);
      expect(r2.rootHash).toBe(batchTree.rootHash);
    });

    it('should get the current root hash', async () => {
      await appendLeaf(storage, orgId, 'entry-1');
      const result = await appendLeaf(storage, orgId, 'entry-2');

      const root = await getRootHash(storage, orgId);
      expect(root).toBe(result.rootHash);
    });

    it('should return null root for empty tree', async () => {
      const root = await getRootHash(storage, orgId);
      expect(root).toBeNull();
    });
  });

  describe('Inclusion proofs', () => {
    let storage: MerkleStorage;
    const orgId = 'test-org';

    beforeEach(async () => {
      storage = createInMemoryStorage();
      // Build a tree with 4 leaves
      await appendLeaf(storage, orgId, 'entry-1');
      await appendLeaf(storage, orgId, 'entry-2');
      await appendLeaf(storage, orgId, 'entry-3');
      await appendLeaf(storage, orgId, 'entry-4');
    });

    it('should generate a valid inclusion proof for leaf 0', async () => {
      const proof = await generateInclusionProof(storage, orgId, 0);
      expect(proof).not.toBeNull();
      expect(proof!.leafIndex).toBe(0);
      expect(proof!.treeSize).toBe(4);

      const leafHash = hashLeaf('entry-1');
      expect(verifyInclusionProof(leafHash, proof!)).toBe(true);
    });

    it('should generate a valid inclusion proof for leaf 3', async () => {
      const proof = await generateInclusionProof(storage, orgId, 3);
      expect(proof).not.toBeNull();

      const leafHash = hashLeaf('entry-4');
      expect(verifyInclusionProof(leafHash, proof!)).toBe(true);
    });

    it('should reject a proof with the wrong leaf hash', async () => {
      const proof = await generateInclusionProof(storage, orgId, 0);
      expect(proof).not.toBeNull();

      const wrongHash = hashLeaf('wrong-entry');
      expect(verifyInclusionProof(wrongHash, proof!)).toBe(false);
    });

    it('should return null for out-of-range leaf index', async () => {
      const proof = await generateInclusionProof(storage, orgId, 10);
      expect(proof).toBeNull();
    });

    it('should return null for empty tree', async () => {
      const emptyStorage = createInMemoryStorage();
      const proof = await generateInclusionProof(emptyStorage, 'empty-org', 0);
      expect(proof).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// End-to-end: Sign + Merkle + Verify
// ---------------------------------------------------------------------------

describe('Vault Protocol End-to-End', () => {
  it('should create, sign, store in Merkle tree, and verify an audit entry', async () => {
    const orgId = 'e2e-org';
    const storage = createInMemoryStorage();

    // 1. Create audit entry
    const entry = createAuditEntry({
      organizationId: orgId,
      entityType: 'VulnerabilityCase',
      entityId: 'case-42',
      action: 'STATE_CHANGE',
      actorId: 'user-1',
      details: { from: 'OPEN', to: 'IN_PROGRESS' },
    });
    expect(verifyAuditEntry(entry)).toBe(true);

    // 2. Sign the entry
    const sigData = await signAuditEntry(entry, orgId);
    expect(sigData.signature).toBeTruthy();

    // 3. Append to Merkle tree
    const { rootHash, leafIndex } = await appendLeaf(storage, orgId, entry.hash);
    expect(leafIndex).toBe(0);
    expect(rootHash).toBeTruthy();

    // 4. Verify signature
    const sigValid = await verifyAuditSignature(entry.hash, sigData, orgId);
    expect(sigValid).toBe(true);

    // 5. Verify Merkle inclusion
    const proof = await generateInclusionProof(storage, orgId, leafIndex);
    expect(proof).not.toBeNull();

    const leafHash = hashLeaf(entry.hash);
    expect(verifyInclusionProof(leafHash, proof!)).toBe(true);
  });

  it('should maintain integrity across multiple entries', async () => {
    const orgId = 'e2e-org-2';
    const storage = createInMemoryStorage();
    const entries = [];

    // Create 10 entries
    for (let i = 0; i < 10; i++) {
      const entry = createAuditEntry({
        organizationId: orgId,
        entityType: 'Finding',
        entityId: `finding-${i}`,
        action: 'CREATE',
        actorId: 'user-1',
        previousHash: entries.length > 0 ? entries[entries.length - 1]!.hash : undefined,
      });

      const sigData = await signAuditEntry(entry, orgId);
      const { leafIndex } = await appendLeaf(storage, orgId, entry.hash);

      entries.push({ entry, sigData, leafIndex });
    }

    // Verify all entries
    for (const { entry, sigData, leafIndex } of entries) {
      // Hash chain
      expect(verifyAuditEntry(entry)).toBe(true);

      // Signature
      const sigValid = await verifyAuditSignature(entry.hash, sigData, orgId);
      expect(sigValid).toBe(true);

      // Merkle proof
      const proof = await generateInclusionProof(storage, orgId, leafIndex);
      expect(proof).not.toBeNull();
      const leafHash = hashLeaf(entry.hash);
      expect(verifyInclusionProof(leafHash, proof!)).toBe(true);
    }
  });
});
