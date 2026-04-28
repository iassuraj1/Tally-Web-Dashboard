import { useState, useEffect } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import { FiRefreshCw } from 'react-icons/fi';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
const fmt     = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';
const typeColor = { Sales:'bg-green-100 text-green-700', Purchase:'bg-blue-100 text-blue-700', Payment:'bg-red-100 text-red-700', Receipt:'bg-yellow-100 text-yellow-700', Journal:'bg-gray-100 text-gray-600', Contra:'bg-purple-100 text-purple-700' };

export default function DayBook() {
  const { company } = useCompany();
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to,   setTo]   = useState(today);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!company) return;
    setLoading(true);
    api.get(`/companies/${company._id}/reports/daybook?from=${from}&to=${to}`)
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [company]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        <span className="text-gray-400">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiRefreshCw size={14} /> Show
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]">
          <h2 className="font-bold text-white">Day Book</h2>
          <p className="text-blue-200 text-xs">{from} to {to}</p>
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No vouchers for selected period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{['Date','Type','Voucher No','Party / Narration','Entries','Total'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(v => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDate(v.date)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor[v.voucherType] || 'bg-gray-100 text-gray-600'}`}>{v.voucherType}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-800">{v.voucherNo}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{v.party?.name || v.narration || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{v.entries?.map(e => `${e.ledger?.name} ${e.type} ₹${e.amount}`).join('; ')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmt(v.total)}</td>
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
