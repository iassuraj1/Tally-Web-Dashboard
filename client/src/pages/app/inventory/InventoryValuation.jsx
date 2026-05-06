import { useCallback, useEffect, useState } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiRefreshCw, FiSave } from 'react-icons/fi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function InventoryValuation() {
  const { company } = useCompany();
  const [method, setMethod] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback((snapshot = false) => {
    if (!company) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (asOf) params.set('to', asOf);
    if (snapshot) params.set('snapshot', 'true');
    api.get(`/companies/${company._id}/inventory/valuation?${params}`)
      .then((res) => setRows(res.data.data || []))
      .finally(() => setLoading(false));
  }, [company, method, asOf]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const total = rows.reduce((sum, row) => sum + Number(row.closingValue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valuation Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">Item default</option>
            <option>FIFO</option>
            <option>Weighted Average</option>
            <option>Standard Cost</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">As Of</label>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
        <button onClick={() => load(false)} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl"><FiRefreshCw size={14} /> Refresh</button>
        <button onClick={() => load(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl"><FiSave size={14} /> Save Snapshot</button>
        <div className="ml-auto text-sm text-gray-500">Total Value <span className="font-bold text-[#003087]">{fmt(total)}</span></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]">
          <h3 className="font-bold text-white">Inventory Valuation</h3>
        </div>
        {loading ? <div className="py-16 text-center text-gray-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Item','Method','Opening','In','Out','Closing Qty','Rate','Value'].map((h, i) => <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.name}<div className="text-xs text-gray-400">{row.unit}</div></td>
                    <td className="px-4 py-3 text-gray-600">{row.valuationMethod}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.openingQty}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{row.inQty}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">{row.outQty}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{row.closingQty}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(row.closingRate)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003087]">{fmt(row.closingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
