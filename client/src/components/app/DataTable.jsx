import { useState } from 'react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiLoader, FiPrinter, FiDownload } from 'react-icons/fi';
import { exportCSV, printWindow } from '../../utils/printExport';

function getDisplayValue(col, val, row) {
  if (!col.render) return val ?? '';
  const rendered = col.render(val, row);
  return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : (val ?? '');
}

export default function DataTable({
  title, columns, data, loading, onAdd, onEdit, onDelete,
  searchKey = 'name', addLabel = 'Add New',
  showPrint = true, showExport = true,
}) {
  const [search, setSearch] = useState('');

  const filtered = data.filter((row) => {
    const val = searchKey.split('.').reduce((o, k) => o?.[k], row) || '';
    return val.toString().toLowerCase().includes(search.toLowerCase());
  });

  const handlePrint = () => {
    const headers = columns.map(c => c.label);
    const tableHTML = `<table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${filtered.map(row => `<tr>${columns.map(col => {
        const val = col.key.split('.').reduce((o, k) => o?.[k], row);
        return `<td>${getDisplayValue(col, val, row)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>`;
    printWindow(title, tableHTML);
  };

  const handleExport = () => {
    const headers = columns.map(c => c.label);
    const rows = filtered.map(row =>
      columns.map(col => {
        const val = col.key.split('.').reduce((o, k) => o?.[k], row);
        return getDisplayValue(col, val, row);
      })
    );
    exportCSV(title.toLowerCase().replace(/\s+/g, '_'), headers, rows, title);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003087] w-40"
            />
          </div>
          {showPrint && data.length > 0 && (
            <button onClick={handlePrint} title="Print" className="p-2 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg transition-colors no-print">
              <FiPrinter size={15} />
            </button>
          )}
          {showExport && data.length > 0 && (
            <button onClick={handleExport} title="Export to Excel" className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors no-print">
              <FiDownload size={15} />
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#003087] text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              <FiPlus size={14} /> {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <FiLoader className="animate-spin mr-2" size={20} /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">{search ? 'No results found' : 'No records yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide no-print">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((row, i) => (
                <tr key={row._id || i} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => {
                    const val = col.key.split('.').reduce((o, k) => o?.[k], row);
                    return (
                      <td key={col.key} className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {col.render ? col.render(val, row) : (val ?? '—')}
                      </td>
                    );
                  })}
                  {(onEdit || onDelete) && (
                    <td className="px-5 py-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg transition-colors">
                            <FiEdit2 size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(row)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400 no-print">
        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        {search && data.length !== filtered.length && ` (filtered from ${data.length})`}
      </div>
    </div>
  );
}
