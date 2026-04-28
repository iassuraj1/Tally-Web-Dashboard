import { useState, useEffect } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import useMaster from '../../../hooks/useMaster';
import api from '../../../utils/api';
import { FiRefreshCw } from 'react-icons/fi';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
const fmt     = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function LedgerReport() {
  const { company } = useCompany();
  const { data: ledgers } = useMaster('ledgers');
  const curYear = new Date().getFullYear();
  const [selLedger, setSelLedger] = useState('');
  const [from, setFrom] = useState(`${curYear}-04-01`);
  const [to,   setTo]   = useState(new Date().toISOString().split('T')[0]);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!company || !selLedger) return;
    setLoading(true);
    api.get(`/companies/${company._id}/reports/ledger/${selLedger}?from=${from}&to=${to}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <select value={selLedger} onChange={e => setSelLedger(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087] min-w-52">
          <option value="">Select Ledger…</option>
          {ledgers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        <span className="text-gray-400">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiRefreshCw size={14} /> Show
        </button>
      </div>

      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-[#003087]">
            <h2 className="font-bold text-white">{data.ledger?.name}</h2>
            <p className="text-blue-200 text-xs">Opening: {fmt(data.ledger?.openingBalance)} {data.ledger?.openingType}</p>
          </div>
          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Date','Voucher Type','Voucher No','Narration','Debit','Credit','Balance'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(data.data || []).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.voucherType}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{r.voucherNo}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{r.narration || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-800">{r.debit ? fmt(r.debit) : ''}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-800">{r.credit ? fmt(r.credit) : ''}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      <span className={r.balanceType === 'Dr' ? 'text-red-600' : 'text-green-600'}>{fmt(r.balance)} {r.balanceType}</span>
                    </td>
                  </tr>
                ))}
                {(!data.data?.length) && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No transactions in this period</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
