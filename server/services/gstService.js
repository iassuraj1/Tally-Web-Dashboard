const Company = require('../models/Company');
const Ledger = require('../models/Ledger');
const Voucher = require('../models/Voucher');
const { getGstTaxType } = require('../utils/gstStates');

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GST_VOUCHER_TYPES = ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];
const OUTWARD_TYPES = ['Sales', 'CreditNote', 'DebitNote'];
const INWARD_TYPES = ['Purchase', 'DebitNote'];
const GST_REPORT_STATUSES = ['Submitted', 'Approved'];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value) => Math.round((Number(value) || 0) * 100);
const gstin = (value) => String(value || '').trim().toUpperCase();
const isValidGstin = (value) => !value || GSTIN_REGEX.test(gstin(value));
const dateOnly = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');
const formatAmount = (value) => round2(value);

const dateFilter = (companyId, query = {}, extra = {}) => {
  const filter = {
    company: companyId,
    isCancelled: false,
    $or: [{ status: { $in: GST_REPORT_STATUSES } }, { status: { $exists: false } }],
    ...extra,
  };
  if (query.from) filter.date = { $gte: new Date(query.from) };
  if (query.to) filter.date = { ...filter.date, $lte: new Date(query.to) };
  return filter;
};

const lineTax = (line) => round2(Number(line.cgst || 0) + Number(line.sgst || 0) + Number(line.utgst || 0) + Number(line.igst || 0) + Number(line.cess || 0));

const taxTypeForVoucher = (voucherLike, company = null) => {
  const companyState = company?.state || voucherLike?.companyState || '';
  const placeOfSupply = voucherLike?.placeOfSupply || '';
  if (companyState && placeOfSupply) return getGstTaxType(companyState, placeOfSupply);
  return voucherLike?.isIGST ? 'IGST' : getGstTaxType(companyState, placeOfSupply || companyState);
};

const calculateLine = (line, taxTypeOrIsIGST = 'SGST') => {
  const taxable = round2(Number(line.qty || 0) * Number(line.rate || 0) - Number(line.discount || 0));
  const rate = Number(line.gstRate || 0);
  const tax = round2((taxable * rate) / 100);
  const taxType = typeof taxTypeOrIsIGST === 'boolean'
    ? (taxTypeOrIsIGST ? 'IGST' : 'SGST')
    : taxTypeOrIsIGST;

  if (taxType === 'IGST') {
    return { taxable, cgst: 0, sgst: 0, utgst: 0, igst: tax };
  }

  if (taxType === 'UTGST') {
    return {
      taxable,
      cgst: round2(tax / 2),
      sgst: 0,
      utgst: round2(tax / 2),
      igst: 0,
    };
  }

  return {
    taxable,
    cgst: round2(tax / 2),
    sgst: round2(tax / 2),
    utgst: 0,
    igst: 0,
  };
};

const calculateVoucherTotals = (voucherLike, company = null) => {
  const items = Array.isArray(voucherLike.items) ? voucherLike.items : [];
  const taxType = taxTypeForVoucher(voucherLike, company);
  const calculatedItems = items.map((item) => ({ ...item, ...calculateLine(item, taxType) }));
  const subtotal = round2(calculatedItems.reduce((sum, item) => sum + Number(item.taxable || 0), 0));
  const totalCGST = round2(calculatedItems.reduce((sum, item) => sum + Number(item.cgst || 0), 0));
  const totalSGST = round2(calculatedItems.reduce((sum, item) => sum + Number(item.sgst || 0), 0));
  const totalUTGST = round2(calculatedItems.reduce((sum, item) => sum + Number(item.utgst || 0), 0));
  const totalIGST = round2(calculatedItems.reduce((sum, item) => sum + Number(item.igst || 0), 0));
  const totalCess = round2(calculatedItems.reduce((sum, item) => sum + Number(item.cess || 0), 0));
  const total = round2(subtotal + totalCGST + totalSGST + totalUTGST + totalIGST + totalCess + Number(voucherLike.roundOff || 0));

  return { items: calculatedItems, subtotal, totalCGST, totalSGST, totalUTGST, totalIGST, totalCess, total };
};

