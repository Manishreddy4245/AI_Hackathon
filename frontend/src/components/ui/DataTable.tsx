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
      <div className="py-12 text-center text-xs font-semibold text-[#94A3B8] bg-[#101D31] rounded-2xl border border-[#243650] shadow-3d-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#243650] bg-[#101D31] shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
        <thead className="bg-[#14243B] text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1] border-b border-[#243650] sticky top-0 z-10">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#243650] font-medium">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors hover:bg-[#14243B] text-[#F8FAFC] ${onRowClick ? 'cursor-pointer' : ''}`}
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
