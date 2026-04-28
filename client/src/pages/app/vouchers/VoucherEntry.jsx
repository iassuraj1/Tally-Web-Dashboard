import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import { FiPlus, FiTrash2, FiSave, FiPrinter } from 'react-icons/fi';

const fmt = (n) => Number(n || 0).toFixed(2);

// Which voucher types have stock items
const HAS_ITEMS = ['Sales', 'Purchase', 'StockJournal', 'DeliveryNote', 'ReceiptNote'];
// Which types have a single party + entries
const HAS_PARTY = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];

const GST_RATES = [0, 5, 12, 18, 28];

export default function VoucherEntry({ voucherType }) {
  const { company }   = useCompany();
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const editId         = sp.get('edit');

  const [ledgers, setLedgers]   = useState([]);
  const [items, setItems]       = useState([]);
  const [units, setUnits]       = useState([]);
  const [godowns, setGodowns]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const emptyEntry = { ledger: '', type: 'Dr', amount: 0, narration: '' };
  const emptyItem  = { item: '', qty: 1, unit: '', rate: 0, amount: 0, discount: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, hsnCode: '', godown: '' };

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    reference: '',
    narration: '',
    party: '',
    placeOfSupply: company?.state || '',
    isIGST: false,
    reverseCharge: false,
    entries: [{ ...emptyEntry, type: 'Dr' }, { ...emptyEntry, type: 'Cr' }],
    items: [],
    roundOff: 0,
  });

  const cid = company?._id;

  useEffect(() => {
    if (!cid) return;
    Promise.all([
      api.get(`/companies/${cid}/ledgers`),
      api.get(`/companies/${cid}/inventory/items`),
      api.get(`/companies/${cid}/inventory/units`),
      api.get(`/companies/${cid}/inventory/godowns`),
    ]).then(([l, i, u, g]) => {
      setLedgers(l.data.data || []);
      setItems(i.data.data   || []);
      setUnits(u.data.data   || []);
      setGodowns(g.data.data || []);
    });

    if (editId) {
      setLoading(true);
      api.get(`/companies/${cid}/vouchers/${editId}`).then(r => {
        const v = r.data.data;
        setForm({
          date: v.date?.split('T')[0], voucherNo: v.voucherNo, reference: v.reference || '',
          narration: v.narration || '', party: v.party?._id || '',
          placeOfSupply: v.placeOfSupply || '', isIGST: v.isIGST, reverseCharge: v.reverseCharge,
          entries: v.entries.map(e => ({ ledger: e.ledger?._id || e.ledger, type: e.type, amount: e.amount, narration: e.narration || '' })),
          items:   v.items.map(i => ({ item: i.item?._id || i.item, qty: i.qty, unit: i.unit?._id || i.unit || '', rate: i.rate, amount: i.amount, discount: i.discount || 0, gstRate: i.gstRate, cgst: i.cgst, sgst: i.sgst, igst: i.igst, hsnCode: i.hsnCode || '', godown: i.godown?._id || '' })),
          roundOff: v.roundOff || 0,
        });
      }).finally(() => setLoading(false));
    } else if (HAS_ITEMS.includes(voucherType)) {
      setForm(f => ({ ...f, items: [{ ...emptyItem }], entries: [emptyEntry] }));
    }
  }, [cid, editId, voucherType]);

  // Recalculate item amounts + GST
  const updateItem = (idx, key, value) => {
    setForm(f => {
      const newItems = [...f.items];
      newItems[idx] = { ...newItems[idx], [key]: value };
      const it = newItems[idx];
      const base   = Number(it.qty) * Number(it.rate) - Number(it.discount || 0);
      const gRate  = Number(it.gstRate) / 100;
      if (f.isIGST) { newItems[idx] = { ...newItems[idx], amount: base, igst: base * gRate, cgst: 0, sgst: 0 }; }
      else           { newItems[idx] = { ...newItems[idx], amount: base, cgst: base * gRate / 2, sgst: base * gRate / 2, igst: 0 }; }
      return { ...f, items: newItems };
    });
  };

  const addEntry = () => setForm(f => ({ ...f, entries: [...f.entries, { ...emptyEntry }] }));
  const removeEntry = (i) => setForm(f => ({ ...f, entries: f.entries.filter((_, idx) => idx !== i) }));
  const updateEntry = (i, key, val) => setForm(f => { const e = [...f.entries]; e[i] = { ...e[i], [key]: key === 'amount' ? +val : val }; return { ...f, entries: e }; });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const totals = {
    subtotal: form.items.reduce((s, i) => s + Number(i.amount || 0), 0),
    cgst:     form.items.reduce((s, i) => s + Number(i.cgst   || 0), 0),
    sgst:     form.items.reduce((s, i) => s + Number(i.sgst   || 0), 0),
    igst:     form.items.reduce((s, i) => s + Number(i.igst   || 0), 0),
  };
  const grandTotal = totals.subtotal + totals.cgst + totals.sgst + totals.igst + Number(form.roundOff || 0);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const body = {
        ...form, voucherType,
        subtotal: totals.subtotal, totalCGST: totals.cgst, totalSGST: totals.sgst,
        totalIGST: totals.igst, total: grandTotal,
        party: form.party || undefined,
      };
      if (editId) await api.put(`/companies/${cid}/vouchers/${editId}`, body);
      else         await api.post(`/companies/${cid}/vouchers`, body);
      navigate('/app/vouchers');
    } catch (e) { setErr(e.response?.data?.message || 'Error saving voucher'); }
    finally { setSaving(false); }
  };

  const partyLedgers   = ledgers.filter(l => ['Sundry Debtors','Sundry Creditors'].includes(l.group?.name));
  const generalLedgers = ledgers;

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <form onSubmit={save} className="space-y-6 max-w-5xl mx-auto">
      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{err}</div>}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Voucher No (auto if empty)</label>
            <input type="text" value={form.voucherNo} onChange={e => setForm(f => ({ ...f, voucherNo: e.target.value }))} placeholder="Auto-generated" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Bill No</label>
            <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          {HAS_PARTY.includes(voucherType) && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Party</label>
                <select value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="">Select party…</option>
                  {partyLedgers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Place of Supply</label>
                <input value={form.placeOfSupply} onChange={e => setForm(f => ({ ...f, placeOfSupply: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isIGST} onChange={e => setForm(f => ({ ...f, isIGST: e.target.checked }))} /> IGST (Inter-state)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.reverseCharge} onChange={e => setForm(f => ({ ...f, reverseCharge: e.target.checked }))} /> Reverse Charge
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stock items (for sales/purchase) */}
      {HAS_ITEMS.includes(voucherType) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Stock Items</h3>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
              <FiPlus size={13} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Item','Qty','Unit','Rate','Disc','Amount','GST%','CGST','SGST','IGST','HSN','Godown',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 min-w-40">
                      <select value={it.item} onChange={e => { const sel = items.find(i => i._id === e.target.value); updateItem(idx, 'item', e.target.value); if (sel) { updateItem(idx, 'gstRate', sel.gstRate); updateItem(idx, 'hsnCode', sel.hsnCode || ''); updateItem(idx, 'rate', sel.sellingPrice || 0); updateItem(idx, 'unit', sel.unit?._id || ''); } }} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#003087]">
                        <option value="">Select…</option>
                        {items.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-20"><input type="number" step="0.001" min="0" value={it.qty} onChange={e => updateItem(idx,'qty',+e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-20">
                      <select value={it.unit} onChange={e => updateItem(idx,'unit',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        <option value="">—</option>
                        {units.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-24"><input type="number" step="0.01" value={it.rate} onChange={e => updateItem(idx,'rate',+e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-20"><input type="number" step="0.01" value={it.discount} onChange={e => updateItem(idx,'discount',+e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-24 font-semibold text-gray-800">{fmt(it.amount)}</td>
                    <td className="px-2 py-1.5 w-16">
                      <select value={it.gstRate} onChange={e => updateItem(idx,'gstRate',+e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-20 text-gray-600">{fmt(it.cgst)}</td>
                    <td className="px-2 py-1.5 w-20 text-gray-600">{fmt(it.sgst)}</td>
                    <td className="px-2 py-1.5 w-20 text-gray-600">{fmt(it.igst)}</td>
                    <td className="px-2 py-1.5 w-24"><input value={it.hsnCode} onChange={e => updateItem(idx,'hsnCode',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-32">
                      <select value={it.godown} onChange={e => updateItem(idx,'godown',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        <option value="">Main</option>
                        {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 p-1"><FiTrash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Totals */}
          <div className="flex justify-end px-5 py-4 bg-gray-50 border-t border-gray-100">
            <div className="text-sm space-y-1.5 min-w-48">
              {[['Subtotal', totals.subtotal], ['CGST', totals.cgst], ['SGST', totals.sgst], ['IGST', totals.igst]].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-8 text-gray-600">
                  <span>{label}</span><span className="font-medium">₹{fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-8 text-gray-600">
                <span>Round Off</span>
                <input type="number" step="0.01" value={form.roundOff} onChange={e => setForm(f => ({ ...f, roundOff: +e.target.value }))} className="w-20 text-right px-2 py-0.5 border border-gray-200 rounded text-xs focus:outline-none" />
              </div>
              <div className="flex justify-between gap-8 font-bold text-gray-900 text-base pt-1 border-t border-gray-200 mt-1">
                <span>Total</span><span>₹{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounting entries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Accounting Entries</h3>
          <button type="button" onClick={addEntry} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
            <FiPlus size={13} /> Add Row
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Ledger Account','Dr/Cr','Amount','Narration',''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-3 py-2 min-w-48">
                  <select value={e.ledger} onChange={ev => updateEntry(i,'ledger',ev.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                    <option value="">Select ledger…</option>
                    {generalLedgers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 w-24">
                  <select value={e.type} onChange={ev => updateEntry(i,'type',ev.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </td>
                <td className="px-3 py-2 w-36">
                  <input type="number" step="0.01" value={e.amount} onChange={ev => updateEntry(i,'amount',ev.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                </td>
                <td className="px-3 py-2">
                  <input value={e.narration} onChange={ev => updateEntry(i,'narration',ev.target.value)} placeholder="Optional narration" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => removeEntry(i)} className="text-gray-300 hover:text-red-500 p-1"><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-100">
              <td colSpan={2} className="px-5 py-3 text-xs text-gray-500 font-medium">
                Dr: ₹{fmt(form.entries.filter(e => e.type==='Dr').reduce((s,e) => s + e.amount, 0))} &nbsp;|&nbsp;
                Cr: ₹{fmt(form.entries.filter(e => e.type==='Cr').reduce((s,e) => s + e.amount, 0))}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Narration + actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Narration</label>
        <textarea rows={2} value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]" />
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/app/vouchers')} className="px-5 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        <div className="flex gap-3">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 px-5 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            <FiPrinter size={15} /> Print
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
            <FiSave size={15} /> {saving ? 'Saving…' : editId ? 'Update Voucher' : 'Save Voucher'}
          </button>
        </div>
      </div>
    </form>
  );
}