const getVoucherTotals = (voucher) => {
  if (Array.isArray(voucher.items) && voucher.items.length) {
    const itemTaxable = voucher.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const itemCGST = voucher.items.reduce((sum, item) => sum + Number(item.cgst || 0), 0);
    const itemSGST = voucher.items.reduce((sum, item) => sum + Number(item.sgst || 0), 0);
    const itemUTGST = voucher.items.reduce((sum, item) => sum + Number(item.utgst || 0), 0);
    const itemIGST = voucher.items.reduce((sum, item) => sum + Number(item.igst || 0), 0);
    const itemCess = voucher.items.reduce((sum, item) => sum + Number(item.cess || 0), 0);
    return {
      taxable: round2(itemTaxable),
      cgst: round2(itemCGST),
      sgst: round2(itemSGST),
      utgst: round2(itemUTGST),
      igst: round2(itemIGST),
      cess: round2(itemCess),
      total: round2(itemTaxable + itemCGST + itemSGST + itemUTGST + itemIGST + itemCess + Number(voucher.roundOff || 0)),
    };
  }

  return {
    taxable: round2(voucher.subtotal),
    cgst: round2(voucher.totalCGST),
    sgst: round2(voucher.totalSGST),
    utgst: round2(voucher.totalUTGST),
    igst: round2(voucher.totalIGST),
    cess: round2(voucher.totalCess),
    total: round2(voucher.total),
  };
};

const addTotals = (target, totals, sign = 1) => {
  target.taxable = round2(Number(target.taxable || 0) + sign * Number(totals.taxable || 0));
  target.cgst = round2(Number(target.cgst || 0) + sign * Number(totals.cgst || 0));
  target.sgst = round2(Number(target.sgst || 0) + sign * Number(totals.sgst || 0));
  target.utgst = round2(Number(target.utgst || 0) + sign * Number(totals.utgst || 0));
  target.igst = round2(Number(target.igst || 0) + sign * Number(totals.igst || 0));
  target.cess = round2(Number(target.cess || 0) + sign * Number(totals.cess || 0));
  target.total = round2(Number(target.total || 0) + sign * Number(totals.total || 0));
  return target;
};

const emptyTotals = () => ({ taxable: 0, cgst: 0, sgst: 0, utgst: 0, igst: 0, cess: 0, total: 0 });

const addGstr1SummaryTotals = (summary, totals, sign = 1) => {
  summary.totalTaxable = round2(Number(summary.totalTaxable || 0) + sign * Number(totals.taxable || 0));
  summary.totalCGST = round2(Number(summary.totalCGST || 0) + sign * Number(totals.cgst || 0));
  summary.totalSGST = round2(Number(summary.totalSGST || 0) + sign * Number(totals.sgst || 0));
  summary.totalUTGST = round2(Number(summary.totalUTGST || 0) + sign * Number(totals.utgst || 0));
  summary.totalIGST = round2(Number(summary.totalIGST || 0) + sign * Number(totals.igst || 0));
  summary.totalCess = round2(Number(summary.totalCess || 0) + sign * Number(totals.cess || 0));
  summary.totalTax = round2(summary.totalCGST + summary.totalSGST + summary.totalUTGST + summary.totalIGST + summary.totalCess);
  return summary;
};

const invoiceRow = (voucher, section) => {
  const totals = getVoucherTotals(voucher);
  const partyGstin = gstin(voucher.partyGstin || voucher.party?.gstin);
  return {
    section,
    date: voucher.date,
    voucherNo: voucher.voucherNo,
    voucherType: voucher.voucherType,
    party: voucher.party?.name || '',
    gstin: partyGstin,
    placeOfSupply: voucher.placeOfSupply || '',
    taxable: totals.taxable,
    cgst: totals.cgst,
    sgst: totals.sgst,
    utgst: totals.utgst,
    igst: totals.igst,
    cess: totals.cess,
    total: totals.total,
    reverseCharge: Boolean(voucher.reverseCharge),
    irn: voucher.irn || '',
    ewayBillNo: voucher.ewayBillNo || voucher.ewaybill || '',
  };
};

