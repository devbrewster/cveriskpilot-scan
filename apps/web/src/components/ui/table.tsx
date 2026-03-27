'use client';

import { useState, useCallback } from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc' | null;
export interface SortState {
  key: string;
  direction: SortDirection;
}

interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onSort?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  sortState?: SortState;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  onSort,
  onRowClick,
  sortState,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  emptyMessage = 'No data found',
}: TableProps<T>) {
  const [_internalSort, _setInternalSort] = useState<SortState>({ key: '', direction: null });
  const currentSort = sortState ?? _internalSort;

  const handleSort = useCallback(
    (key: string) => {
      const newDirection: SortDirection =
        currentSort.key === key
          ? currentSort.direction === 'asc'
            ? 'desc'
            : currentSort.direction === 'desc'
              ? null
              : 'asc'
          : 'asc';
      const newSort = { key, direction: newDirection };
      if (onSort) {
        onSort(newSort);
      } else {
        _setInternalSort(newSort);
      }
    },
    [currentSort, onSort],
  );

  const allSelected =
    selectable && data.length > 0 && getRowId
      ? data.every((row) => selectedIds?.has(getRowId(row)))
      : false;

  const handleSelectAll = useCallback(() => {
    if (!getRowId || !onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => getRowId(row))));
    }
  }, [allSelected, data, getRowId, onSelectionChange]);

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange || !selectedIds) return;
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                }`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-gray-400">
                      {currentSort.key === col.key ? (
                        currentSort.direction === 'asc' ? (
                          <SortAscIcon />
                        ) : currentSort.direction === 'desc' ? (
                          <SortDescIcon />
                        ) : (
                          <SortNeutralIcon />
                        )
                      ) : (
                        <SortNeutralIcon />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const rowId = getRowId ? getRowId(row) : String(idx);
              const isSelected = selectedIds?.has(rowId);
              return (
                <tr
                  key={rowId}
                  className={`${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } ${onRowClick ? 'cursor-pointer hover:bg-primary-50' : 'hover:bg-gray-50'} ${
                    isSelected ? 'bg-primary-50' : ''
                  } transition-colors`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected ?? false}
                        onChange={() => handleSelectRow(rowId)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortAscIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 3l4 5H3l4-5z" />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 11l4-5H3l4 5z" />
    </svg>
  );
}

function SortNeutralIcon() {
  return (
    <svg className="h-3.5 w-3.5 opacity-40" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 3l3 4H4l3-4zM7 11l3-4H4l3 4z" />
    </svg>
  );
}
