import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data records found',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-xs font-semibold text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 shadow-3d-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/95 shadow-3d-md">
      <table className="w-full text-left text-xs text-slate-100 border-collapse">
        <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 sticky top-0 z-10">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-medium">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors hover:bg-slate-800/70 text-slate-100 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, cIndex) => (
                <td key={cIndex} className={`px-4 py-3.5 align-middle ${col.className || ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : (item[col.accessor] as unknown as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