const classifyGstr1Section = (voucher, company = null) => {
  const partyGstin = gstin(voucher.partyGstin || voucher.party?.gstin);
  if (['CreditNote', 'DebitNote'].includes(voucher.voucherType)) return partyGstin ? 'cdnr' : 'cdnur';
  if (partyGstin) return 'b2b';
  if (taxTypeForVoucher(voucher, company) === 'IGST' && Number(voucher.total || 0) > 250000) return 'b2cl';
  return 'b2cs';
};

const getGSTR1Report = async (companyId, query = {}) => {
  const [company, vouchers] = await Promise.all([
    Company.findById(companyId).lean(),
    Voucher.find(dateFilter(companyId, query, { voucherType: { $in: OUTWARD_TYPES } }))
      .populate('party', 'name gstin gstTreatment state')
      .sort({ date: 1 }),
  ]);

  const sections = {
    b2b: [],
    b2cl: [],
    b2cs: [],
    cdnr: [],
    cdnur: [],
    nil: [],
    hsn: [],
  };
  const summary = { totalTaxable: 0, totalCGST: 0, totalSGST: 0, totalUTGST: 0, totalIGST: 0, totalCess: 0, totalTax: 0, invoiceCount: 0 };

  for (const voucher of vouchers) {
    const section = classifyGstr1Section(voucher, company);
    const row = invoiceRow(voucher, section);
    const sign = voucher.voucherType === 'CreditNote' ? -1 : 1;
    sections[section].push(row);
    addGstr1SummaryTotals(summary, {
      taxable: row.taxable,
      cgst: row.cgst,
      sgst: row.sgst,
      utgst: row.utgst,
      igst: row.igst,
      cess: row.cess,
      total: row.total,
    }, sign);
    summary.invoiceCount += 1;

    for (const item of voucher.items || []) {
      if (Number(item.gstRate || 0) === 0) {
        sections.nil.push({
          date: voucher.date,
          voucherNo: voucher.voucherNo,
          party: voucher.party?.name || '',
          hsnCode: item.hsnCode || item.item?.hsnCode || 'N/A',
          taxable: Number(item.amount || 0),
          description: item.item?.name || '',
        });
      }
    }
  }

  sections.hsn = await getHSNSummary(companyId, { ...query, type: 'outward' });
  return { data: sections, summary };
};

