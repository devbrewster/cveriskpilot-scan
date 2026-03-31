// Vault Protocol: Append-only Merkle tree for audit trail integrity
// Each organization maintains its own Merkle tree of audit event hashes.
// Provides inclusion proofs and tamper detection via root hash comparison.

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MerkleNodeData {
  level: number;
  position: number;
  hash: string;
}

export interface MerkleInclusionProof {
  /** Current root hash of the tree */
  root: string;
  /** Path from leaf to root */
  path: Array<{ hash: string; direction: 'left' | 'right' }>;
  /** Index of the leaf in the tree */
  leafIndex: number;
  /** Total number of leaves when proof was generated */
  treeSize: number;
}

export interface MerkleTreeState {
  /** All nodes in the tree, keyed by `${level}:${position}` */
  nodes: Map<string, string>;
  /** Number of leaf nodes */
  leafCount: number;
  /** Current root hash */
  rootHash: string;
}

// ---------------------------------------------------------------------------
// Storage interface (implemented by callers using Prisma or in-memory)
// ---------------------------------------------------------------------------

export interface MerkleStorage {
  /** Get a node's hash by level and position */
  getNode(orgId: string, level: number, position: number): Promise<string | null>;
  /** Store a node */
  putNode(orgId: string, level: number, position: number, hash: string): Promise<void>;
  /** Get the current leaf count for an org */
  getLeafCount(orgId: string): Promise<number>;
  /** Set the leaf count */
  setLeafCount(orgId: string, count: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/** Hash two child nodes together to produce a parent hash */
export function hashPair(left: string, right: string): string {
  return crypto
    .createHash('sha256')
    .update(`${left}:${right}`)
    .digest('hex');
}

/** Hash a leaf value (audit entry hash) */
export function hashLeaf(value: string): string {
  return crypto
    .createHash('sha256')
    .update(`leaf:${value}`)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// In-memory Merkle tree (for tests and batch operations)
// ---------------------------------------------------------------------------

/**
 * Build a complete Merkle tree from an array of leaf values.
 * Returns all nodes and the root hash.
 */
export function buildMerkleTree(leaves: string[]): MerkleTreeState {
  if (leaves.length === 0) {
    return {
      nodes: new Map(),
      leafCount: 0,
      rootHash: hashLeaf('empty'),
    };
  }

  const nodes = new Map<string, string>();

  // Hash all leaves
  const hashedLeaves = leaves.map((l) => hashLeaf(l));
  hashedLeaves.forEach((h, i) => {
    nodes.set(`0:${i}`, h);
  });

  // Pad to next power of 2 for a balanced tree
  let currentLevel = [...hashedLeaves];
  const paddingHash = hashLeaf('padding');
  while (currentLevel.length > 1 && (currentLevel.length & (currentLevel.length - 1)) !== 0) {
    currentLevel.push(paddingHash);
    nodes.set(`0:${currentLevel.length - 1}`, paddingHash);
  }

  // Build tree bottom-up
  let level = 0;
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1] ?? left; // duplicate if odd
      const parent = hashPair(left, right);
      nextLevel.push(parent);
      nodes.set(`${level + 1}:${nextLevel.length - 1}`, parent);
    }
    currentLevel = nextLevel;
    level++;
  }

  return {
    nodes,
    leafCount: leaves.length,
    rootHash: currentLevel[0]!,
  };
}

// ---------------------------------------------------------------------------
// Incremental append (storage-backed)
// ---------------------------------------------------------------------------

/**
 * Append a new leaf to the org's Merkle tree.
 * Rebuilds internal nodes from leaves to ensure correctness at any tree size.
 * Returns the new root hash and the leaf index.
 */
