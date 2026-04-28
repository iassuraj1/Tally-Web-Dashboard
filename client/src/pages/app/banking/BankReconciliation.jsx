import { useState, useEffect } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import { FiCheckCircle, FiCircle, FiRefreshCw } from 'react-icons/fi';

const fmt     = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function BankReconciliation() {
  const { company } = useCompany();
  const [banks, setBanks]     = useState([]);
  const [selBank, setSelBank] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to,   setTo  ] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!company) return;
    api.get(`/companies/${company._id}/banking/bank-ledgers`).then(r => {
      setBanks(r.data.data || []);
      if (r.data.data?.[0]) setSelBank(r.data.data[0]._id);
    });
  }, [company]);

  const load = () => {
    if (!company || !selBank) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    api.get(`/companies/${company._id}/banking/unreconciled/${selBank}?${params}`)
      .then(r => setEntries(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (selBank) load(); }, [selBank]);

  const reconcile = async (entry) => {
    const bankDate = prompt('Enter bank statement date (YYYY-MM-DD):', entry.date?.split('T')[0]);
    if (!bankDate) return;
    await api.post(`/companies/${company._id}/banking/reconcile`, {
      voucherId: entry._id, bankLedgerId: selBank,
      bankDate, amount: entry.amount, type: entry.type, chequeNo: entry.chequeNo,
    });
    load();
  };

  const unreconcile = async (entry) => {
    if (!entry.reconId) return;
    await api.delete(`/companies/${company._id}/banking/reconcile/${entry.reconId}`);
    load();
  };

  const total  = entries.filter(e => !e.isReconciled).length;
  const doneNo = entries.filter(e => e.isReconciled).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
          <select value={selBank} onChange={e => setSelBank(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087] min-w-52">
            {banks.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 mt-4">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[['Total Entries', entries.length, 'text-[#003087]'], ['Reconciled', doneNo, 'text-green-600'], ['Pending', total, 'text-orange-600']].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-3xl font-bold ${c}`}>{v}</div>
            <div className="text-xs text-gray-400 mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-[#003087]">
          <h3 className="font-bold text-white">Bank Entries</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Status','Date','Voucher','Narration','Dr/Cr','Amount','Bank Date','Action'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${e.isReconciled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      {e.isReconciled
                        ? <FiCheckCircle className="text-green-500" size={18} />
                        : <FiCircle className="text-gray-300" size={18} />}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{e.voucherNo}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{e.narration || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${e.type === 'Dr' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{e.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(e.bankDate)}</td>
                    <td className="px-4 py-3">
                      {e.isReconciled ? (
                        <button onClick={() => unreconcile(e)} className="text-xs px-2 py-1 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Undo</button>
                      ) : (
                        <button onClick={() => reconcile(e)} className="text-xs px-2 py-1 text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">Reconcile</button>
                      )}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No entries found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