const getGSTR3BReport = async (companyId, query = {}) => {
  const [company, vouchers] = await Promise.all([
    Company.findById(companyId).lean(),
    Voucher.find(dateFilter(companyId, query, { voucherType: { $in: GST_VOUCHER_TYPES } }))
      .populate({ path: 'party', select: 'name gstin group', populate: { path: 'group', select: 'name' } })
      .sort({ date: 1 }),
  ]);
  const outward = emptyTotals();
  const inward = emptyTotals();
  const reverseCharge = emptyTotals();
  const nilExempt = emptyTotals();
  const interStateUnregistered = emptyTotals();

  for (const voucher of vouchers) {
    const totals = getVoucherTotals(voucher);
    const sign = voucher.voucherType === 'CreditNote' ? -1 : 1;
    const partyGroup = voucher.party?.group?.name || '';
    const debitNoteIsOutward = voucher.voucherType === 'DebitNote' && partyGroup === 'Sundry Debtors';
    const debitNoteIsInward = voucher.voucherType === 'DebitNote' && !debitNoteIsOutward;

    if (['Sales', 'CreditNote'].includes(voucher.voucherType) || debitNoteIsOutward) {
      addTotals(outward, totals, sign);
      if (!voucher.partyGstin && !voucher.party?.gstin && taxTypeForVoucher(voucher, company) === 'IGST') addTotals(interStateUnregistered, totals, sign);
    }

    if (voucher.voucherType === 'Purchase' || debitNoteIsInward) {
      addTotals(inward, totals, 1);
      if (voucher.reverseCharge) addTotals(reverseCharge, totals, 1);
    }

    for (const item of voucher.items || []) {
      if (Number(item.gstRate || 0) === 0) {
        addTotals(nilExempt, { taxable: Number(item.amount || 0), total: Number(item.amount || 0) }, 1);
      }
    }
  }

  const taxPayable = {
    cgst: round2(Math.max(0, outward.cgst + reverseCharge.cgst - inward.cgst)),
    sgst: round2(Math.max(0, outward.sgst + reverseCharge.sgst - inward.sgst)),
    igst: round2(Math.max(0, outward.igst + reverseCharge.igst - inward.igst)),
    utgst: round2(Math.max(0, outward.utgst + reverseCharge.utgst - inward.utgst)),
    cess: round2(Math.max(0, outward.cess + reverseCharge.cess - inward.cess)),
  };
  taxPayable.total = round2(taxPayable.cgst + taxPayable.sgst + taxPayable.utgst + taxPayable.igst + taxPayable.cess);

  return {
    data: {
      '3.1': { outward, reverseCharge, nilExempt },
      '3.2': { interStateUnregistered },
      '4': { inward },
      '6.1': { taxPayable },
    },
  };
};

const getHSNSummary = async (companyId, query = {}) => {
  const voucherTypes = query.type === 'outward'
    ? OUTWARD_TYPES
    : query.type === 'inward'
      ? INWARD_TYPES
      : ['Sales', 'Purchase', 'CreditNote', 'DebitNote'];
  const vouchers = await Voucher.find(dateFilter(companyId, query, { voucherType: { $in: voucherTypes } }))
    .populate('items.item', 'name hsnCode gstRate')
    .populate('items.unit', 'symbol')
    .select('items voucherType date')
    .sort({ date: 1 });

  const hsnMap = {};
  for (const voucher of vouchers) {
    const sign = voucher.voucherType === 'CreditNote' ? -1 : 1;
    for (const item of voucher.items || []) {
      const hsn = item.hsnCode || item.item?.hsnCode || 'N/A';
      const rate = Number(item.gstRate ?? item.item?.gstRate ?? 0);
      const key = `${hsn}|${rate}`;
      if (!hsnMap[key]) {
        hsnMap[key] = {
          hsnCode: hsn,
          description: item.item?.name || '',
          rate,
          uqc: item.unit?.symbol || '',
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          utgst: 0,
          igst: 0,
          cess: 0,
          total: 0,
        };
      }
      hsnMap[key].qty = round2(hsnMap[key].qty + sign * Number(item.qty || 0));
      hsnMap[key].taxable = round2(hsnMap[key].taxable + sign * Number(item.amount || 0));
      hsnMap[key].cgst = round2(hsnMap[key].cgst + sign * Number(item.cgst || 0));
      hsnMap[key].sgst = round2(hsnMap[key].sgst + sign * Number(item.sgst || 0));
      hsnMap[key].utgst = round2(hsnMap[key].utgst + sign * Number(item.utgst || 0));
      hsnMap[key].igst = round2(hsnMap[key].igst + sign * Number(item.igst || 0));
      hsnMap[key].cess = round2(hsnMap[key].cess + sign * Number(item.cess || 0));
      hsnMap[key].total = round2(hsnMap[key].taxable + hsnMap[key].cgst + hsnMap[key].sgst + hsnMap[key].utgst + hsnMap[key].igst + hsnMap[key].cess);
    }
  }

  return Object.values(hsnMap).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode));
};

