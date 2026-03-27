/**
 * @cveriskpilot/db-scale — Generic cursor-based pagination.
 *
 * Replaces offset-based pagination for large datasets with O(1) page-seek
 * using composite cursors encoded as base64 strings.
 */

import type {
  CursorColumn,
  CursorPage,
  CursorPaginationParams,
  PageInfo,
} from './types';

// ---------------------------------------------------------------------------
// Cursor encoding / decoding
// ---------------------------------------------------------------------------

/**
 * Encodes a record of column values into a base64 cursor string.
 *
 * Example: { createdAt: '2025-01-01T00:00:00Z', id: 'abc' } ->
 *   base64('{"createdAt":"2025-01-01T00:00:00Z","id":"abc"}')
 */
export function encodeCursor(values: Record<string, unknown>): string {
  const json = JSON.stringify(values);
  // Works in both Node (Buffer) and Edge (btoa)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64url');
  }
  return btoa(json);
}

/**
 * Decodes a base64 cursor string back into column values.
 */
export function decodeCursor(cursor: string): Record<string, unknown> {
  let json: string;
  if (typeof Buffer !== 'undefined') {
    json = Buffer.from(cursor, 'base64url').toString('utf-8');
  } else {
    json = atob(cursor);
  }

  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid cursor: expected a JSON object');
  }
  return parsed as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Prisma query builder
// ---------------------------------------------------------------------------

export interface CursorQueryResult {
  /** Prisma `where` clause fragment for cursor filtering */
  where: Record<string, unknown>;
  /** Prisma `orderBy` array */
  orderBy: Record<string, 'asc' | 'desc'>[];
  /** Number of rows to fetch (take + 1 for hasMore detection) */
  take: number;
}

/**
 * Builds a Prisma-compatible query object for cursor-based pagination.
 *
 * For multi-column cursors (e.g. createdAt + id) the generated WHERE uses
 * a tuple-style comparison that works correctly with composite ordering:
 *
 *   WHERE (createdAt < cursorDate)
 *      OR (createdAt = cursorDate AND id < cursorId)
 *
 * This avoids the common pitfall of simple AND conditions which skip rows
 * when the leading sort column has duplicate values.
 */
export function buildCursorQuery(params: CursorPaginationParams): CursorQueryResult {
  const { cursor, direction, take, cursorColumns } = params;

  if (cursorColumns.length === 0) {
    throw new Error('At least one cursor column is required');
  }

  // Build orderBy — when paginating backward we reverse the sort temporarily,
  // then flip the result set back in the application layer.
  const isBackward = direction === 'backward';
  const orderBy = cursorColumns.map((col) => ({
    [col.field]: isBackward ? flipOrder(col.order) : col.order,
  }));

  // If no cursor is provided, this is the first page — no WHERE filter needed
  if (!cursor) {
    return {
      where: {},
      orderBy,
      take: take + 1, // fetch one extra to detect hasMore
    };
  }

  const cursorValues = decodeCursor(cursor);

  // Build the tuple-comparison WHERE clause
  const where = buildTupleComparison(cursorColumns, cursorValues, isBackward);

  return {
    where,
    orderBy,
    take: take + 1,
  };
}

/**
 * Builds a tuple-style comparison for multi-column cursors.
 *
 * For columns [A, B, C] going forward (descending):
 *   (A < cursorA)
 *   OR (A = cursorA AND B < cursorB)
 *   OR (A = cursorA AND B = cursorB AND C < cursorC)
 */
function buildTupleComparison(
  columns: CursorColumn[],
  values: Record<string, unknown>,
  isBackward: boolean,
): Record<string, unknown> {
  const orConditions: Record<string, unknown>[] = [];

  for (let i = 0; i < columns.length; i++) {
    const condition: Record<string, unknown> = {};

    // All preceding columns must be equal
    for (let j = 0; j < i; j++) {
      const col = columns[j]!;
      condition[col.field] = values[col.field];
    }

    // The i-th column uses a comparison operator
    const col = columns[i]!;
    const effectiveOrder = isBackward ? flipOrder(col.order) : col.order;
    const op = effectiveOrder === 'desc' ? 'lt' : 'gt';
    condition[col.field] = { [op]: values[col.field] };

    orConditions.push(condition);
  }

  if (orConditions.length === 1) {
    return orConditions[0]!;
  }

  return { OR: orConditions };
}

