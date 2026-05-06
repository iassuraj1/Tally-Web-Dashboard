import { Fragment, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2, FiSave, FiPrinter } from 'react-icons/fi';
import CollaborationPanel from '../../../components/app/CollaborationPanel';
import Modal from '../../../components/app/Modal';

const fmt = (n) => Number(n || 0).toFixed(2);

// Which voucher types have stock items
const HAS_ITEMS = ['Sales', 'Purchase', 'StockJournal', 'DeliveryNote', 'ReceiptNote'];
// Which types have a single party + entries
const HAS_PARTY = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];

const GST_RATES = [0, 5, 12, 18, 28];
const EMPTY_ENTRY = { ledger: '', type: 'Dr', amount: 0, project: '', narration: '' };
const EMPTY_ITEM = { item: '', qty: 1, unit: '', rate: 0, amount: 0, discount: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0, hsnCode: '', godown: '', batchNo: '', expiry: '', serialNumbers: '' };
const E_INVOICE_TYPES = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];
const PURCHASE_MODES = [
  { id: 'item', label: 'Item Purchase Invoice' },
  { id: 'service', label: 'Service / Expense Purchase' },
  { id: 'manual', label: 'Manual Accounting Voucher' },
];

export default function VoucherEntry({ voucherType }) {
  const { company }   = useCompany();
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const editId         = sp.get('edit');

  const [ledgers, setLedgers]   = useState([]);
  const [groups, setGroups]     = useState([]);
  const [items, setItems]       = useState([]);
  const [units, setUnits]       = useState([]);
  const [godowns, setGodowns]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [purchaseMode, setPurchaseMode] = useState('item');
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [expandedItemRows, setExpandedItemRows] = useState({});
  const [ledgerModal, setLedgerModal] = useState(null);
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [ledgerErr, setLedgerErr] = useState('');
  const [ledgerForm, setLedgerForm] = useState({
    name: '',
    group: '',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    partyType: '',
    gstin: '',
    phone: '',
    email: '',
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    reference: '',
    narration: '',
    branch: '',
    currency: company?.currency || 'INR',
    exchangeRate: 1,
    party: '',
    placeOfSupply: company?.state || '',
    isIGST: false,
    reverseCharge: false,
    entries: [{ ...EMPTY_ENTRY, type: 'Dr' }, { ...EMPTY_ENTRY, type: 'Cr' }],
    items: [],
    roundOff: 0,
    tdsAmount: 0,
    tcsAmount: 0,
    status: 'Submitted',
    irn: '',
    ackNo: '',
    ackDate: '',
    ewayBillNo: '',
    transportMode: '',
    transporterName: '',
    transporterId: '',
    transporterDocNo: '',
    transporterDocDate: '',
    vehicleNo: '',
    vehicleType: '',
    distance: 0,
  });

  const cid = company?._id;

  useEffect(() => {
    if (!cid) return;
    queueMicrotask(() => {
      Promise.all([
        api.get(`/companies/${cid}/ledgers`),
        api.get(`/companies/${cid}/groups`),
        api.get(`/companies/${cid}/inventory/items`),
        api.get(`/companies/${cid}/inventory/units`),
        api.get(`/companies/${cid}/inventory/godowns`),
        api.get(`/companies/${cid}/advanced/projects`).catch(() => ({ data: { data: [] } })),
      ]).then(([l, gr, i, u, g, p]) => {
        setLedgers(l.data.data || []);
        setGroups(gr.data.data || []);
        setItems(i.data.data   || []);
        setUnits(u.data.data   || []);
        setGodowns(g.data.data || []);
        setProjects(p.data.data || []);
      });

      if (editId) {
        setLoading(true);
        api.get(`/companies/${cid}/vouchers/${editId}`).then(r => {
          const v = r.data.data;
          setForm({
            date: v.date?.split('T')[0], voucherNo: v.voucherNo, reference: v.reference || '',
            narration: v.narration || '', party: v.party?._id || '',
            branch: v.branch || '',
            currency: v.currency || company?.currency || 'INR',
            exchangeRate: v.exchangeRate || 1,
            placeOfSupply: v.placeOfSupply || '', isIGST: v.isIGST, reverseCharge: v.reverseCharge,
            entries: v.entries.map(e => ({ ledger: e.ledger?._id || e.ledger, type: e.type, amount: e.amount, project: e.project?._id || e.project || '', narration: e.narration || '' })),
            items:   v.items.map(i => ({ item: i.item?._id || i.item, qty: i.qty, unit: i.unit?._id || i.unit || '', rate: i.rate, amount: i.amount, discount: i.discount || 0, gstRate: i.gstRate, cgst: i.cgst, sgst: i.sgst, igst: i.igst, hsnCode: i.hsnCode || '', godown: i.godown?._id || '', batchNo: i.batchNo || '', expiry: i.expiry?.split('T')[0] || '', serialNumbers: (i.serialNumbers || []).join(', ') })),
            roundOff: v.roundOff || 0,
            tdsAmount: v.tdsAmount || 0,
            tcsAmount: v.tcsAmount || 0,
            status: v.status || 'Submitted',
            irn: v.irn || '',
            ackNo: v.ackNo || '',
            ackDate: v.ackDate?.split('T')[0] || '',
            ewayBillNo: v.ewayBillNo || v.ewaybill || '',
            transportMode: v.transportMode || '',
            transporterName: v.transporterName || '',
            transporterId: v.transporterId || '',
            transporterDocNo: v.transporterDocNo || '',
            transporterDocDate: v.transporterDocDate?.split('T')[0] || '',
            vehicleNo: v.vehicleNo || '',
            vehicleType: v.vehicleType || '',
            distance: v.distance || 0,
          });
          if (voucherType === 'Purchase') {
            setPurchaseMode((v.items || []).length > 0 ? 'item' : 'manual');
          }
          setComplianceOpen(Boolean(
            v.irn || v.ackNo || v.ackDate || v.ewayBillNo || v.ewaybill ||
            v.transportMode || v.transporterName || v.transporterId ||
            v.transporterDocNo || v.transporterDocDate || v.vehicleNo ||
            v.vehicleType || v.distance
          ));
        }).finally(() => setLoading(false));
      } else if (HAS_ITEMS.includes(voucherType)) {
        setForm(f => ({ ...f, items: [{ ...EMPTY_ITEM }], entries: [EMPTY_ENTRY] }));
      }
    });
  }, [cid, editId, voucherType, company?.currency]);

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

  const addEntry = () => setForm(f => ({ ...f, entries: [...f.entries, { ...EMPTY_ENTRY }] }));
  const removeEntry = (i) => setForm(f => ({ ...f, entries: f.entries.filter((_, idx) => idx !== i) }));
  const updateEntry = (i, key, val) => setForm(f => { const e = [...f.entries]; e[i] = { ...e[i], [key]: key === 'amount' ? +val : val }; return { ...f, entries: e }; });
  const addServiceLine = () => setForm(f => ({ ...f, entries: [...f.entries, { ...EMPTY_ENTRY, type: 'Dr' }] }));
  const updateServiceLine = (i, key, val) => updateEntry(i, key, key === 'type' ? 'Dr' : val);

  const setMode = (mode) => {
    setPurchaseMode(mode);
    setForm((f) => {
      if (mode === 'item') {
        return { ...f, items: f.items.length ? f.items : [{ ...EMPTY_ITEM }], entries: f.entries.length ? f.entries : [{ ...EMPTY_ENTRY }] };
      }
      if (mode === 'service') {
        return { ...f, items: [], entries: f.entries.length ? f.entries.map((entry) => ({ ...entry, type: 'Dr' })) : [{ ...EMPTY_ENTRY, type: 'Dr' }] };
      }
      return { ...f, items: [], entries: f.entries.length ? f.entries : [{ ...EMPTY_ENTRY, type: 'Dr' }, { ...EMPTY_ENTRY, type: 'Cr' }] };
    });
  };

  const partyDefaults = () => {
    const isVendor = ['Purchase', 'DebitNote'].includes(voucherType);
    return {
      groupName: isVendor ? 'Sundry Creditors' : 'Sundry Debtors',
      partyType: isVendor ? 'vendor' : 'customer',
      openingBalanceType: isVendor ? 'Cr' : 'Dr',
    };
  };

  const openLedgerModal = (target, entryIndex = null) => {
    const defaults = target === 'party' ? partyDefaults() : {};
    const defaultGroup = defaults.groupName
      ? groups.find((group) => group.name === defaults.groupName)?._id
      : '';
    setLedgerForm({
      name: '',
      group: defaultGroup || '',
      openingBalance: 0,
      openingBalanceType: defaults.openingBalanceType || 'Dr',
      partyType: defaults.partyType || '',
      gstin: '',
      phone: '',
      email: '',
    });
    setLedgerErr('');
    setLedgerModal({ target, entryIndex });
  };

  const saveFastLedger = async (event) => {
    event.preventDefault();
    setLedgerSaving(true);
    setLedgerErr('');
    try {
      const body = {
        ...ledgerForm,
        name: ledgerForm.name.trim(),
        openingBalance: Number(ledgerForm.openingBalance || 0),
        isActive: true,
        gstApplicable: Boolean(ledgerForm.gstin),
      };
      const res = await api.post(`/companies/${cid}/ledgers`, body);
      const saved = res.data.data;
      setLedgers((rows) => [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)));
      if (ledgerModal?.target === 'party') {
        setForm((f) => ({ ...f, party: saved._id }));
      }
      if (ledgerModal?.target === 'entry') {
        setForm((f) => {
          const entries = [...f.entries];
          entries[ledgerModal.entryIndex] = { ...entries[ledgerModal.entryIndex], ledger: saved._id };
          return { ...f, entries };
        });
      }
      setLedgerModal(null);
    } catch (error) {
      setLedgerErr(getApiError(error, 'Could not create ledger'));
    } finally {
      setLedgerSaving(false);
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const toggleItemDetails = (idx) => setExpandedItemRows((rows) => ({ ...rows, [idx]: !rows[idx] }));

  const isPurchase = voucherType === 'Purchase';
  const isPurchaseItem = isPurchase && purchaseMode === 'item';
  const isPurchaseService = isPurchase && purchaseMode === 'service';
  const isPurchaseManual = isPurchase && purchaseMode === 'manual';
  const showStockItems = HAS_ITEMS.includes(voucherType) && (!isPurchase || isPurchaseItem);
  const showManualAccounting = !isPurchase || isPurchaseManual;
  const showAccountingPreview = isPurchaseItem || isPurchaseService;
  const selectedParty = ledgers.find((ledger) => ledger._id === form.party);
  const findLedger = (...names) => ledgers.find((ledger) => names.some((name) => ledger.name?.toLowerCase() === name.toLowerCase()));
  const purchaseLedger = findLedger('Purchase') || ledgers.find((ledger) => ledger.group?.name === 'Purchase Accounts');
  const roundOffLedger = findLedger('Round Off');
  const tdsLedger = findLedger('TDS Payable');
  const tcsLedger = findLedger('TCS Receivable', 'TCS Payable');
  const taxLedgers = {
    cgst: findLedger('CGST Input'),
    sgst: findLedger('SGST Input'),
    igst: findLedger('IGST Input'),
  };
  const serviceLines = form.entries.filter((entry) => entry.type === 'Dr' && (entry.ledger || Number(entry.amount || 0) > 0));
  const serviceSubtotal = serviceLines.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const itemTotals = {
    subtotal: form.items.reduce((s, i) => s + Number(i.amount || 0), 0),
    cgst:     form.items.reduce((s, i) => s + Number(i.cgst   || 0), 0),
    sgst:     form.items.reduce((s, i) => s + Number(i.sgst   || 0), 0),
    igst:     form.items.reduce((s, i) => s + Number(i.igst   || 0), 0),
  };
  const totals = isPurchaseService ? { subtotal: serviceSubtotal, cgst: 0, sgst: 0, igst: 0 } : itemTotals;
  const grandTotal = totals.subtotal + totals.cgst + totals.sgst + totals.igst + Number(form.roundOff || 0) - Number(form.tdsAmount || 0) + Number(form.tcsAmount || 0);
  const baseTotal = grandTotal * Number(form.exchangeRate || 1);
  const addPreviewRow = (rows, ledger, fallbackName, type, amount, narration = '') => {
    const roundedAmount = Number(amount || 0);
    if (Math.abs(roundedAmount) <= 0) return rows;
    return [...rows, {
      ledger: ledger?._id || '',
      ledgerName: ledger?.name || fallbackName,
      missing: !ledger?._id,
      type,
      amount: Math.abs(roundedAmount),
      narration,
    }];
  };
  let generatedAccountingEntries = [];
  if (isPurchaseItem) {
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, purchaseLedger, 'Purchase', 'Dr', totals.subtotal, 'Taxable purchase value');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.cgst, 'CGST Input', 'Dr', totals.cgst, 'Input CGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.sgst, 'SGST Input', 'Dr', totals.sgst, 'Input SGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.igst, 'IGST Input', 'Dr', totals.igst, 'Input IGST');
  }
  if (isPurchaseService) {
    generatedAccountingEntries = serviceLines.map((entry) => {
      const ledger = ledgers.find((row) => row._id === entry.ledger);
      return {
        ledger: entry.ledger,
        ledgerName: ledger?.name || 'Service / Expense Ledger',
        missing: !entry.ledger,
        type: 'Dr',
        amount: Number(entry.amount || 0),
        narration: entry.narration || 'Service / expense purchase',
      };
    }).filter((entry) => Number(entry.amount || 0) > 0 || entry.ledger);
  }
  if (isPurchaseItem || isPurchaseService) {
    if (Number(form.roundOff || 0) > 0) {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, roundOffLedger, 'Round Off', 'Dr', form.roundOff, 'Round off');
    } else if (Number(form.roundOff || 0) < 0) {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, roundOffLedger, 'Round Off', 'Cr', Math.abs(Number(form.roundOff)), 'Round off');
    }
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tcsLedger, 'TCS Receivable', 'Dr', form.tcsAmount, 'TCS on purchase');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty, 'Supplier', 'Cr', grandTotal, 'Supplier payable');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tdsLedger, 'TDS Payable', 'Cr', form.tdsAmount, 'TDS deducted');
  }
  const generatedEntriesReady = generatedAccountingEntries.length > 0 && generatedAccountingEntries.every((entry) => entry.ledger && Number(entry.amount || 0) > 0);
  const generatedEntriesForSave = generatedEntriesReady
    ? generatedAccountingEntries.map((entry) => ({
      ledger: entry.ledger,
      type: entry.type,
      amount: entry.amount,
      narration: entry.narration,
    }))
    : [];
  const accountingDebitTotal = generatedAccountingEntries.filter((entry) => entry.type === 'Dr').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const accountingCreditTotal = generatedAccountingEntries.filter((entry) => entry.type === 'Cr').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const dateLabel = isPurchase ? 'Invoice Date *' : 'Date *';
  const voucherNoLabel = isPurchase ? 'Internal Voucher No' : 'Voucher No (auto if empty)';
  const referenceLabel = isPurchase ? 'Supplier Invoice No.' : 'Reference / Bill No';
  const partyLabel = isPurchase ? 'Supplier' : 'Party';
  const partyPlaceholder = isPurchase ? 'Select supplier...' : 'Select party...';

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const status = e.nativeEvent?.submitter?.value || form.status || 'Submitted';
      const manualEntries = form.entries.map((entry) => ({ ...entry, project: entry.project || undefined }));
      const entries = showAccountingPreview ? generatedEntriesForSave : manualEntries;
      const voucherItems = showStockItems
        ? form.items.map((item) => ({
          ...item,
          serialNumbers: String(item.serialNumbers || '').split(',').map((s) => s.trim()).filter(Boolean),
          expiry: item.expiry || undefined,
        }))
        : [];
      const body = {
        ...form, voucherType, status,
        subtotal: totals.subtotal, totalCGST: totals.cgst, totalSGST: totals.sgst,
        totalIGST: totals.igst, total: grandTotal,
        baseTotal,
        party: form.party || undefined,
        entries,
        ackDate: form.ackDate || undefined,
        ewayBillNo: form.ewayBillNo || undefined,
        ewaybill: form.ewayBillNo || undefined,
        transporterDocDate: form.transporterDocDate || undefined,
        distance: Number(form.distance || 0),
        items: voucherItems,
      };
      if (editId) await api.put(`/companies/${cid}/vouchers/${editId}`, body);
      else         await api.post(`/companies/${cid}/vouchers`, body);
      navigate('/app/vouchers');
    } catch (e) { setErr(getApiError(e, 'Error saving voucher')); }
    finally { setSaving(false); }
  };

  const partyLedgers   = ledgers.filter(l => ['Sundry Debtors','Sundry Creditors'].includes(l.group?.name));
  const generalLedgers = ledgers;

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <>
    <form onSubmit={save} className="space-y-6 max-w-5xl mx-auto">
      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{err}</div>}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{dateLabel}</label>
            <input data-shortcut-date type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{voucherNoLabel}</label>
            <input type="text" value={form.voucherNo} onChange={e => setForm(f => ({ ...f, voucherNo: e.target.value }))} placeholder="Auto-generated" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{referenceLabel}</label>
            <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          {company?.branches?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Head office</option>
                {company.branches.map((branch, index) => <option key={branch._id || index} value={branch.code || branch.name}>{branch.name || branch.code}</option>)}
              </select>
            </div>
          )}
          {company?.currencies?.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select value={form.currency} onChange={e => {
                  const currency = company.currencies.find((row) => row.code === e.target.value);
                  setForm(f => ({ ...f, currency: e.target.value, exchangeRate: currency?.exchangeRate || f.exchangeRate || 1 }));
                }} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value={company.currency || 'INR'}>{company.currency || 'INR'}</option>
                  {company.currencies.map((currency, index) => <option key={currency._id || index} value={currency.code}>{currency.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Exchange Rate</label>
                <input type="number" step="0.0001" value={form.exchangeRate} onChange={e => setForm(f => ({ ...f, exchangeRate: +e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
            </>
          )}
          {HAS_PARTY.includes(voucherType) && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{partyLabel}</label>
                <div className="flex gap-2">
                  <select required={isPurchase} value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                    <option value="">{partyPlaceholder}</option>
                    {partyLedgers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                  <button type="button" title="Create party ledger" onClick={() => openLedgerModal('party')} className="h-10 w-10 shrink-0 rounded-xl border border-[#003087] text-[#003087] hover:bg-blue-50 flex items-center justify-center">
                    <FiPlus size={15} />
                  </button>
                </div>
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

      {isPurchase && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid sm:grid-cols-3 gap-2">
            {PURCHASE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setMode(mode.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  purchaseMode === mode.id
                    ? 'bg-[#003087] text-white border-[#003087]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPurchaseService && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Service / Expense Lines</h3>
            <button type="button" onClick={addServiceLine} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
              <FiPlus size={13} /> Add Line
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Expense / Service Ledger', 'Amount', 'Project', 'Narration', ''].map((header) => (
                    <th key={header} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-50">
                    <td className="px-3 py-2 min-w-56">
                      <select value={entry.ledger} onChange={(event) => updateServiceLine(index, 'ledger', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                        <option value="">Select expense ledger...</option>
                        {generalLedgers.filter((ledger) => ledger.group?.nature === 'Expenses').map((ledger) => <option key={ledger._id} value={ledger._id}>{ledger.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 w-36">
                      <input type="number" step="0.01" value={entry.amount} onChange={(event) => updateServiceLine(index, 'amount', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </td>
                    <td className="px-3 py-2 w-44">
                      <select value={entry.project || ''} onChange={(event) => updateServiceLine(index, 'project', event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
                        <option value="">No project</option>
                        {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={entry.narration} onChange={(event) => updateServiceLine(index, 'narration', event.target.value)} placeholder="Optional narration" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeEntry(index)} className="text-gray-300 hover:text-red-500 p-1"><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 text-right text-sm">
            <span className="text-gray-500 mr-4">Service subtotal</span>
            <span className="font-bold text-gray-900">₹{fmt(serviceSubtotal)}</span>
          </div>
        </div>
      )}

      {/* Accounting entries */}
      {showManualAccounting && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{isPurchaseManual ? 'Manual Accounting Entries' : 'Accounting Entries'}</h3>
          <button type="button" onClick={addEntry} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
            <FiPlus size={13} /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Ledger Account','Debit/Credit','Amount','Project','Narration',''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.entries.map((e, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-3 py-2 min-w-48">
                  <div className="flex gap-2">
                    <select value={e.ledger} onChange={ev => updateEntry(i,'ledger',ev.target.value)} className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                      <option value="">Select ledger...</option>
                      {generalLedgers.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                    </select>
                    <button type="button" title="Create ledger" onClick={() => openLedgerModal('entry', i)} className="h-9 w-9 shrink-0 rounded-xl border border-gray-200 text-[#003087] hover:bg-blue-50 flex items-center justify-center">
                      <FiPlus size={14} />
                    </button>
                  </div>
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
                <td className="px-3 py-2 w-44">
                  <select value={e.project || ''} onChange={ev => updateEntry(i,'project',ev.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
                    <option value="">No project</option>
                    {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
                  </select>
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
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
        </div>
      </div>}

      {/* Stock items (for sales/purchase) */}
      {showStockItems && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">{isPurchase ? 'Items / Stock Details' : 'Stock Items'}</h3>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
              <FiPlus size={13} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Item','Qty','Unit','Rate','Disc','Taxable','GST%','Tax','Line Total','Details',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <Fragment key={idx}>
                  <tr className="border-b border-gray-50">
                    <td className="px-2 py-1.5 min-w-40">
                      <select value={it.item} onChange={e => { const sel = items.find(i => i._id === e.target.value); updateItem(idx, 'item', e.target.value); if (sel) { updateItem(idx, 'gstRate', sel.gstRate); updateItem(idx, 'hsnCode', sel.hsnCode || ''); updateItem(idx, 'rate', sel.costPrice || sel.sellingPrice || 0); updateItem(idx, 'unit', sel.unit?._id || ''); } }} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#003087]">
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
                    <td className="px-2 py-1.5 w-24 text-gray-600">{fmt(Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0))}</td>
                    <td className="px-2 py-1.5 w-24 font-semibold text-gray-800">{fmt(Number(it.amount || 0) + Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.igst || 0))}</td>
                    <td className="px-2 py-1.5 w-20">
                      <button type="button" onClick={() => toggleItemDetails(idx)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#003087] hover:text-[#ff6600]">
                        {expandedItemRows[idx] ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />} Details
                      </button>
                    </td>
                    <td className="hidden"><input value={it.hsnCode} onChange={e => updateItem(idx,'hsnCode',e.target.value)} /></td>
                    <td className="hidden"><input value={it.batchNo} onChange={e => updateItem(idx,'batchNo',e.target.value)} /></td>
                    <td className="hidden"><input type="date" value={it.expiry || ''} onChange={e => updateItem(idx,'expiry',e.target.value)} /></td>
                    <td className="hidden"><input value={it.serialNumbers || ''} onChange={e => updateItem(idx,'serialNumbers',e.target.value)} /></td>
                    <td className="hidden">
                      <select value={it.godown} onChange={e => updateItem(idx,'godown',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        <option value="">Main</option>
                        {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 p-1"><FiTrash2 size={13} /></button></td>
                  </tr>
                  {expandedItemRows[idx] && (
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <td colSpan={11} className="px-4 py-3">
                        <div className="grid sm:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">HSN / SAC</label>
                            <input value={it.hsnCode} onChange={e => updateItem(idx,'hsnCode',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Batch</label>
                            <input value={it.batchNo} onChange={e => updateItem(idx,'batchNo',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Expiry</label>
                            <input type="date" value={it.expiry || ''} onChange={e => updateItem(idx,'expiry',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Godown</label>
                            <select value={it.godown} onChange={e => updateItem(idx,'godown',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                              <option value="">Main</option>
                              {godowns.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Serial Numbers</label>
                            <input value={it.serialNumbers || ''} onChange={e => updateItem(idx,'serialNumbers',e.target.value)} placeholder="Comma separated" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
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
              {company?.tdsTcsEnabled && (
                <>
                  <div className="flex justify-between gap-8 text-gray-600">
                    <span>TDS</span>
                    <input type="number" step="0.01" value={form.tdsAmount} onChange={e => setForm(f => ({ ...f, tdsAmount: +e.target.value }))} className="w-20 text-right px-2 py-0.5 border border-gray-200 rounded text-xs focus:outline-none" />
                  </div>
                  <div className="flex justify-between gap-8 text-gray-600">
                    <span>TCS</span>
                    <input type="number" step="0.01" value={form.tcsAmount} onChange={e => setForm(f => ({ ...f, tcsAmount: +e.target.value }))} className="w-20 text-right px-2 py-0.5 border border-gray-200 rounded text-xs focus:outline-none" />
                  </div>
                </>
              )}
              <div className="flex justify-between gap-8 font-bold text-gray-900 text-base pt-1 border-t border-gray-200 mt-1">
                <span>Total</span><span>₹{fmt(grandTotal)}</span>
              </div>
              {form.currency && form.currency !== (company?.currency || 'INR') && (
                <div className="flex justify-between gap-8 text-xs text-gray-500">
                  <span>Base Total</span><span>{company?.currency || 'INR'} {fmt(baseTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAccountingPreview && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Accounting Preview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Ledger', 'Debit/Credit', 'Amount', 'Narration'].map((header) => (
                    <th key={header} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {generatedAccountingEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Accounting entries will appear after invoice lines are entered.</td>
                  </tr>
                ) : generatedAccountingEntries.map((entry, index) => (
                  <tr key={`${entry.ledgerName}-${index}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {entry.ledgerName}
                      {entry.missing && <span className="ml-2 text-xs font-semibold text-amber-600">ledger missing</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{entry.type}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">₹{fmt(entry.amount)}</td>
                    <td className="px-5 py-3 text-gray-500">{entry.narration || '-'}</td>
                  </tr>
                ))}
              </tbody>
              {generatedAccountingEntries.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500">
                      Debit: ₹{fmt(accountingDebitTotal)} | Credit: ₹{fmt(accountingCreditTotal)}
                      {!generatedEntriesReady && <span className="ml-3 text-amber-600">Some default ledgers are missing, so this invoice can be saved but will not post generated entries until ledgers are available.</span>}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {E_INVOICE_TYPES.includes(voucherType) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setComplianceOpen((open) => !open)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
            <h3 className="font-bold text-gray-900">Advanced / Compliance Details</h3>
            {complianceOpen ? <FiChevronDown size={16} className="text-gray-500" /> : <FiChevronRight size={16} className="text-gray-500" />}
          </button>
          {complianceOpen && <div className="grid sm:grid-cols-3 gap-4 px-5 pb-5 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IRN</label>
              <input value={form.irn} onChange={e => setForm(f => ({ ...f, irn: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ack Number</label>
              <input value={form.ackNo} onChange={e => setForm(f => ({ ...f, ackNo: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ack Date</label>
              <input type="date" value={form.ackDate} onChange={e => setForm(f => ({ ...f, ackDate: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-Way Bill No</label>
              <input value={form.ewayBillNo} onChange={e => setForm(f => ({ ...f, ewayBillNo: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transport Mode</label>
              <select value={form.transportMode} onChange={e => setForm(f => ({ ...f, transportMode: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Select mode</option>
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Distance (km)</label>
              <input type="number" min="0" step="1" value={form.distance} onChange={e => setForm(f => ({ ...f, distance: +e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transporter Name</label>
              <input value={form.transporterName} onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transporter ID</label>
              <input value={form.transporterId} onChange={e => setForm(f => ({ ...f, transporterId: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transport Doc No</label>
              <input value={form.transporterDocNo} onChange={e => setForm(f => ({ ...f, transporterDocNo: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transport Doc Date</label>
              <input type="date" value={form.transporterDocDate} onChange={e => setForm(f => ({ ...f, transporterDocDate: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Number</label>
              <input value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value.toUpperCase() }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
              <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Select type</option>
                <option value="Regular">Regular</option>
                <option value="Over Dimensional Cargo">Over Dimensional Cargo</option>
              </select>
            </div>
          </div>}
        </div>
      )}

      {/* Narration + actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Narration</label>
        <textarea rows={2} value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]" />
      </div>

      {editId && <CollaborationPanel entityType="Voucher" entityId={editId} />}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/app/vouchers')} className="px-5 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        <div className="flex gap-3">
          <button type="button" data-shortcut-action="print" onClick={() => window.print()} className="flex items-center gap-2 px-5 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            <FiPrinter size={15} /> Print
          </button>
          <button type="submit" data-shortcut-action="save" value="Submitted" disabled={saving} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
            <FiSave size={15} /> {saving ? 'Saving…' : editId ? 'Update Voucher' : 'Save Voucher'}
          </button>
          <button type="submit" value="Draft" disabled={saving} className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#003087] border border-[#003087] rounded-xl hover:bg-blue-50 disabled:opacity-60">
            <FiSave size={15} /> Save Draft
          </button>
        </div>
      </div>
    </form>
    <Modal
      isOpen={Boolean(ledgerModal)}
      onClose={() => setLedgerModal(null)}
      title={ledgerModal?.target === 'party' ? 'Create Party Ledger' : 'Create Ledger'}
      size="md"
    >
      <form onSubmit={saveFastLedger} className="space-y-4">
        {ledgerErr && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{ledgerErr}</div>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ledger Name *</label>
          <input
            required
            value={ledgerForm.name}
            onChange={(e) => setLedgerForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Group *</label>
          <select
            required
            value={ledgerForm.group}
            onChange={(e) => setLedgerForm((f) => ({ ...f, group: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
          >
            <option value="">Select group</option>
            {['Assets', 'Liabilities', 'Income', 'Expenses'].map((nature) => (
              <optgroup key={nature} label={nature}>
                {groups.filter((group) => group.nature === nature).map((group) => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={ledgerForm.openingBalance}
              onChange={(e) => setLedgerForm((f) => ({ ...f, openingBalance: +e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Balance Type</label>
            <select
              value={ledgerForm.openingBalanceType}
              onChange={(e) => setLedgerForm((f) => ({ ...f, openingBalanceType: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="Dr">Dr</option>
              <option value="Cr">Cr</option>
            </select>
          </div>
        </div>
        {ledgerModal?.target === 'party' && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
              <input
                value={ledgerForm.gstin}
                maxLength={15}
                onChange={(e) => setLedgerForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                value={ledgerForm.phone}
                onChange={(e) => setLedgerForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={ledgerForm.email}
                onChange={(e) => setLedgerForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => setLedgerModal(null)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={ledgerSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
            {ledgerSaving ? 'Saving...' : 'Create Ledger'}
          </button>
        </div>
      </form>
    </Modal>
    </>
  );
}
