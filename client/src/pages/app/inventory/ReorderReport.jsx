import { useCallback, useEffect, useState } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiRefreshCw } from 'react-icons/fi';

export default function ReorderReport() {
  const { company } = useCompany();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!company) return;
    setLoading(true);
    api.get(`/companies/${company._id}/inventory/reorder`)
      .then((res) => setRows(res.data.data || []))
      .finally(() => setLoading(false));
  }, [company]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl"><FiRefreshCw size={14} /> Refresh</button>
        <div className="ml-auto text-sm text-gray-500">Low stock items <span className="font-bold text-red-600">{rows.length}</span></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]"><h3 className="font-bold text-white">Reorder Report</h3></div>
        {loading ? <div className="py-16 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{['Item','Unit','Closing Qty','Reorder Level','Minimum','Maximum','Shortage'].map((h, i) => <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row._id} className="hover:bg-red-50/40">
                  <td className="px-4 py-3 font-semibold">{row.name}</td>
                  <td className="px-4 py-3 text-gray-500">{row.unit}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-red-600">{row.closingQty}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.reorderLevel}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.minimumStock}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.maximumStock}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{row.shortage}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No low stock items</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