const getGstMismatchReport = async (companyId, query = {}) => {
  const vouchers = await Voucher.find(dateFilter(companyId, query, { voucherType: { $in: GST_VOUCHER_TYPES } }))
    .populate('party', 'name gstin')
    .populate('items.item', 'name hsnCode gstRate')
    .sort({ date: 1 });
  const company = await Company.findById(companyId).lean();
  const rows = [];

  const addIssue = (voucher, issue, expected, actual, severity = 'error') => {
    rows.push({
      date: voucher.date,
      voucherNo: voucher.voucherNo,
      voucherType: voucher.voucherType,
      party: voucher.party?.name || '',
      issue,
      expected,
      actual,
      severity,
    });
  };

  for (const voucher of vouchers) {
    const calculated = calculateVoucherTotals(voucher, company);
    const actual = getVoucherTotals(voucher);
    if (money(calculated.subtotal) !== money(voucher.subtotal)) addIssue(voucher, 'Subtotal does not match item taxable value', calculated.subtotal, voucher.subtotal);
    if (money(calculated.totalCGST) !== money(voucher.totalCGST)) addIssue(voucher, 'CGST total mismatch', calculated.totalCGST, voucher.totalCGST);
    if (money(calculated.totalSGST) !== money(voucher.totalSGST)) addIssue(voucher, 'SGST total mismatch', calculated.totalSGST, voucher.totalSGST);
    if (money(calculated.totalUTGST) !== money(voucher.totalUTGST)) addIssue(voucher, 'UTGST total mismatch', calculated.totalUTGST, voucher.totalUTGST);
    if (money(calculated.totalIGST) !== money(voucher.totalIGST)) addIssue(voucher, 'IGST total mismatch', calculated.totalIGST, voucher.totalIGST);
    if (money(calculated.total) !== money(voucher.total)) addIssue(voucher, 'Grand total mismatch', calculated.total, voucher.total);

    for (const [index, item] of (voucher.items || []).entries()) {
      const lineNo = index + 1;
      const expectedTaxType = taxTypeForVoucher(voucher, company);
      const line = calculateLine(item, expectedTaxType);
      if (Number(item.gstRate || 0) > 0 && !(item.hsnCode || item.item?.hsnCode)) {
        addIssue(voucher, `Line ${lineNo}: HSN/SAC missing for taxable item`, 'HSN/SAC', '');
      }
      if (expectedTaxType === 'IGST' && (money(item.cgst) !== 0 || money(item.sgst) !== 0 || money(item.utgst) !== 0)) {
        addIssue(voucher, `Line ${lineNo}: CGST/SGST/UTGST present on IGST invoice`, 'CGST 0, SGST 0, UTGST 0', `${item.cgst || 0}, ${item.sgst || 0}, ${item.utgst || 0}`);
      }
      if (expectedTaxType !== 'IGST' && money(item.igst) !== 0) {
        addIssue(voucher, `Line ${lineNo}: IGST present on intra-state invoice`, 'IGST 0', item.igst || 0);
      }
      if (money(line.taxable) !== money(item.amount)) addIssue(voucher, `Line ${lineNo}: taxable value mismatch`, line.taxable, item.amount);
      if (money(line.cgst) !== money(item.cgst)) addIssue(voucher, `Line ${lineNo}: CGST mismatch`, line.cgst, item.cgst);
      if (money(line.sgst) !== money(item.sgst)) addIssue(voucher, `Line ${lineNo}: SGST mismatch`, line.sgst, item.sgst);
      if (money(line.utgst) !== money(item.utgst)) addIssue(voucher, `Line ${lineNo}: UTGST mismatch`, line.utgst, item.utgst);
      if (money(line.igst) !== money(item.igst)) addIssue(voucher, `Line ${lineNo}: IGST mismatch`, line.igst, item.igst);
    }

    if (!isValidGstin(voucher.partyGstin || voucher.party?.gstin)) {
      addIssue(voucher, 'Party GSTIN format is invalid', 'Valid GSTIN', voucher.partyGstin || voucher.party?.gstin, 'warning');
    }
    if (actual.taxable > 0 && !voucher.placeOfSupply) addIssue(voucher, 'Place of supply is missing', 'Place of supply', '', 'warning');
  }

  return { data: rows, summary: { issueCount: rows.length, errorCount: rows.filter((row) => row.severity === 'error').length } };
};

