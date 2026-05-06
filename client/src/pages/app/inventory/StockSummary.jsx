import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiRefreshCw, FiPrinter, FiDownload } from 'react-icons/fi';
import { COMPANY_NAME, exportCSV, printWindow } from '../../../utils/printExport';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function StockSummary() {
  const { company } = useCompany();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(() => {
    if (!company) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/companies/${company._id}/inventory/stock-summary`)
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, [company]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const filtered   = data.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = filtered.reduce((s, r) => s + (r.closingValue || 0), 0);

  const handlePrint = () => {
    const headers = ['Item Name', 'Unit', 'Opening Qty', 'In (Purchases)', 'Out (Sales)', 'Closing Qty', 'Rate', 'Closing Value'];
    const tableHTML = `<table>
      <thead><tr>${headers.map((h, i) => `<th${i > 1 ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead>
      <tbody>${filtered.map(r => `<tr>
        <td>${r.name}</td>
        <td>${r.unit}</td>
        <td class="r">${r.openingQty}</td>
        <td class="r">${r.inQty}</td>
        <td class="r">${r.outQty}</td>
        <td class="r" style="font-weight:600;${r.closingQty < 0 ? 'color:#dc2626' : ''}">${r.closingQty}</td>
        <td class="r">${fmt(r.rate)}</td>
        <td class="r">${fmt(r.closingValue)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td colspan="7">Total Closing Stock Value</td>
        <td class="r">${fmt(totalValue)}</td>
      </tr></tfoot>
    </table>`;
    printWindow('Stock Summary', tableHTML, `As of ${new Date().toLocaleDateString('en-IN')}`);
  };

  const handleExport = () => {
    const headers = ['Item Name', 'Unit', 'Opening Qty', 'In (Purchases)', 'Out (Sales)', 'Closing Qty', 'Rate (₹)', 'Closing Value (₹)'];
    const rows = filtered.map(r => [
      r.name, r.unit, r.openingQty, r.inQty, r.outQty,
      r.closingQty, Number(r.rate || 0).toFixed(2), Number(r.closingValue || 0).toFixed(2),
    ]);
    rows.push(['', '', '', '', '', 'Total', '', Number(totalValue).toFixed(2)]);
    exportCSV('stock_summary', headers, rows, 'Stock Summary');
  };

  return (
    <div className="space-y-4">
      {/* Print-only header */}
      <div className="print-company-header text-center pb-3 border-b-2 border-[#003087]">
        <div className="text-xl font-extrabold text-[#003087]">{COMPANY_NAME}</div>
        <div className="text-sm font-bold mt-1">Stock Summary</div>
        <div className="text-xs text-gray-500">As of {new Date().toLocaleDateString('en-IN')}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 no-print">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] w-56" />
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
          <FiPrinter size={14} /> Print
        </button>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
          <FiDownload size={14} /> Excel
        </button>
        <div className="ml-auto text-sm text-gray-500">
          Total Stock Value: <span className="font-bold text-[#003087]">{fmt(totalValue)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087] no-print">
          <h3 className="font-bold text-white">Stock Summary</h3>
          <p className="text-blue-200 text-xs">As of today · {filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading stock data…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Item Name', 'Unit', 'Opening Qty', 'In (Purchases)', 'Out (Sales)', 'Closing Qty', 'Rate', 'Closing Value'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${r.closingQty < 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-5 py-3 text-gray-500">{r.unit}</td>
                    <td className="px-5 py-3 text-right font-mono">{r.openingQty}</td>
                    <td className="px-5 py-3 text-right font-mono text-green-600">{r.inQty}</td>
                    <td className="px-5 py-3 text-right font-mono text-red-500">{r.outQty}</td>
                    <td className={`px-5 py-3 text-right font-mono font-bold ${r.closingQty < 0 ? 'text-red-600' : 'text-gray-900'}`}>{r.closingQty}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-600">{fmt(r.rate)}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-[#003087]">{fmt(r.closingValue)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No stock items found</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td colSpan={7} className="px-5 py-3 text-sm">Total Closing Stock Value</td>
                    <td className="px-5 py-3 text-right font-mono text-[#003087]">{fmt(totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
