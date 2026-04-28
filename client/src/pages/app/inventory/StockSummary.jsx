import { useState, useEffect } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import { FiRefreshCw } from 'react-icons/fi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function StockSummary() {
  const { company } = useCompany();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!company) return;
    setLoading(true);
    api.get(`/companies/${company._id}/inventory/stock-summary`)
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [company]);

  const filtered = data.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = filtered.reduce((s, r) => s + (r.closingValue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] w-56" />
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <div className="ml-auto text-sm text-gray-500">
          Total Stock Value: <span className="font-bold text-[#003087]">{fmt(totalValue)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]">
          <h3 className="font-bold text-white">Stock Summary</h3>
          <p className="text-blue-200 text-xs">As of today</p>
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading stock data…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Item Name','Unit','Opening Qty','In (Purchases)','Out (Sales)','Closing Qty','Rate','Closing Value'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
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
