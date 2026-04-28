import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';

const fmt    = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ReportShell({ title, endpoint, renderContent, showDateRange = true }) {
  const { company } = useCompany();
  const curYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${curYear}-04-01`);
  const [to,   setTo]   = useState(new Date().toISOString().split('T')[0]);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!company) return;
    setLoading(true);
    const params = showDateRange ? `?from=${from}&to=${to}` : `?to=${to}`;
    api.get(`/companies/${company._id}/${endpoint}${params}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [company, from, to, endpoint, showDateRange]);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
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
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 text-gray-600 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">
          <FiDownload size={14} /> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-[#003087]">
          <h2 className="font-bold text-white">{title}</h2>
          {showDateRange && <p className="text-blue-200 text-xs mt-0.5">{from} to {to}</p>}
          {!showDateRange && <p className="text-blue-200 text-xs mt-0.5">As on {to}</p>}
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Computing report…</div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400">No data</div>
        ) : (
          renderContent(data, fmt, fmtNum)
        )}
      </div>
    </div>
  );
}
