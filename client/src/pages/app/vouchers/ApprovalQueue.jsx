import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const voucherPath = { Sales:'sales', Purchase:'purchase', Payment:'payment', Receipt:'receipt', Journal:'journal', Contra:'contra', CreditNote:'credit-note', DebitNote:'debit-note', StockJournal:'stock-journal', DeliveryNote:'sales', ReceiptNote:'purchase' };

export default function ApprovalQueue() {
  const { company } = useCompany();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const res = await api.get(`/companies/${company._id}/vouchers/approval-queue`);
      setRows(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const decide = async (voucher, action) => {
    const reason = action === 'reject' ? prompt('Reason for rejection:') : '';
    if (action === 'reject' && reason === null) return;
    await api.patch(`/companies/${company._id}/vouchers/${voucher._id}/approval`, { action, reason });
    setMessage(`${voucher.voucherNo} ${action === 'approve' ? 'approved' : 'rejected'}.`);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <div className="text-sm text-gray-500">{rows.length} voucher{rows.length === 1 ? '' : 's'} waiting for approval</div>
        {message && <div className="text-sm text-green-600">{message}</div>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]">
          <h3 className="font-bold text-white">Approval Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Date', 'Voucher', 'Type', 'Party', 'Amount', 'Submitted By', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : rows.map((voucher) => (
                <tr key={voucher._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(voucher.date)}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Link to={`/app/vouchers/${voucherPath[voucher.voucherType] || 'sales'}?edit=${voucher._id}`} className="text-[#003087] hover:underline">
                      {voucher.voucherNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{voucher.voucherType}</td>
                  <td className="px-4 py-3">{voucher.party?.name || voucher.narration || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(voucher.total)}</td>
                  <td className="px-4 py-3">{voucher.submittedBy?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => decide(voucher, 'approve')} className="flex items-center gap-1 px-2 py-1 text-xs border border-green-600 text-green-700 rounded-lg">
                        <FiCheckCircle size={12} /> Approve
                      </button>
                      <button onClick={() => decide(voucher, 'reject')} className="flex items-center gap-1 px-2 py-1 text-xs border border-red-500 text-red-600 rounded-lg">
                        <FiXCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No vouchers awaiting approval</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
