import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';
import Modal from '../../../components/app/Modal';
import { FiPlus, FiRefreshCw, FiSearch, FiArrowRight, FiEdit2, FiEye, FiFileText, FiTrash2, FiX } from 'react-icons/fi';

const GST_RATES = [0, 5, 12, 18, 28];
const salesTypes = ['Estimate', 'SalesOrder', 'DeliveryNote'];
const purchaseTypes = ['PurchaseOrder', 'ReceiptNote'];
const labels = {
  Estimate: 'Estimate',
  SalesOrder: 'Sales Order',
  DeliveryNote: 'Delivery Note',
  PurchaseOrder: 'Purchase Order',
  ReceiptNote: 'Receipt Note',
};
const statusClass = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  invoiced: 'bg-purple-100 text-purple-700',
  billed: 'bg-purple-100 text-purple-700',
  closed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

const emptyLine = { item: '', description: '', qty: 1, unit: '', rate: 0, discount: 0, gstRate: 0, amount: 0, hsnCode: '', godown: '' };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const cleanOptionalRefs = (line) => {
  const next = { ...line };
  ['item', 'unit', 'godown'].forEach((key) => {
    if (!next[key]) delete next[key];
  });
  return next;
};

const preparePayload = (payload) => ({
  ...payload,
  items: (payload.items || []).map(cleanOptionalRefs),
});

const docKey = (doc) => doc?._id || doc?.id || doc?.documentNo || '';
const sameDoc = (left, right) => {
  const leftId = left?._id || left?.id;
  const rightId = right?._id || right?.id;
  if (leftId && rightId) return leftId === rightId;
  return Boolean(left?.documentNo && right?.documentNo && left.documentNo === right.documentNo);
};

const nextTargets = (doc) => {
  if (doc.flow === 'sales') {
    if (doc.documentType === 'Estimate') return [['SalesOrder', 'Sales Order']];
    if (doc.documentType === 'SalesOrder') return [['DeliveryNote', 'Delivery Note'], ['SalesInvoice', 'Invoice']];
    if (doc.documentType === 'DeliveryNote') return [['SalesInvoice', 'Invoice']];
    return [];
  }
  if (doc.documentType === 'PurchaseOrder') return [['ReceiptNote', 'Receipt Note'], ['PurchaseBill', 'Bill']];
  if (doc.documentType === 'ReceiptNote') return [['PurchaseBill', 'Bill']];
  return [];
};