const getMissingGstinReport = async (companyId, query = {}) => {
  const vouchers = await Voucher.find(dateFilter(companyId, query, { voucherType: { $in: ['Sales', 'Purchase'] } }))
    .populate('party', 'name gstin gstTreatment partyType state email phone')
    .sort({ date: 1 });
  const rows = [];

  for (const voucher of vouchers) {
    const totals = getVoucherTotals(voucher);
    const partyGstin = gstin(voucher.partyGstin || voucher.party?.gstin);
    if (totals.taxable <= 0 || partyGstin) continue;
    rows.push({
      date: voucher.date,
      voucherNo: voucher.voucherNo,
      voucherType: voucher.voucherType,
      party: voucher.party?.name || '',
      gstTreatment: voucher.party?.gstTreatment || '',
      partyType: voucher.party?.partyType || '',
      placeOfSupply: voucher.placeOfSupply || voucher.party?.state || '',
      taxable: totals.taxable,
      tax: round2(totals.cgst + totals.sgst + totals.utgst + totals.igst + totals.cess),
      total: totals.total,
      email: voucher.party?.email || '',
      phone: voucher.party?.phone || '',
    });
  }

  return { data: rows, summary: { missingCount: rows.length, taxable: round2(rows.reduce((sum, row) => sum + row.taxable, 0)) } };
};

const getReverseChargeReport = async (companyId, query = {}) => {
  const vouchers = await Voucher.find(dateFilter(companyId, query, { reverseCharge: true, voucherType: { $in: GST_VOUCHER_TYPES } }))
    .populate('party', 'name gstin')
    .sort({ date: 1 });
  const rows = vouchers.map((voucher) => {
    const totals = getVoucherTotals(voucher);
    return {
      date: voucher.date,
      voucherNo: voucher.voucherNo,
      voucherType: voucher.voucherType,
      party: voucher.party?.name || '',
      gstin: voucher.partyGstin || voucher.party?.gstin || '',
      placeOfSupply: voucher.placeOfSupply || '',
      taxable: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      utgst: totals.utgst,
      igst: totals.igst,
      cess: totals.cess,
      total: totals.total,
    };
  });
  const summary = rows.reduce((acc, row) => addTotals(acc, row), emptyTotals());
  return { data: rows, summary };
};