export async function appendLeaf(
  storage: MerkleStorage,
  orgId: string,
  leafValue: string,
): Promise<{ rootHash: string; leafIndex: number }> {
  const leafHash = hashLeaf(leafValue);
  const leafCount = await storage.getLeafCount(orgId);
  const newLeafIndex = leafCount;

  // Store the new leaf at level 0
  await storage.putNode(orgId, 0, newLeafIndex, leafHash);
  const newSize = newLeafIndex + 1;

  // Rebuild tree from all leaves
  // Collect all leaf hashes
  const leaves: string[] = [];
  for (let i = 0; i < newSize; i++) {
    const h = await storage.getNode(orgId, 0, i);
    leaves.push(h!);
  }

  // Build internal nodes bottom-up
  let currentLevel = [...leaves];
  let level = 0;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1] ?? left;
      const parent = hashPair(left, right);
      nextLevel.push(parent);
      await storage.putNode(orgId, level + 1, nextLevel.length - 1, parent);
    }
    currentLevel = nextLevel;
    level++;
  }

  const rootHash = currentLevel[0]!;
  await storage.setLeafCount(orgId, newSize);

  return { rootHash, leafIndex: newLeafIndex };
}

/**
 * Generate an inclusion proof for a leaf at the given index.
 */
export async function generateInclusionProof(
  storage: MerkleStorage,
  orgId: string,
  leafIndex: number,
): Promise<MerkleInclusionProof | null> {
  const leafCount = await storage.getLeafCount(orgId);
  if (leafIndex >= leafCount || leafCount === 0) return null;

  // Determine tree height by finding the highest stored level
  // Walk up levels starting from 0 until we find a level with only 1 node (the root)
  let height = 0;
  let levelSize = leafCount;
  while (levelSize > 1) {
    levelSize = Math.ceil(levelSize / 2);
    height++;
  }

  const path: Array<{ hash: string; direction: 'left' | 'right' }> = [];
  let currentIndex = leafIndex;
  let nodesAtLevel = leafCount;

  for (let level = 0; level < height; level++) {
    const isRight = currentIndex % 2 === 1;
    const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < nodesAtLevel) {
      const siblingHash = await storage.getNode(orgId, level, siblingIndex);
      if (siblingHash) {
        path.push({
          hash: siblingHash,
          direction: isRight ? 'left' : 'right',
        });
      }
    } else {
      // No sibling (odd node at end) — duplicated with itself during tree build
      const selfHash = await storage.getNode(orgId, level, currentIndex);
      if (selfHash) {
        path.push({
          hash: selfHash,
          direction: isRight ? 'left' : 'right',
        });
      }
    }

    currentIndex = Math.floor(currentIndex / 2);
    nodesAtLevel = Math.ceil(nodesAtLevel / 2);
  }

  // Get root hash (at the top level)
  const rootHash = await storage.getNode(orgId, height, 0);
  if (!rootHash) return null;

  return {
    root: rootHash,
    path,
    leafIndex,
    treeSize: leafCount,
  };
}

/**
 * Verify an inclusion proof for a given leaf hash.
 */
export function verifyInclusionProof(
  leafHash: string,
  proof: MerkleInclusionProof,
): boolean {
  let currentHash = leafHash;

  for (const step of proof.path) {
    if (step.direction === 'left') {
      currentHash = hashPair(step.hash, currentHash);
    } else {
      currentHash = hashPair(currentHash, step.hash);
    }
  }

  return currentHash === proof.root;
}

/**
 * Get the current root hash for an org's Merkle tree.
 */
export async function getRootHash(
  storage: MerkleStorage,
  orgId: string,
): Promise<string | null> {
  const leafCount = await storage.getLeafCount(orgId);
  if (leafCount === 0) return null;

  let levelSize = leafCount;
  let height = 0;
  while (levelSize > 1) {
    levelSize = Math.ceil(levelSize / 2);
    height++;
  }

  return storage.getNode(orgId, height, 0);
}

// ---------------------------------------------------------------------------
// In-memory storage (for tests)
// ---------------------------------------------------------------------------

export function createInMemoryStorage(): MerkleStorage {
  const nodes = new Map<string, string>();
  const counts = new Map<string, number>();

  return {
    async getNode(orgId, level, position) {
      return nodes.get(`${orgId}:${level}:${position}`) ?? null;
    },
    async putNode(orgId, level, position, hash) {
      nodes.set(`${orgId}:${level}:${position}`, hash);
    },
    async getLeafCount(orgId) {
      return counts.get(orgId) ?? 0;
    },
    async setLeafCount(orgId, count) {
      counts.set(orgId, count);
    },
  };
}
