import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiSend } from 'react-icons/fi';
import Modal from '../../../components/app/Modal';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]';

const statusClass = {
  draft: 'bg-blue-50 text-blue-700 border-blue-100',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-100',
  sent: 'bg-green-50 text-green-700 border-green-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-100',
};

export default function PaymentReminders() {
  const { company } = useCompany();
  const [type, setType] = useState('receivable');
  const [status, setStatus] = useState('all');
  const [includeUpcoming, setIncludeUpcoming] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '', dueDate: '', status: 'draft' });

  const load = useCallback(async () => {
    if (!company) return;
    const params = new URLSearchParams({ reminderType: type });
    if (status !== 'all') params.set('status', status);
    const res = await api.get(`/companies/${company._id}/banking/payment-reminders?${params}`);
    setRows(res.data.data || []);
  }, [company, status, type]);

  useEffect(() => {
    if (company) queueMicrotask(load);
  }, [company, load]);

  const totals = useMemo(() => ({
    total: rows.length,
    due: rows.filter((row) => new Date(row.dueDate) <= new Date() && row.status !== 'sent').length,
    sent: rows.filter((row) => row.status === 'sent').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  }), [rows]);

  const generate = async () => {
    const res = await api.post(`/companies/${company._id}/banking/payment-reminders/generate`, { type, includeUpcoming });
    setMessage(`Generated or updated ${res.data.data?.length || 0} reminder(s).`);
    await load();
  };

  const openEdit = (row) => {
    setSelected(row);
    setForm({
      subject: row.subject || '',
      message: row.message || '',
      dueDate: row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : '',
      status: row.status || 'draft',
    });
  };

  const save = async () => {
    const res = await api.put(`/companies/${company._id}/banking/payment-reminders/${selected._id}`, form);
    setSelected(res.data.data);
    setMessage('Reminder template updated.');
    await load();
  };

  const send = async (row = selected) => {
    try {
      const payload = row?._id === selected?._id ? { subject: form.subject, message: form.message } : {};
      const res = await api.post(`/companies/${company._id}/banking/payment-reminders/${row._id}/send`, payload);
      setMessage(res.data.message || 'Reminder sent');
      setSelected(null);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not send reminder');
      if (selected) await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reminder Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="receivable">Receivables</option>
              <option value="payable">Payables</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2 border border-gray-200 rounded-xl">
            <input type="checkbox" checked={includeUpcoming} onChange={(e) => setIncludeUpcoming(e.target.checked)} />
            Include upcoming
          </label>
          <button onClick={generate} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl">
            <FiRefreshCw size={14} /> Generate Reminders
          </button>
          <button onClick={load} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl">Refresh</button>
        </div>
        {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total', totals.total, 'text-[#003087]'],
          ['Due Now', totals.due, 'text-orange-600'],
          ['Sent', totals.sent, 'text-green-600'],
          ['Failed', totals.failed, 'text-red-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]"><h3 className="font-bold text-white">Payment Reminders</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Party', 'Voucher', 'Due Date', 'Amount', 'Status', 'Last Sent', 'History', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const overdue = new Date(row.dueDate) <= new Date() && row.status !== 'sent';
                return (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{row.party?.name}<div className="text-xs text-gray-400">{row.party?.email || 'No email'}</div></td>
                    <td className="px-4 py-3">{row.voucher?.voucherNo || '-'}<div className="text-xs text-gray-400">{row.voucher?.voucherType || ''}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(row.dueDate)}{overdue && <div className="text-xs text-orange-600">Due now</div>}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(row.amount)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full border ${statusClass[row.status] || statusClass.draft}`}>{row.status}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(row.lastSentAt)}</td>
                    <td className="px-4 py-3">{row.history?.length || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(row)} className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg"><FiEdit2 size={12} /> Edit</button>
                        <button onClick={() => send(row)} className="flex items-center gap-1 px-2 py-1 text-xs border border-[#003087] text-[#003087] rounded-lg"><FiSend size={12} /> Send</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-400">No reminders generated</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Reminder Template" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-gray-400">Party</div><div className="font-semibold">{selected.party?.name}</div></div>
              <div><div className="text-xs text-gray-400">Voucher</div><div className="font-semibold">{selected.voucher?.voucherNo || '-'}</div></div>
              <div><div className="text-xs text-gray-400">Amount</div><div className="font-semibold">{fmt(selected.amount)}</div></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((x) => ({ ...x, dueDate: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))} className={inputClass}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Subject</label>
              <input value={form.subject} onChange={(e) => setForm((x) => ({ ...x, subject: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Message</label>
              <textarea value={form.message} onChange={(e) => setForm((x) => ({ ...x, message: e.target.value }))} rows={7} className={inputClass} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={save} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm">Save</button>
              <button onClick={() => send(selected)} className="px-4 py-2 bg-[#003087] text-white rounded-xl text-sm font-semibold">Send Email</button>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-500">Reminder History</div>
              {(selected.history || []).length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">No sends yet</div>
              ) : (
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {selected.history.map((item, index) => (
                      <tr key={`${item.sentAt}-${index}`}>
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(item.sentAt)}</td>
                        <td className="px-4 py-2">{item.to}</td>
                        <td className="px-4 py-2">{item.subject}</td>
                        <td className="px-4 py-2">{item.status}</td>
                        <td className="px-4 py-2 text-red-500">{item.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