const validateInvoiceGst = async (payload, companyId) => {
  const errors = [];
  if (!GST_VOUCHER_TYPES.includes(payload.voucherType)) return errors;

  const company = await Company.findById(companyId).lean();
  if (company?.gstin && !isValidGstin(company.gstin)) errors.push('Company GSTIN format is invalid.');
  if (payload.partyGstin && !isValidGstin(payload.partyGstin)) errors.push('Party GSTIN format is invalid.');

  let party = null;
  if (payload.party) {
    party = await Ledger.findOne({ _id: payload.party, company: companyId }).lean();
    if (party?.gstin && !isValidGstin(party.gstin)) errors.push('Party ledger GSTIN format is invalid.');
  }

  const items = Array.isArray(payload.items) ? payload.items.filter((item) => item?.item) : [];
  if (items.length === 0) return errors;

  const calculated = calculateVoucherTotals(payload, company);
  const expectedTaxType = taxTypeForVoucher(payload, company);
  items.forEach((item, index) => {
    const lineNo = index + 1;
    const line = calculateLine(item, expectedTaxType);
    if (Number(item.gstRate || 0) > 0 && !item.hsnCode) {
      errors.push(`Stock line ${lineNo}: HSN/SAC is required for taxable GST items.`);
    }
    if (expectedTaxType === 'IGST' && (money(item.cgst) !== 0 || money(item.sgst) !== 0 || money(item.utgst) !== 0)) {
      errors.push(`Stock line ${lineNo}: IGST invoice cannot have CGST/SGST/UTGST amounts.`);
    }
    if (expectedTaxType !== 'IGST' && money(item.igst) !== 0) {
      errors.push(`Stock line ${lineNo}: intra-state invoice cannot have IGST amount.`);
    }
    if (expectedTaxType === 'UTGST' && money(item.sgst) !== 0) {
      errors.push(`Stock line ${lineNo}: UTGST invoice cannot have SGST amount.`);
    }
    if (expectedTaxType === 'SGST' && money(item.utgst) !== 0) {
      errors.push(`Stock line ${lineNo}: SGST invoice cannot have UTGST amount.`);
    }
    if (money(line.taxable) !== money(item.amount)) errors.push(`Stock line ${lineNo}: taxable amount does not match qty, rate, and discount.`);
    if (money(line.cgst) !== money(item.cgst)) errors.push(`Stock line ${lineNo}: CGST amount does not match GST rate.`);
    if (money(line.sgst) !== money(item.sgst)) errors.push(`Stock line ${lineNo}: SGST amount does not match GST rate.`);
    if (money(line.utgst) !== money(item.utgst)) errors.push(`Stock line ${lineNo}: UTGST amount does not match GST rate.`);
    if (money(line.igst) !== money(item.igst)) errors.push(`Stock line ${lineNo}: IGST amount does not match GST rate.`);
  });

  if (money(calculated.subtotal) !== money(payload.subtotal)) errors.push('Invoice subtotal does not match stock item taxable values.');
  if (money(calculated.totalCGST) !== money(payload.totalCGST)) errors.push('Invoice CGST total does not match stock item taxes.');
  if (money(calculated.totalSGST) !== money(payload.totalSGST)) errors.push('Invoice SGST total does not match stock item taxes.');
  if (money(calculated.totalUTGST) !== money(payload.totalUTGST)) errors.push('Invoice UTGST total does not match stock item taxes.');
  if (money(calculated.totalIGST) !== money(payload.totalIGST)) errors.push('Invoice IGST total does not match stock item taxes.');
  if (money(calculated.total) !== money(payload.total)) errors.push('Invoice grand total does not match GST totals and round off.');

  const partyGstin = payload.partyGstin || party?.gstin;
  if (partyGstin && !isValidGstin(partyGstin)) errors.push('Invoice party GSTIN format is invalid.');
  return errors;
};

const addressParts = (source = {}) => ({
  Gstin: gstin(source.gstin),
  LglNm: source.legalName || source.name || '',
  TrdNm: source.name || source.legalName || '',
  Addr1: source.address || source.billingAddress || '',
  Loc: source.city || '',
  Pin: Number(source.pincode || 0) || undefined,
  Stcd: source.state || '',
  Ph: source.phone || '',
  Em: source.email || '',
});