function DocumentForm({ form, setForm, flow, parties, items, units, error }) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateLine = (index, key, value) => {
    setForm((f) => {
      const next = [...f.items];
      next[index] = { ...next[index], [key]: value };
      const line = next[index];
      const amount = Number(line.qty || 0) * Number(line.rate || 0) - Number(line.discount || 0);
      const gst = Number(line.gstRate || 0) / 100;
      next[index] = {
        ...line,
        amount,
        igst: f.isIGST ? amount * gst : 0,
        cgst: f.isIGST ? 0 : amount * gst / 2,
        sgst: f.isIGST ? 0 : amount * gst / 2,
      };
      return { ...f, items: next };
    });
  };

  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyLine }] }));
  const removeLine = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]';
  const docTypes = flow === 'sales' ? salesTypes : purchaseTypes;

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Document Type</label>
          <select value={form.documentType} onChange={(e) => set('documentType', e.target.value)} className={`${input} bg-white`}>
            {docTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Document No</label>
          <input value={form.documentNo} onChange={(e) => set('documentNo', e.target.value)} className={input} placeholder="Auto" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Reference</label>
          <input value={form.reference} onChange={(e) => set('reference', e.target.value)} className={input} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{flow === 'sales' ? 'Customer' : 'Vendor'}</label>
          <select required value={form.party} onChange={(e) => {
            const party = parties.find((p) => p._id === e.target.value);
            setForm((f) => ({
              ...f,
              party: e.target.value,
              billingAddress: party?.billingAddress || party?.address || '',
              shippingAddress: party?.shippingAddress || party?.address || '',
              placeOfSupply: party?.state || f.placeOfSupply,
            }));
          }} className={`${input} bg-white`}>
            <option value="">Select party</option>
            {parties.map((party) => <option key={party._id} value={party._id}>{party.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Place of Supply</label>
          <input value={form.placeOfSupply} onChange={(e) => set('placeOfSupply', e.target.value)} className={input} />
        </div>
        <label className="flex items-center gap-2 text-sm pt-6">
          <input type="checkbox" checked={form.isIGST} onChange={(e) => set('isIGST', e.target.checked)} /> IGST
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <textarea rows={2} value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} className={input} placeholder="Billing address" />
        <textarea rows={2} value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} className={input} placeholder="Shipping address" />
      </div>

      <div className="border border-gray-100 rounded-lg overflow-x-auto">
        <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
          <div className="font-semibold text-sm text-gray-800">Items</div>
          <button type="button" onClick={addLine} className="text-xs text-[#003087] font-semibold">Add line</button>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-gray-100 bg-white">{['Item', 'Qty', 'Unit', 'Rate', 'Disc', 'GST%', 'Amount', ''].map((h) => <th key={h} className="px-2 py-2 text-left text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {form.items.map((line, index) => (
              <tr key={index} className="border-b border-gray-50">
                <td className="px-2 py-2 min-w-44">
                  <select value={line.item} onChange={(e) => {
                    const stock = items.find((item) => item._id === e.target.value);
                    updateLine(index, 'item', e.target.value);
                    if (stock) {
                      updateLine(index, 'description', stock.name);
                      updateLine(index, 'hsnCode', stock.hsnCode || '');
                      updateLine(index, 'gstRate', stock.gstRate || 0);
                      updateLine(index, 'rate', flow === 'purchase' ? stock.purchasePrice || 0 : stock.sellingPrice || 0);
                      updateLine(index, 'unit', stock.unit?._id || stock.unit || '');
                    }
                  }} className={`${input} bg-white text-xs`}>
                    <option value="">Select</option>
                    {items.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2 w-20"><input type="number" step="0.001" value={line.qty} onChange={(e) => updateLine(index, 'qty', +e.target.value)} className={`${input} text-xs`} /></td>
                <td className="px-2 py-2 w-24"><select value={line.unit} onChange={(e) => updateLine(index, 'unit', e.target.value)} className={`${input} bg-white text-xs`}><option value="">-</option>{units.map((unit) => <option key={unit._id} value={unit._id}>{unit.symbol}</option>)}</select></td>
                <td className="px-2 py-2 w-24"><input type="number" step="0.01" value={line.rate} onChange={(e) => updateLine(index, 'rate', +e.target.value)} className={`${input} text-xs`} /></td>
                <td className="px-2 py-2 w-20"><input type="number" step="0.01" value={line.discount} onChange={(e) => updateLine(index, 'discount', +e.target.value)} className={`${input} text-xs`} /></td>
                <td className="px-2 py-2 w-20"><select value={line.gstRate} onChange={(e) => updateLine(index, 'gstRate', +e.target.value)} className={`${input} bg-white text-xs`}>{GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></td>
                <td className="px-2 py-2 font-semibold">{fmt(line.amount)}</td>
                <td className="px-2 py-2"><button type="button" onClick={() => removeLine(index)} className="text-gray-400 hover:text-red-600"><FiX size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <textarea rows={2} value={form.terms} onChange={(e) => set('terms', e.target.value)} className={input} placeholder="Terms and conditions" />
        <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={input} placeholder="Internal notes" />
      </div>
    </div>
  );
}

function DocumentView({ doc }) {
  const rows = doc.items || [];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-4 gap-4">
        {[
          ['Document Type', labels[doc.documentType] || doc.documentType],
          ['Document No', doc.documentNo],
          ['Date', doc.date ? new Date(doc.date).toLocaleDateString('en-IN') : '-'],
          ['Reference', doc.reference || '-'],
          ['Party', doc.party?.name || '-'],
          ['Place of Supply', doc.placeOfSupply || '-'],
          ['Tax Type', doc.isIGST ? 'IGST' : 'CGST + SGST'],
          ['Status', doc.status || '-'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="text-xs font-semibold uppercase text-gray-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-semibold uppercase text-gray-400">Billing Address</div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{doc.billingAddress || '-'}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-semibold uppercase text-gray-400">Shipping Address</div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{doc.shippingAddress || '-'}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Item', 'Qty', 'Unit', 'Rate', 'Discount', 'GST', 'Amount'].map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((line, index) => (
              <tr key={`${line.item?._id || line.item || index}-${index}`}>
                <td className="px-3 py-2 font-medium text-gray-900">{line.item?.name || line.description || '-'}</td>
                <td className="px-3 py-2 text-gray-600">{line.qty || 0}</td>
                <td className="px-3 py-2 text-gray-600">{line.unit?.symbol || '-'}</td>
                <td className="px-3 py-2 text-gray-600">{fmt(line.rate)}</td>
                <td className="px-3 py-2 text-gray-600">{fmt(line.discount)}</td>
                <td className="px-3 py-2 text-gray-600">{line.gstRate || 0}%</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{fmt(line.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-semibold uppercase text-gray-400">Terms and Conditions</div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{doc.terms || '-'}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-semibold uppercase text-gray-400">Internal Notes</div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{doc.notes || '-'}</p>
        </div>
      </div>

      <div className="ml-auto w-full max-w-xs rounded-lg border border-gray-100 bg-gray-50 p-4">
        {[
          ['Subtotal', doc.subtotal],
          ['CGST', doc.totalCGST],
          ['SGST', doc.totalSGST],
          ['IGST', doc.totalIGST],
          ['Round off', doc.roundOff],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-1 text-sm text-gray-600">
            <span>{label}</span>
            <span>{fmt(value)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
          <span>Total</span>
          <span>{fmt(doc.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowDocuments({ flow = 'sales' }) {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cid = company?._id;
  const partyType = flow === 'sales' ? 'customer' : 'vendor';

  const load = useCallback(() => {
    if (!cid) return;
    setLoading(true);
    Promise.all([
      api.get(`/companies/${cid}/documents?flow=${flow}`),
      api.get(`/companies/${cid}/ledgers?partyType=${partyType}`),
      api.get(`/companies/${cid}/inventory/items`),
      api.get(`/companies/${cid}/inventory/units`),
    ]).then(([docRes, partyRes, itemRes, unitRes]) => {
      setDocs(docRes.data.data || []);
      setParties(partyRes.data.data || []);
      setItems(itemRes.data.data || []);
      setUnits(unitRes.data.data || []);
    }).finally(() => setLoading(false));
  }, [cid, flow, partyType]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return docs.filter((doc) => {
      if (typeFilter && doc.documentType !== typeFilter) return false;
      if (!q) return true;
      return [doc.documentNo, doc.reference, doc.party?.name, doc.status].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [docs, query, typeFilter]);

  const openAdd = (documentType = flow === 'sales' ? 'Estimate' : 'PurchaseOrder') => {
    setEditing(null);
    setForm({
      flow,
      documentType,
      documentNo: '',
      date: today(),
      reference: '',
      party: '',
      billingAddress: '',
      shippingAddress: '',
      placeOfSupply: company?.state || '',
      isIGST: false,
      status: 'draft',
      items: [{ ...emptyLine }],
      terms: '',
      notes: '',
      roundOff: 0,
    });
    setError('');
    setModal(true);
  };

  const openEdit = async (doc) => {
    const res = await api.get(`/companies/${cid}/documents/${doc._id}`);
    const detail = res.data.data;
    setEditing(detail);
    setForm({
      flow,
      documentType: detail.documentType,
      documentNo: detail.documentNo,
      date: detail.date?.slice(0, 10) || today(),
      reference: detail.reference || '',
      party: detail.party?._id || detail.party || '',
      billingAddress: detail.billingAddress || '',
      shippingAddress: detail.shippingAddress || '',
      placeOfSupply: detail.placeOfSupply || '',
      isIGST: detail.isIGST,
      status: detail.status,
      items: detail.items?.length ? detail.items.map((line) => ({ ...line, item: line.item?._id || line.item || '', unit: line.unit?._id || line.unit || '', godown: line.godown?._id || line.godown || '' })) : [{ ...emptyLine }],
      terms: detail.terms || '',
      notes: detail.notes || '',
      roundOff: detail.roundOff || 0,
    });
    setError('');
    setModal(true);
  };

  const openView = async (doc) => {
    const res = await api.get(`/companies/${cid}/documents/${doc._id}`);
    setViewing(res.data.data);
    setViewModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = preparePayload(form);
      if (editing) await api.put(`/companies/${cid}/documents/${editing._id}`, payload);
      else await api.post(`/companies/${cid}/documents`, payload);
      setModal(false);
      load();
    } catch (err) {
      setError(getApiError(err, 'Could not save document'));
    } finally {
      setSaving(false);
    }
  };

  const convert = async (doc, target) => {
    try {
      const res = await api.post(`/companies/${cid}/documents/${doc._id}/convert`, { target });
      load();
      if (res.data.kind === 'voucher') {
        const path = res.data.data.voucherType === 'Sales' ? 'sales' : res.data.data.voucherType === 'Purchase' ? 'purchase' : res.data.data.voucherType === 'Receipt' ? 'receipt' : res.data.data.voucherType === 'Payment' ? 'payment' : '';
        if (path) navigate(`/app/vouchers/${path}?edit=${res.data.data._id}`);
      }
    } catch (err) {
      alert(getApiError(err, 'Conversion failed'));
    }
  };

  const askDelete = (doc) => {
    setPendingDelete(doc);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const key = docKey(pendingDelete);
    if (!key) {
      setDeleteError('Could not delete document because its ID is missing. Please refresh and try again.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/companies/${cid}/documents/${encodeURIComponent(key)}`);
      setDocs((current) => current.filter((doc) => !sameDoc(doc, pendingDelete)));
      if (sameDoc(viewing, pendingDelete)) {
        setViewing(null);
        setViewModal(false);
      }
      setPendingDelete(null);
      load();
    } catch (err) {
      setDeleteError(getApiError(err, 'Could not delete document'));
    } finally {
      setDeleting(false);
    }
  };

  const docTypes = flow === 'sales' ? salesTypes : purchaseTypes;
  const title = flow === 'sales' ? 'Sales Workflow' : 'Purchase Workflow';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="font-bold text-gray-900 flex items-center gap-2"><FiFileText /> {title}</div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Documents</option>
            {docTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
          </select>
          <div className="relative ml-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-56" placeholder="Search documents" />
          </div>
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"><FiRefreshCw size={15} /></button>
          <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiPlus size={14} /> New</button>
        </div>

        <div className="overflow-x-auto">
          {loading ? <div className="py-16 text-center text-gray-400">Loading...</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{['Document', 'Date', 'Party', 'Amount', 'Status', 'Converted To', 'Actions'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><button onClick={() => openEdit(doc)} className="font-semibold text-[#003087]">{doc.documentNo}</button><div className="text-xs text-gray-400">{labels[doc.documentType]}</div></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(doc.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">{doc.party?.name || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(doc.total)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusClass[doc.status] || statusClass.draft}`}>{doc.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{doc.convertedToVoucher ? `${doc.convertedToVoucher.voucherType} ${doc.convertedToVoucher.voucherNo}` : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openView(doc)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:border-[#003087] hover:bg-blue-50 hover:text-[#003087]"
                          title="View document"
                        >
                          <FiEye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:border-[#003087] hover:bg-blue-50 hover:text-[#003087]"
                          title="Edit document"
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                        {doc.convertedToVoucher?.voucherType === 'Sales' && <Link to={`/app/invoice-print/${doc.convertedToVoucher._id}`} className="px-2 py-1 text-xs border border-gray-200 rounded text-gray-600">Print</Link>}
                        {nextTargets(doc).map(([target, label]) => (
                          <button key={target} onClick={() => convert(doc, target)} className="flex items-center gap-1 px-2 py-1 text-xs border border-[#003087] rounded text-[#003087] hover:bg-blue-50">
                            {label} <FiArrowRight size={11} />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => askDelete(doc)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-red-100 rounded text-red-600 hover:bg-red-50"
                          title="Delete document"
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-14 text-center text-gray-400">No documents found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.documentNo}` : `New ${title} Document`} size="lg">
        {form && (
          <form onSubmit={save}>
            <DocumentForm form={form} setForm={setForm} flow={flow} parties={parties} items={items} units={units} error={error} />
            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-60">{saving ? 'Saving...' : 'Save Document'}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewing ? `View ${viewing.documentNo}` : 'View Document'} size="lg">
        {viewing && (
          <>
            <DocumentView doc={viewing} />
            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
              <button type="button" onClick={() => setViewModal(false)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg">Close</button>
              <button
                type="button"
                onClick={() => {
                  setViewModal(false);
                  openEdit(viewing);
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"
              >
                <FiEdit2 size={14} /> Edit
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)} title="Delete Document">
        {pendingDelete && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError || `Delete ${pendingDelete.documentNo}? This action cannot be undone.`}
            </div>
            {(pendingDelete.convertedToVoucher || pendingDelete.convertedToDocument) && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This document has already been converted, so the backend will not allow deletion.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                <FiTrash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
