import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiDownload, FiEye, FiXCircle, FiPlus } from 'react-icons/fi';

const fmt     = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const TYPES = ['Sales','Purchase','Payment','Receipt','Journal','Contra','CreditNote','DebitNote','StockJournal','DeliveryNote','ReceiptNote'];
const typeColor = { Sales:'bg-green-100 text-green-700', Purchase:'bg-blue-100 text-blue-700', Payment:'bg-red-100 text-red-700', Receipt:'bg-yellow-100 text-yellow-700', Journal:'bg-gray-100 text-gray-600', Contra:'bg-purple-100 text-purple-700', CreditNote:'bg-orange-100 text-orange-700', DebitNote:'bg-pink-100 text-pink-700', StockJournal:'bg-cyan-100 text-cyan-700', DeliveryNote:'bg-emerald-100 text-emerald-700', ReceiptNote:'bg-indigo-100 text-indigo-700' };
const voucherPath = { Sales:'sales', Purchase:'purchase', Payment:'payment', Receipt:'receipt', Journal:'journal', Contra:'contra', CreditNote:'credit-note', DebitNote:'debit-note', StockJournal:'stock-journal', DeliveryNote:'sales', ReceiptNote:'purchase' };
const eInvoiceTypes = new Set(['Sales', 'Purchase', 'CreditNote', 'DebitNote']);

export default function VoucherList() {
  const { company } = useCompany();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const load = () => {
    if (!company) return;
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom)   params.set('from', dateFrom);
    if (dateTo)     params.set('to',   dateTo);
    if (includeCancelled) params.set('includeCancelled', 'true');
    params.set('limit', '500');
    api.get(`/companies/${company._id}/vouchers?${params}`).then(r => setVouchers(r.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(load, [company, typeFilter, statusFilter, dateFrom, dateTo, includeCancelled]);

  const cancel = async (v) => {
    const reason = prompt('Reason for cancellation:');
    if (reason === null) return;
    await api.patch(`/companies/${company._id}/vouchers/${v._id}/cancel`, { reason });
    load();
  };

  const downloadEInvoiceJson = async (v) => {
    const res = await api.get(`/companies/${company._id}/gst/einvoice/${v._id}.json`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `einvoice_${v.voucherNo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">All Vouchers</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none">
            <option value="">All Statuses</option>
            {['Draft', 'Submitted', 'Approved', 'Rejected'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input data-shortcut-date type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none" />
          <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600">
            <input type="checkbox" checked={includeCancelled} onChange={e => setIncludeCancelled(e.target.checked)} />
            Cancelled
          </label>
          <Link to="/app/vouchers/sales" className="flex items-center gap-1.5 px-3 py-2 bg-[#003087] text-white text-xs font-semibold rounded-xl hover:bg-blue-800">
            <FiPlus size={13} /> New
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading vouchers…</div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No vouchers found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Type','Voucher No','Date','Party / Narration','Amount','Approval','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vouchers.map(v => (
                <tr key={v._id} className={`hover:bg-gray-50 ${v.isCancelled ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor[v.voucherType] || 'bg-gray-100'}`}>{v.voucherType}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{v.voucherNo}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(v.date)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{v.party?.name || v.narration || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmt(v.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      v.status === 'Approved' ? 'bg-green-100 text-green-700'
                        : v.status === 'Rejected' ? 'bg-red-100 text-red-600'
                          : v.status === 'Draft' ? 'bg-gray-100 text-gray-600'
                            : 'bg-orange-100 text-orange-700'
                    }`}>{v.status || 'Submitted'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {v.isCancelled
                      ? <span className="text-xs text-red-500 font-medium">Cancelled</span>
                      : <span className="text-xs text-green-600 font-medium">Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/app/vouchers/${voucherPath[v.voucherType]}?edit=${v._id}`} className="p-1.5 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg">
                        <FiEye size={14} />
                      </Link>
                      {v.voucherType === 'Sales' && (
                        <Link to={`/app/invoice-print/${v._id}`} className="px-2 py-1 text-xs text-gray-500 hover:text-[#003087] hover:bg-blue-50 rounded-lg">
                          Print
                        </Link>
                      )}
                      {eInvoiceTypes.has(v.voucherType) && (
                        <button onClick={() => downloadEInvoiceJson(v)} title="Export e-invoice JSON" className="p-1.5 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg">
                          <FiDownload size={14} />
                        </button>
                      )}
                      {!v.isCancelled && (
                        <button onClick={() => cancel(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <FiXCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">{vouchers.length} vouchers</div>
    </div>
  );
}
