import { Fragment, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2, FiSave, FiPrinter } from 'react-icons/fi';
import CollaborationPanel from '../../../components/app/CollaborationPanel';
import Modal from '../../../components/app/Modal';
import { GST_STATES, getGstStateFromGstin, getGstTaxType, splitGstAmount } from '../../../data/gstStates';

const fmt = (n) => Number(n || 0).toFixed(2);

// Which voucher types have stock items
const HAS_ITEMS = ['Sales', 'Purchase', 'CreditNote', 'DebitNote', 'StockJournal', 'DeliveryNote', 'ReceiptNote'];
// Which types have a single party + entries
const HAS_PARTY = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];

const GST_RATES = [0, 5, 12, 18, 28];
const EMPTY_ENTRY = { ledger: '', type: 'Dr', amount: 0, project: '', narration: '' };
const EMPTY_ITEM = { item: '', qty: 1, unit: '', rate: 0, amount: 0, discount: 0, gstRate: 0, cgst: 0, sgst: 0, utgst: 0, igst: 0, hsnCode: '', godown: '', batchNo: '', expiry: '', serialNumbers: '' };
const defaultEntriesFor = (voucherType) => [
  { ...EMPTY_ENTRY, type: 'Dr' },
  { ...EMPTY_ENTRY, type: 'Cr' },
];
const newEntryFor = (voucherType) => ({ ...EMPTY_ENTRY, type: voucherType === 'Journal' ? 'Cr' : 'Dr' });
const EMPTY_STOCK_ITEM_FORM = {
  name: '',
  group: '',
  unit: '',
  hsnCode: '',
  gstRate: 0,
  costPrice: 0,
  sellingPrice: 0,
  openingQty: 0,
  openingRate: 0,
  taxability: 'Taxable',
  valuationMethod: 'Weighted Average',
};
const E_INVOICE_TYPES = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];
const MAIN_ROOT_GROUP_NAMES = ['Sales Accounts', 'Purchase Accounts'];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toNumber(value);
    if (number > 0) return number;
  }
  return 0;
};

const recalcItemTaxes = (item, taxType) => {
  const amount = toNumber(item.qty) * toNumber(item.rate) - toNumber(item.discount);
  return { ...item, amount, ...splitGstAmount(amount, item.gstRate, taxType) };
};

const recalcItemsTaxes = (items = [], taxType) => items.map((item) => recalcItemTaxes(item, taxType));