function flipOrder(order: 'asc' | 'desc'): 'asc' | 'desc' {
  return order === 'asc' ? 'desc' : 'asc';
}

// ---------------------------------------------------------------------------
// CursorPaginator class
// ---------------------------------------------------------------------------

/**
 * Generic cursor-based paginator.
 *
 * Usage:
 * ```ts
 * const paginator = new CursorPaginator({
 *   cursorColumns: [
 *     { field: 'createdAt', order: 'desc' },
 *     { field: 'id', order: 'desc' },
 *   ],
 *   defaultPageSize: 25,
 *   maxPageSize: 100,
 * });
 *
 * const { where, orderBy, take } = paginator.buildQuery({ cursor, direction: 'forward', take: 25 });
 * const rows = await prisma.model.findMany({ where: { ...baseWhere, ...where }, orderBy, take });
 * const page = paginator.buildPage(rows, 25, cursor, 'forward');
 * ```
 */
export class CursorPaginator<T extends Record<string, unknown>> {
  private cursorColumns: CursorColumn[];
  private defaultPageSize: number;
  private maxPageSize: number;

  constructor(opts: {
    cursorColumns: CursorColumn[];
    defaultPageSize?: number;
    maxPageSize?: number;
  }) {
    if (opts.cursorColumns.length === 0) {
      throw new Error('At least one cursor column is required');
    }
    this.cursorColumns = opts.cursorColumns;
    this.defaultPageSize = opts.defaultPageSize ?? 25;
    this.maxPageSize = opts.maxPageSize ?? 100;
  }

  /** Normalizes and clamps the requested page size. */
  normalizePageSize(requested?: number): number {
    if (!requested || requested < 1) return this.defaultPageSize;
    return Math.min(requested, this.maxPageSize);
  }

  /** Builds the Prisma query params for a page. */
  buildQuery(params: {
    cursor?: string;
    direction?: 'forward' | 'backward';
    take?: number;
  }): CursorQueryResult {
    const take = this.normalizePageSize(params.take);
    return buildCursorQuery({
      cursor: params.cursor,
      direction: params.direction ?? 'forward',
      take,
      cursorColumns: this.cursorColumns,
    });
  }

  /**
   * Given the raw fetched rows (which include the extra +1 sentinel),
   * builds a CursorPage with proper PageInfo.
   */
  buildPage(
    rows: T[],
    requestedTake: number,
    cursor: string | undefined,
    direction: 'forward' | 'backward',
  ): CursorPage<T> {
    const take = this.normalizePageSize(requestedTake);
    const isBackward = direction === 'backward';

    // We fetched take+1; if we got more than `take` rows there are more pages
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : [...rows];

    // When paginating backward we reversed the sort, so flip items back
    if (isBackward) {
      items.reverse();
    }

    const startCursor = items.length > 0 ? this.cursorFromRow(items[0]!) : null;
    const endCursor = items.length > 0 ? this.cursorFromRow(items[items.length - 1]!) : null;

    const pageInfo: PageInfo = {
      hasNextPage: isBackward ? !!cursor : hasMore,
      hasPreviousPage: isBackward ? hasMore : !!cursor,
      startCursor,
      endCursor,
    };

    return { items, pageInfo };
  }

  /** Extracts cursor column values from a row and encodes them. */
  cursorFromRow(row: T): string {
    const values: Record<string, unknown> = {};
    for (const col of this.cursorColumns) {
      values[col.field] = row[col.field];
    }
    return encodeCursor(values);
  }
}
