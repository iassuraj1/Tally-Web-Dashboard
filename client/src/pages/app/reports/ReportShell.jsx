import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiPrinter, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { COMPANY_NAME, exportCSV, printWindow } from '../../../utils/printExport';

const fmt    = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ReportShell({ title, endpoint, renderContent, getExportData, showDateRange = true, serverExport = false }) {
  const { company } = useCompany();
  const curYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${curYear}-04-01`);
  const [to,   setTo]   = useState(new Date().toISOString().split('T')[0]);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  const buildUrl = useCallback((format) => {
    if (!company) return '';
    const [path, existingQuery = ''] = endpoint.split('?');
    const params = new URLSearchParams(existingQuery);
    if (showDateRange) {
      params.set('from', from);
      params.set('to', to);
    } else {
      params.set('to', to);
    }
    if (format) params.set('format', format);
    const query = params.toString();
    return `/companies/${company._id}/${path}${query ? `?${query}` : ''}`;
  }, [company, endpoint, from, showDateRange, to]);

  const load = useCallback(() => {
    if (!company) return;
    setLoading(true);
    api.get(buildUrl())
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [buildUrl, company]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const subtitle = showDateRange ? `${from} to ${to}` : `As on ${to}`;

  const handlePrint = () => {
    if (!data) return;
    const tableEl = document.getElementById('report-table-content');
    const tableHTML = tableEl ? tableEl.innerHTML : '<p>No data</p>';
    printWindow(title, tableHTML, subtitle);
  };

  const handleExport = () => {
    if (!data || !getExportData) return;
    const { headers, rows, filename } = getExportData(data);
    exportCSV(filename || title.toLowerCase().replace(/\s+/g, '_'), headers, rows, `${title} | ${subtitle}`);
  };

  const handleServerExport = async (format) => {
    if (!company) return;
    const res = await api.get(buildUrl(format), { responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `${title.toLowerCase().replace(/\s+/g, '_')}.${format}`;
    const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Print-only company header (visible only on Ctrl+P) */}
      <div className="print-company-header text-center mb-4 pb-3 border-b-2 border-[#003087]">
        <div className="text-xl font-extrabold text-[#003087]">{COMPANY_NAME}</div>
        <div className="text-sm font-bold mt-1">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 no-print">
        {showDateRange && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">From</span>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">To</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          </>
        )}
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
          <FiPrinter size={14} /> Print
        </button>
        {serverExport && (
          <>
            <button onClick={() => handleServerExport('csv')} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
              <FiDownload size={14} /> CSV
            </button>
            <button onClick={() => handleServerExport('xlsx')} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
              <FiDownload size={14} /> Excel
            </button>
            <button onClick={() => handleServerExport('pdf')} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
              <FiDownload size={14} /> PDF
            </button>
          </>
        )}
        {!serverExport && getExportData && (
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
            <FiDownload size={14} /> CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-[#003087] no-print">
          <h2 className="font-bold text-white">{title}</h2>
          {showDateRange && <p className="text-blue-200 text-xs mt-0.5">{from} to {to}</p>}
          {!showDateRange && <p className="text-blue-200 text-xs mt-0.5">As on {to}</p>}
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Computing report…</div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400">No data</div>
        ) : (
          <div id="report-table-content">
            {renderContent(data, fmt, fmtNum)}
          </div>
        )}
      </div>
    </div>
  );
}