export default function VoucherEntry({ voucherType }) {
  const { company }   = useCompany();
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const editId         = sp.get('edit');

  const [ledgers, setLedgers]   = useState([]);
  const [groups, setGroups]     = useState([]);
  const [items, setItems]       = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits]       = useState([]);
  const [godowns, setGodowns]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [expandedItemRows, setExpandedItemRows] = useState({});
  const [ledgerModal, setLedgerModal] = useState(null);
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [ledgerErr, setLedgerErr] = useState('');
  const [stockItemModal, setStockItemModal] = useState(null);
  const [stockItemSaving, setStockItemSaving] = useState(false);
  const [stockItemErr, setStockItemErr] = useState('');
  const [stockItemForm, setStockItemForm] = useState(EMPTY_STOCK_ITEM_FORM);
  const [ledgerForm, setLedgerForm] = useState({
    name: '',
    group: '',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    partyType: '',
    gstin: '',
    state: '',
    address: '',
    pincode: '',
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
    accountingLedger: '',
    placeOfSupply: company?.state || '',
    isIGST: false,
    reverseCharge: false,
    entries: defaultEntriesFor(voucherType),
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
        api.get(`/companies/${cid}/inventory/stock-groups`),
        api.get(`/companies/${cid}/advanced/projects`).catch(() => ({ data: { data: [] } })),
      ]).then(([l, gr, i, u, g, sg, p]) => {
        setLedgers(l.data.data || []);
        setGroups(gr.data.data || []);
        setItems(i.data.data   || []);
        setUnits(u.data.data   || []);
        setGodowns(g.data.data || []);
        setStockGroups(sg.data.data || []);
        setProjects(p.data.data || []);
      });

      if (editId) {
        setLoading(true);
        api.get(`/companies/${cid}/vouchers/${editId}`).then(r => {
          const v = r.data.data;
          const accountingEntry = (v.entries || []).find((entry) => {
            const name = String(entry.ledger?.name || '').toLowerCase();
            const narration = String(entry.narration || '').toLowerCase();
            if (voucherType === 'Sales') return entry.type === 'Cr' && (name.includes('sales') || narration.includes('sales'));
            if (voucherType === 'CreditNote') return entry.type === 'Dr' && (name.includes('sales') || narration.includes('sales'));
            if (voucherType === 'Purchase') return entry.type === 'Dr' && (name.includes('purchase') || narration.includes('purchase'));
            if (voucherType === 'DebitNote') return entry.type === 'Cr' && (name.includes('purchase') || narration.includes('purchase'));
            return false;
          });
          setForm({
            date: v.date?.split('T')[0], voucherNo: v.voucherNo, reference: v.reference || '',
            narration: v.narration || '', party: v.party?._id || '',
            branch: v.branch || '',
            currency: v.currency || company?.currency || 'INR',
            exchangeRate: v.exchangeRate || 1,
            accountingLedger: accountingEntry?.ledger?._id || accountingEntry?.ledger || '',
            placeOfSupply: v.placeOfSupply || '', isIGST: v.isIGST, reverseCharge: v.reverseCharge,
            entries: v.entries.map(e => ({ ledger: e.ledger?._id || e.ledger, type: e.type, amount: e.amount, project: e.project?._id || e.project || '', narration: e.narration || '' })),
            items:   v.items.map(i => ({ item: i.item?._id || i.item, qty: i.qty, unit: i.unit?._id || i.unit || '', rate: i.rate, amount: i.amount, discount: i.discount || 0, gstRate: i.gstRate, cgst: i.cgst, sgst: i.sgst, utgst: i.utgst || 0, igst: i.igst, hsnCode: i.hsnCode || '', godown: i.godown?._id || '', batchNo: i.batchNo || '', expiry: i.expiry?.split('T')[0] || '', serialNumbers: (i.serialNumbers || []).join(', ') })),
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
          setComplianceOpen(Boolean(
            v.irn || v.ackNo || v.ackDate || v.ewayBillNo || v.ewaybill ||
            v.transportMode || v.transporterName || v.transporterId ||
            v.transporterDocNo || v.transporterDocDate || v.vehicleNo ||
            v.vehicleType || v.distance
          ));
        }).finally(() => setLoading(false));
      } else if (HAS_ITEMS.includes(voucherType)) {
        setForm(f => ({ ...f, items: [{ ...EMPTY_ITEM }], entries: [EMPTY_ENTRY] }));
      } else {
        setForm(f => ({ ...f, items: [], entries: defaultEntriesFor(voucherType) }));
      }
    });
  }, [cid, editId, voucherType, company?.currency]);

  // Recalculate item amounts + GST
  const updateItem = (idx, key, value) => {
    setForm(f => {
      const newItems = [...f.items];
      const patch = typeof key === 'object' ? key : { [key]: value };
      newItems[idx] = { ...(newItems[idx] || EMPTY_ITEM), ...patch };
      const taxType = getGstTaxType(company?.state, f.placeOfSupply || company?.state);
      newItems[idx] = recalcItemTaxes(newItems[idx], taxType);
      return { ...f, items: newItems };
    });
  };

  const selectStockItem = (idx, itemId) => {
    const selected = items.find((item) => item._id === itemId);
    if (!selected) {
      updateItem(idx, { item: itemId });
      return;
    }

    updateItem(idx, {
      item: itemId,
      unit: selected.unit?._id || selected.unit || '',
      hsnCode: selected.hsnCode || '',
      gstRate: toNumber(selected.gstRate),
      rate: ['Purchase', 'DebitNote'].includes(voucherType)
        ? firstPositiveNumber(selected.costPrice, selected.standardCost, selected.openingRate, selected.sellingPrice, selected.mrp)
        : firstPositiveNumber(selected.sellingPrice, selected.mrp, selected.costPrice, selected.standardCost, selected.openingRate),
    });
  };

  const setPlaceOfSupply = (placeOfSupply) => {
    setForm((f) => {
      const taxType = getGstTaxType(company?.state, placeOfSupply || company?.state);
      return {
        ...f,
        placeOfSupply,
        isIGST: taxType === 'IGST',
        items: recalcItemsTaxes(f.items, taxType),
      };
    });
  };

  const setParty = (partyId) => {
    const party = ledgers.find((ledger) => ledger._id === partyId);
    setForm((f) => {
      const placeOfSupply = party?.state || f.placeOfSupply || company?.state || '';
      const taxType = getGstTaxType(company?.state, placeOfSupply);
      return {
        ...f,
        party: partyId,
        placeOfSupply,
        isIGST: taxType === 'IGST',
        items: recalcItemsTaxes(f.items, taxType),
      };
    });
  };

  const addEntry = () => setForm(f => ({ ...f, entries: [...f.entries, newEntryFor(voucherType)] }));
  const removeEntry = (i) => setForm(f => ({ ...f, entries: f.entries.filter((_, idx) => idx !== i) }));
  const updateEntry = (i, key, val) => setForm(f => { const e = [...f.entries]; e[i] = { ...e[i], [key]: key === 'amount' ? +val : val }; return { ...f, entries: e }; });
  const addServiceLine = () => setForm(f => ({ ...f, entries: [...f.entries, { ...EMPTY_ENTRY, type: 'Dr' }] }));
  const updateServiceLine = (i, key, val) => updateEntry(i, key, key === 'type' ? 'Dr' : val);

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
      state: '',
      address: '',
      pincode: '',
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
      const address = String(ledgerForm.address || '').trim();
      const body = {
        ...ledgerForm,
        name: ledgerForm.name.trim(),
        address,
        ...(ledgerModal?.target === 'party' && address ? {
          billingAddress: address,
          shippingAddress: address,
        } : {}),
        pincode: String(ledgerForm.pincode || '').trim(),
        openingBalance: Number(ledgerForm.openingBalance || 0),
        isActive: true,
        gstApplicable: Boolean(ledgerForm.gstin),
        gstTreatment: ledgerForm.gstin ? 'registered' : '',
        gstType: ledgerForm.gstin ? 'Regular' : '',
      };
      const res = await api.post(`/companies/${cid}/ledgers`, body);
      const saved = res.data.data;
      setLedgers((rows) => [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)));
      if (ledgerModal?.target === 'party') {
        const placeOfSupply = saved.state || company?.state || '';
        const taxType = getGstTaxType(company?.state, placeOfSupply);
        setForm((f) => ({
          ...f,
          party: saved._id,
          placeOfSupply,
          isIGST: taxType === 'IGST',
          items: recalcItemsTaxes(f.items, taxType),
        }));
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

  const openStockItemModal = (rowIndex) => {
    setStockItemForm({
      ...EMPTY_STOCK_ITEM_FORM,
      unit: units[0]?._id || '',
      group: stockGroups[0]?._id || '',
    });
    setStockItemErr('');
    setStockItemModal({ rowIndex });
  };

  const saveFastStockItem = async (event) => {
    event.preventDefault();
    setStockItemSaving(true);
    setStockItemErr('');
    try {
      const body = {
        ...stockItemForm,
        name: stockItemForm.name.trim(),
        gstRate: Number(stockItemForm.gstRate || 0),
        costPrice: Number(stockItemForm.costPrice || 0),
        sellingPrice: Number(stockItemForm.sellingPrice || 0),
        openingQty: Number(stockItemForm.openingQty || 0),
        openingRate: Number(stockItemForm.openingRate || 0),
      };
      const res = await api.post(`/companies/${cid}/inventory/items`, body);
      const saved = res.data.data;
      setItems((rows) => [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)));

      if (stockItemModal?.rowIndex != null) {
        setForm((f) => {
          const nextItems = [...f.items];
          const line = nextItems[stockItemModal.rowIndex] || { ...EMPTY_ITEM };
          const rate = ['Purchase', 'DebitNote'].includes(voucherType)
            ? Number(saved.costPrice || saved.standardCost || saved.sellingPrice || 0)
            : Number(saved.sellingPrice || saved.costPrice || 0);
          const unit = saved.unit?._id || saved.unit || stockItemForm.unit || '';
          const taxTypeForLine = getGstTaxType(company?.state, f.placeOfSupply || company?.state);
          nextItems[stockItemModal.rowIndex] = recalcItemTaxes({
            ...line,
            item: saved._id,
            unit,
            hsnCode: saved.hsnCode || '',
            gstRate: Number(saved.gstRate || 0),
            rate,
          }, taxTypeForLine);
          return { ...f, items: nextItems };
        });
      }

      setStockItemModal(null);
    } catch (error) {
      setStockItemErr(getApiError(error, 'Could not create stock item'));
    } finally {
      setStockItemSaving(false);
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const toggleItemDetails = (idx) => setExpandedItemRows((rows) => ({ ...rows, [idx]: !rows[idx] }));

  const isPurchase = voucherType === 'Purchase';
  const isCreditNote = voucherType === 'CreditNote';
  const isDebitNote = voucherType === 'DebitNote';
  const isPurchaseItem = isPurchase;
  const isPurchaseService = false;
  const showStockItems = HAS_ITEMS.includes(voucherType);
  const isSalesStockVoucher = voucherType === 'Sales' && showStockItems;
  const isCreditNoteStockVoucher = isCreditNote && showStockItems;
  const isPurchaseStockVoucher = isPurchaseItem;
  const isDebitNoteStockVoucher = isDebitNote && showStockItems;
  const usesSalesLedger = isSalesStockVoucher || isCreditNoteStockVoucher;
  const usesPurchaseLedger = isPurchaseStockVoucher || isDebitNoteStockVoucher;
  const isVendorParty = isPurchase || isDebitNote;
  const showManualAccounting = !showStockItems;
  const useGeneratedAccountingEntries = usesSalesLedger || usesPurchaseLedger;
  const showAccountingPreview = false;
  const selectedParty = ledgers.find((ledger) => ledger._id === form.party);
  const mainRootGroups = MAIN_ROOT_GROUP_NAMES
    .map((name) => groups.find((group) => group.name === name))
    .filter(Boolean);
  const mainRootGroupIds = new Set(mainRootGroups.map((group) => String(group._id)));
  const groupsByNature = ['Assets', 'Liabilities', 'Income', 'Expenses'].map((nature) => ({
    nature,
    groups: groups.filter((group) => group.nature === nature && !mainRootGroupIds.has(String(group._id))),
  }));
  const quickLedgerGroupOptions = [
    ...mainRootGroups,
    ...groupsByNature.flatMap(({ groups: natureGroups }) => natureGroups),
  ];
  const taxType = getGstTaxType(company?.state, form.placeOfSupply || selectedParty?.state || company?.state);
  const taxTypeLabel = taxType === 'IGST' ? 'IGST' : taxType === 'UTGST' ? 'CGST + UTGST' : 'CGST + SGST';
  const calculatedItems = form.items.map((item) => recalcItemTaxes(item, taxType));
  const findLedger = (...names) => ledgers.find((ledger) => names.some((name) => ledger.name?.toLowerCase() === name.toLowerCase()));
  const salesLedger = findLedger('Sales') || ledgers.find((ledger) => ledger.group?.name === 'Sales Accounts');
  const purchaseLedger = findLedger('Purchase') || ledgers.find((ledger) => ledger.group?.name === 'Purchase Accounts');
  const showAccountingLedgerSelector = usesSalesLedger || usesPurchaseLedger;
  const accountingGroupName = usesPurchaseLedger ? 'Purchase Accounts' : 'Sales Accounts';
  const accountingLedgerLabel = usesPurchaseLedger ? 'Purchase Account' : 'Sales Account';
  const accountingLedgerOptions = ledgers.filter((ledger) => ledger.group?.name === accountingGroupName);
  const selectedAccountingLedger = accountingLedgerOptions.find((ledger) => ledger._id === form.accountingLedger)
    || (usesPurchaseLedger ? purchaseLedger : salesLedger);
  const accountingLedgerValue = form.accountingLedger || selectedAccountingLedger?._id || '';
  const cashLedger = findLedger('Cash');
  const roundOffLedger = findLedger('Round Off');
  const tdsLedger = findLedger('TDS Payable');
  const tcsLedger = findLedger('TCS Receivable', 'TCS Payable');
  const taxLedgers = {
    input: {
      cgst: findLedger('CGST Input'),
      sgst: findLedger('SGST Input'),
      utgst: findLedger('UTGST Input'),
      igst: findLedger('IGST Input'),
    },
    output: {
      cgst: findLedger('CGST Output'),
      sgst: findLedger('SGST Output'),
      utgst: findLedger('UTGST Output'),
      igst: findLedger('IGST Output'),
    },
  };
  const serviceLines = form.entries.filter((entry) => entry.type === 'Dr' && (entry.ledger || Number(entry.amount || 0) > 0));
  const serviceSubtotal = serviceLines.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const itemTotals = {
    subtotal: calculatedItems.reduce((s, i) => s + Number(i.amount || 0), 0),
    cgst:     calculatedItems.reduce((s, i) => s + Number(i.cgst   || 0), 0),
    sgst:     calculatedItems.reduce((s, i) => s + Number(i.sgst   || 0), 0),
    utgst:    calculatedItems.reduce((s, i) => s + Number(i.utgst  || 0), 0),
    igst:     calculatedItems.reduce((s, i) => s + Number(i.igst   || 0), 0),
  };
  const totals = isPurchaseService ? { subtotal: serviceSubtotal, cgst: 0, sgst: 0, utgst: 0, igst: 0 } : itemTotals;
  const grandTotal = totals.subtotal + totals.cgst + totals.sgst + totals.utgst + totals.igst + Number(form.roundOff || 0) - Number(form.tdsAmount || 0) + Number(form.tcsAmount || 0);
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
  if (isSalesStockVoucher) {
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty || cashLedger, 'Party / Cash', 'Dr', grandTotal, 'Customer receivable');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedAccountingLedger, 'Sales', 'Cr', totals.subtotal, 'Taxable sales value');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.cgst, 'CGST Output', 'Cr', totals.cgst, 'Output CGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.sgst, 'SGST Output', 'Cr', totals.sgst, 'Output SGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.utgst, 'UTGST Output', 'Cr', totals.utgst, 'Output UTGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.igst, 'IGST Output', 'Cr', totals.igst, 'Output IGST');
  }
  if (isCreditNoteStockVoucher) {
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedAccountingLedger, 'Sales', 'Dr', totals.subtotal, 'Sales return value');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.cgst, 'CGST Output', 'Dr', totals.cgst, 'Output CGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.sgst, 'SGST Output', 'Dr', totals.sgst, 'Output SGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.utgst, 'UTGST Output', 'Dr', totals.utgst, 'Output UTGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.output.igst, 'IGST Output', 'Dr', totals.igst, 'Output IGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty, 'Customer', 'Cr', grandTotal, 'Customer credit');
  }
  if (isPurchaseStockVoucher) {
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedAccountingLedger, 'Purchase', 'Dr', totals.subtotal, 'Taxable purchase value');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.cgst, 'CGST Input', 'Dr', totals.cgst, 'Input CGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.sgst, 'SGST Input', 'Dr', totals.sgst, 'Input SGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.utgst, 'UTGST Input', 'Dr', totals.utgst, 'Input UTGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.igst, 'IGST Input', 'Dr', totals.igst, 'Input IGST');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty, 'Supplier', 'Cr', grandTotal, 'Supplier payable');
  }
  if (isDebitNoteStockVoucher) {
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty, 'Supplier', 'Dr', grandTotal, 'Supplier debit');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedAccountingLedger, 'Purchase', 'Cr', totals.subtotal, 'Purchase return value');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.cgst, 'CGST Input', 'Cr', totals.cgst, 'Input CGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.sgst, 'SGST Input', 'Cr', totals.sgst, 'Input SGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.utgst, 'UTGST Input', 'Cr', totals.utgst, 'Input UTGST reversal');
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, taxLedgers.input.igst, 'IGST Input', 'Cr', totals.igst, 'Input IGST reversal');
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
    generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, selectedParty, 'Supplier', 'Cr', grandTotal, 'Supplier payable');
  }
  if (useGeneratedAccountingEntries) {
    const usesSalesAdjustments = isSalesStockVoucher || isDebitNoteStockVoucher;
    if (Number(form.roundOff || 0) > 0) {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, roundOffLedger, 'Round Off', usesSalesAdjustments ? 'Cr' : 'Dr', form.roundOff, 'Round off');
    } else if (Number(form.roundOff || 0) < 0) {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, roundOffLedger, 'Round Off', usesSalesAdjustments ? 'Dr' : 'Cr', Math.abs(Number(form.roundOff)), 'Round off');
    }
    if (usesSalesAdjustments) {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tcsLedger, 'TCS Payable', 'Cr', form.tcsAmount, 'TCS on sales');
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tdsLedger, 'TDS Receivable', 'Dr', form.tdsAmount, 'TDS deducted by customer');
    } else {
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tcsLedger, 'TCS Receivable', 'Dr', form.tcsAmount, 'TCS on purchase');
      generatedAccountingEntries = addPreviewRow(generatedAccountingEntries, tdsLedger, 'TDS Payable', 'Cr', form.tdsAmount, 'TDS deducted');
    }
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
  const referenceLabel = isVendorParty ? 'Supplier Invoice No.' : 'Reference / Bill No';
  const partyLabel = isVendorParty ? 'Supplier' : isCreditNote ? 'Customer' : 'Party';
  const partyPlaceholder = isVendorParty ? 'Select supplier...' : isCreditNote ? 'Select customer...' : 'Select party...';
  const itemById = new Map(items.map((item) => [item._id, item]));
  const stockQtyFor = (itemId) => Number(itemById.get(itemId)?.currentQty ?? itemById.get(itemId)?.openingQty ?? 0);
  const stockNameFor = (itemId) => itemById.get(itemId)?.name || 'selected item';
  const stockWarningsForSave = () => {
    if (editId || !['Sales', 'DebitNote', 'DeliveryNote'].includes(voucherType)) return [];
    const required = new Map();
    form.items.forEach((line) => {
      if (!line.item) return;
      required.set(line.item, Number(required.get(line.item) || 0) + Number(line.qty || 0));
    });
    return [...required.entries()]
      .filter(([itemId, qty]) => qty > stockQtyFor(itemId))
      .map(([itemId, qty]) => `${stockNameFor(itemId)}: available ${stockQtyFor(itemId)}, requested ${qty}`);
  };

  const save = async (e) => {
    e.preventDefault(); setErr('');
    const stockWarnings = stockWarningsForSave();
    if (stockWarnings.length) {
      setErr(`Insufficient stock. ${stockWarnings.join(' ')}`);
      return;
    }
    setSaving(true);
    try {
      const status = e.nativeEvent?.submitter?.value || form.status || 'Submitted';
      const manualEntries = form.entries
        .filter((entry) => entry.ledger || Number(entry.amount || 0) > 0)
        .map((entry) => ({ ...entry, project: entry.project || undefined }));
      const entries = useGeneratedAccountingEntries ? generatedEntriesForSave : manualEntries;
      const voucherItems = showStockItems
        ? calculatedItems.map((item) => ({
          ...item,
          serialNumbers: String(item.serialNumbers || '').split(',').map((s) => s.trim()).filter(Boolean),
          expiry: item.expiry || undefined,
        }))
        : [];
      const voucherForm = { ...form };
      delete voucherForm.accountingLedger;
      const body = {
        ...voucherForm, voucherType, status,
        subtotal: totals.subtotal, totalCGST: totals.cgst, totalSGST: totals.sgst,
        totalUTGST: totals.utgst, totalIGST: totals.igst, total: grandTotal,
        isIGST: taxType === 'IGST',
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
                  <select required={HAS_PARTY.includes(voucherType)} value={form.party} onChange={e => setParty(e.target.value)} className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                    <option value="">{partyPlaceholder}</option>
                    {partyLedgers.map(l => <option key={l._id} value={l._id}>{l.name}{l.state ? ` - ${l.state}` : ''}</option>)}
                  </select>
                  <button type="button" title="Create party ledger" onClick={() => openLedgerModal('party')} className="h-10 w-10 shrink-0 rounded-xl border border-[#003087] text-[#003087] hover:bg-blue-50 flex items-center justify-center">
                    <FiPlus size={15} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Place of Supply</label>
                <select value={form.placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="">Select state / UT</option>
                  {GST_STATES.map((state) => <option key={state.code} value={state.name}>{state.code} - {state.name}</option>)}
                </select>
              </div>
              {showAccountingLedgerSelector && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{accountingLedgerLabel}</label>
                  <select
                    required
                    value={accountingLedgerValue}
                    onChange={e => setForm(f => ({ ...f, accountingLedger: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  >
                    <option value="">Select {accountingLedgerLabel.toLowerCase()}</option>
                    {accountingLedgerOptions.map((ledger) => (
                      <option key={ledger._id} value={ledger._id}>{ledger.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-4 pt-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-[#003087]">
                  {taxTypeLabel}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.reverseCharge} onChange={e => setForm(f => ({ ...f, reverseCharge: e.target.checked }))} /> Reverse Charge
                </label>
              </div>
            </>
          )}
        </div>
      </div>

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
          <h3 className="font-bold text-gray-900">Accounting Entries</h3>
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
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">{isPurchase ? 'Items / Stock Details' : 'Stock Items'}</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => openStockItemModal(Math.max(form.items.length - 1, 0))} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
                <FiPlus size={13} /> New Stock Item
              </button>
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
                <FiPlus size={13} /> Add Row
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Item','Stock','Qty','Unit','Rate','Disc','Taxable','GST%','Tax','Line Total','Details',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((it, idx) => (
                  <Fragment key={idx}>
                  <tr className="border-b border-gray-50">
                    <td className="px-2 py-1.5 min-w-40">
                      <select value={it.item} onChange={e => selectStockItem(idx, e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#003087]">
                        <option value="">Select…</option>
                        {items.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-20 font-mono text-gray-500">
                      {it.item ? stockQtyFor(it.item).toLocaleString('en-IN') : '-'}
                    </td>
                    <td className="px-2 py-1.5 w-20"><input type="number" step="0.001" min="0" value={it.qty} onChange={e => updateItem(idx,'qty',toNumber(e.target.value))} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-20">
                      <select value={it.unit} onChange={e => updateItem(idx,'unit',e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        <option value="">—</option>
                        {units.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-24"><input type="number" step="0.01" value={it.rate} onChange={e => updateItem(idx,'rate',toNumber(e.target.value))} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-20"><input type="number" step="0.01" value={it.discount} onChange={e => updateItem(idx,'discount',toNumber(e.target.value))} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-24 font-semibold text-gray-800">{fmt(it.amount)}</td>
                    <td className="px-2 py-1.5 w-16">
                      <select value={it.gstRate} onChange={e => updateItem(idx,'gstRate',toNumber(e.target.value))} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 w-24 text-gray-600">{fmt(Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.utgst || 0) + Number(it.igst || 0))}</td>
                    <td className="px-2 py-1.5 w-24 font-semibold text-gray-800">{fmt(Number(it.amount || 0) + Number(it.cgst || 0) + Number(it.sgst || 0) + Number(it.utgst || 0) + Number(it.igst || 0))}</td>
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
                      <td colSpan={12} className="px-4 py-3">
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
              {[['Subtotal', totals.subtotal], ['CGST', totals.cgst], ['SGST', totals.sgst], ['UTGST', totals.utgst], ['IGST', totals.igst]].map(([label, val]) => (
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
            {quickLedgerGroupOptions.map((group) => (
              <option key={group._id} value={group._id}>{group.name}</option>
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
                onChange={(e) => {
                  const gstin = e.target.value.toUpperCase();
                  const state = getGstStateFromGstin(gstin);
                  setLedgerForm((f) => ({ ...f, gstin, state: state?.name || f.state }));
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State / UT</label>
              <select
                value={ledgerForm.state}
                onChange={(e) => setLedgerForm((f) => ({ ...f, state: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
              >
                <option value="">Select state / UT</option>
                {GST_STATES.map((state) => <option key={state.code} value={state.name}>{state.code} - {state.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
              <input
                value={ledgerForm.pincode}
                onChange={(e) => setLedgerForm((f) => ({ ...f, pincode: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea
                rows={2}
                value={ledgerForm.address}
                onChange={(e) => setLedgerForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]"
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
    <Modal
      isOpen={Boolean(stockItemModal)}
      onClose={() => setStockItemModal(null)}
      title="Create Stock Item"
      size="md"
    >
      <form onSubmit={saveFastStockItem} className="space-y-4">
        {stockItemErr && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{stockItemErr}</div>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
          <input
            required
            value={stockItemForm.name}
            onChange={(e) => setStockItemForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            autoFocus
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
            <select
              required
              value={stockItemForm.unit}
              onChange={(e) => setStockItemForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="">Select unit</option>
              {units.map((unit) => <option key={unit._id} value={unit._id}>{unit.name} ({unit.symbol})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock Group</label>
            <select
              value={stockItemForm.group}
              onChange={(e) => setStockItemForm((f) => ({ ...f, group: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="">Select group</option>
              {stockGroups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">HSN Code</label>
            <input
              value={stockItemForm.hsnCode}
              onChange={(e) => setStockItemForm((f) => ({ ...f, hsnCode: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate %</label>
            <select
              value={stockItemForm.gstRate}
              onChange={(e) => setStockItemForm((f) => ({ ...f, gstRate: +e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              {GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={stockItemForm.costPrice}
              onChange={(e) => setStockItemForm((f) => ({ ...f, costPrice: +e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Selling Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={stockItemForm.sellingPrice}
              onChange={(e) => setStockItemForm((f) => ({ ...f, sellingPrice: +e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => setStockItemModal(null)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={stockItemSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
            {stockItemSaving ? 'Saving...' : 'Create Stock Item'}
          </button>
        </div>
      </form>
    </Modal>
    </>
  );
}