const buildEInvoiceJson = async (companyId, voucherId) => {
  const company = await Company.findById(companyId).lean();
  const voucher = await Voucher.findOne({ _id: voucherId, company: companyId })
    .populate('party', 'name legalName gstin address billingAddress shippingAddress city state pincode phone email')
    .populate('items.item', 'name hsnCode')
    .populate('items.unit', 'symbol')
    .lean();
  if (!voucher) return null;

  const totals = getVoucherTotals(voucher);
  const taxType = taxTypeForVoucher(voucher, company);
  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: voucher.reverseCharge ? 'B2B' : gstin(voucher.partyGstin || voucher.party?.gstin) ? 'B2B' : 'B2C',
      RegRev: voucher.reverseCharge ? 'Y' : 'N',
      IgstOnIntra: taxType === 'IGST' ? 'Y' : 'N',
    },
    DocDtls: {
      Typ: voucher.voucherType === 'CreditNote' ? 'CRN' : voucher.voucherType === 'DebitNote' ? 'DBN' : 'INV',
      No: voucher.voucherNo,
      Dt: dateOnly(voucher.date),
    },
    SellerDtls: addressParts(company),
    BuyerDtls: {
      ...addressParts({ ...voucher.party, gstin: voucher.partyGstin || voucher.party?.gstin }),
      Pos: voucher.placeOfSupply || voucher.party?.state || '',
    },
    ItemList: (voucher.items || []).map((item, index) => ({
      SlNo: String(index + 1),
      PrdDesc: item.item?.name || item.description || '',
      IsServc: 'N',
      HsnCd: item.hsnCode || item.item?.hsnCode || '',
      Qty: formatAmount(item.qty),
      Unit: item.unit?.symbol || 'NOS',
      UnitPrice: formatAmount(item.rate),
      TotAmt: formatAmount(item.amount),
      AssAmt: formatAmount(item.amount),
      GstRt: formatAmount(item.gstRate),
      IgstAmt: formatAmount(item.igst),
      CgstAmt: formatAmount(item.cgst),
      SgstAmt: formatAmount(Number(item.sgst || 0) + Number(item.utgst || 0)),
      UtgstAmt: formatAmount(item.utgst),
      CesAmt: formatAmount(item.cess),
      TotItemVal: formatAmount(Number(item.amount || 0) + lineTax(item)),
    })),
    ValDtls: {
      AssVal: formatAmount(totals.taxable),
      CgstVal: formatAmount(totals.cgst),
      SgstVal: formatAmount(Number(totals.sgst || 0) + Number(totals.utgst || 0)),
      UtgstVal: formatAmount(totals.utgst),
      IgstVal: formatAmount(totals.igst),
      CesVal: formatAmount(totals.cess),
      RndOffAmt: formatAmount(voucher.roundOff),
      TotInvVal: formatAmount(totals.total),
    },
    EwbDtls: {
      TransId: voucher.transporterId || '',
      TransName: voucher.transporterName || '',
      TransMode: voucher.transportMode || '',
      Distance: Number(voucher.distance || 0) || undefined,
      TransDocNo: voucher.transporterDocNo || '',
      TransDocDt: dateOnly(voucher.transporterDocDate),
      VehNo: voucher.vehicleNo || '',
      VehType: voucher.vehicleType || '',
    },
    ReadyData: {
      irn: voucher.irn || '',
      ackNo: voucher.ackNo || '',
      ackDate: voucher.ackDate || '',
      ewayBillNo: voucher.ewayBillNo || voucher.ewaybill || '',
    },
  };
};

const exportSheets = (reportName, report) => {
  if (reportName === 'gstr1') {
    const sections = report.data || {};
    return Object.entries(sections).map(([name, rows]) => ({ name, rows }));
  }
  if (reportName === 'gstr3b') {
    const data = report.data || {};
    return [{
      name: 'gstr3b',
      rows: [
        { section: '3.1 Outward taxable supplies', ...data['3.1']?.outward },
        { section: '3.1 Reverse charge inward supplies', ...data['3.1']?.reverseCharge },
        { section: '3.1 Nil/exempt/non-GST', ...data['3.1']?.nilExempt },
        { section: '3.2 Inter-state unregistered', ...data['3.2']?.interStateUnregistered },
        { section: '4 Eligible ITC', ...data['4']?.inward },
        { section: '6.1 Tax payable', ...data['6.1']?.taxPayable },
      ],
    }];
  }
  return [{ name: reportName, rows: report.data || report }];
};

module.exports = {
  buildEInvoiceJson,
  calculateVoucherTotals,
  exportSheets,
  getGSTR1Report,
  getGSTR3BReport,
  getGstMismatchReport,
  getHSNSummary,
  getMissingGstinReport,
  getReverseChargeReport,
  isValidGstin,
  validateInvoiceGst,
};
