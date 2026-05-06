import { useCallback, useEffect, useState } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiRefreshCw } from 'react-icons/fi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

export default function BatchExpiryReport({ mode = 'batch' }) {
  const { company } = useCompany();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const title = mode === 'expiry' ? 'Expiry Report' : 'Batch Stock Report';

  const load = useCallback(() => {
    if (!company) return;
    setLoading(true);
    const endpoint = mode === 'expiry' ? `expiry-report?days=${days}` : 'batch-report';
    api.get(`/companies/${company._id}/inventory/${endpoint}`)
      .then((res) => setRows(res.data.data || []))
      .finally(() => setLoading(false));
  }, [company, mode, days]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {mode === 'expiry' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expiring within days</label>
            <input type="number" value={days} onChange={(e) => setDays(+e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm w-32" />
          </div>
        )}
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl"><FiRefreshCw size={14} /> Refresh</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]"><h3 className="font-bold text-white">{title}</h3></div>
        {loading ? <div className="py-16 text-center text-gray-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Item','Batch','Expiry','In','Out','Closing','Serial Numbers'].map((h, i) => <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 ${i > 2 && i < 6 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                  <tr key={`${row.itemId}-${row.batchNo}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{row.item}</td>
                    <td className="px-4 py-3">{row.batchNo}</td>
                    <td className="px-4 py-3">{fmtDate(row.expiry)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{row.inQty}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">{row.outQty}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{row.closingQty}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{row.serialNumbers?.join(', ') || '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
