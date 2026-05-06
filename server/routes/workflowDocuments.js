const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });
const Counter = require('../models/Counter');
const Ledger = require('../models/Ledger');
const Voucher = require('../models/Voucher');
const WorkflowDocument = require('../models/WorkflowDocument');
const { protect, companyAccess } = require('../middleware/auth');
const { validateVoucher } = require('../services/voucherValidationService');
const { logAudit } = require('../utils/audit');

router.use(protect, companyAccess);

const prefixes = {
  Estimate: 'EST',
  SalesOrder: 'SO',
  DeliveryNote: 'DN',
  PurchaseOrder: 'PO',
  ReceiptNote: 'RN',
};

const voucherTypeFor = {
  DeliveryNote: 'DeliveryNote',
  ReceiptNote: 'ReceiptNote',
  SalesInvoice: 'Sales',
  PurchaseBill: 'Purchase',
  Receipt: 'Receipt',
  Payment: 'Payment',
};

const counterNo = async (company, scope, prefix) => {
  const counter = await Counter.findOneAndUpdate(
    { company, scope },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(4, '0')}`;
};

const isBlank = (value) => typeof value === 'string' && value.trim() === '';

const normalizeOptionalRefs = (line) => {
  const next = { ...line };
  ['item', 'unit', 'godown'].forEach((key) => {
    if (isBlank(next[key])) delete next[key];
  });
  return next;
};

const recalc = (body) => {
  const items = Array.isArray(body.items) ? body.items : [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const nextItems = items.map((rawLine) => {
    const line = normalizeOptionalRefs(rawLine);
    const qty = Number(line.qty || 0);
    const rate = Number(line.rate || 0);
    const discount = Number(line.discount || 0);
    const amount = Number(line.amount ?? (qty * rate - discount));
    const gstRate = Number(line.gstRate || 0) / 100;
    const igst = body.isIGST ? amount * gstRate : 0;
    const cgst = body.isIGST ? 0 : amount * gstRate / 2;
    const sgst = body.isIGST ? 0 : amount * gstRate / 2;
    subtotal += amount;
    totalDiscount += discount;
    totalCGST += cgst;
    totalSGST += sgst;
    totalIGST += igst;
    return { ...line, amount, cgst, sgst, igst };
  });

  const roundOff = Number(body.roundOff || 0);
  return {
    ...body,
    party: isBlank(body.party) ? undefined : body.party,
    items: nextItems,
    subtotal,
    totalDiscount,
    totalCGST,
    totalSGST,
    totalIGST,
    total: subtotal + totalCGST + totalSGST + totalIGST + roundOff,
  };
};

const getLedgerByName = async (company, names) => {
  const ledger = await Ledger.findOne({ company, name: { $in: names } }).select('_id');
  return ledger?._id;
};

const voucherEntries = async (company, type, party, total) => {
  const amount = Number(total || 0);
  if (!amount) return [];

  if (type === 'Sales') {
    const sales = await getLedgerByName(company, ['Sales']);
    return sales ? [
      { ledger: party, type: 'Dr', amount },
      { ledger: sales, type: 'Cr', amount },
    ] : [];
  }
  if (type === 'Purchase') {
    const purchase = await getLedgerByName(company, ['Purchase']);
    return purchase ? [
      { ledger: purchase, type: 'Dr', amount },
      { ledger: party, type: 'Cr', amount },
    ] : [];
  }
  if (type === 'Receipt') {
    const cash = await getLedgerByName(company, ['Cash']);
    return cash ? [
      { ledger: cash, type: 'Dr', amount },
      { ledger: party, type: 'Cr', amount },
    ] : [];
  }
  if (type === 'Payment') {
    const cash = await getLedgerByName(company, ['Cash']);
    return cash ? [
      { ledger: party, type: 'Dr', amount },
      { ledger: cash, type: 'Cr', amount },
    ] : [];
  }
  return [];
};

router.get('/', async (req, res) => {
  try {
    const filter = { company: req.params.companyId };
    if (req.query.flow) filter.flow = req.query.flow;
    if (req.query.type) filter.documentType = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.party) filter.party = req.query.party;
    const docs = await WorkflowDocument.find(filter)
      .populate('party', 'name partyCode gstin phone email')
      .populate('convertedToVoucher', 'voucherType voucherNo total')
      .sort({ date: -1, createdAt: -1 })
      .limit(Math.min(parseInt(req.query.limit, 10) || 300, 1000));
    res.json({ success: true, data: docs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const body = recalc(req.body);
    const documentNo = body.documentNo || await counterNo(
      req.params.companyId,
      `document:${body.documentType}`,
      prefixes[body.documentType] || 'DOC'
    );
    const doc = await WorkflowDocument.create({ ...body, company: req.params.companyId, documentNo });
    await doc.populate('party', 'name partyCode gstin phone email');
    await logAudit({ req, company: req.params.companyId, action: 'workflow_document.created', entityType: 'WorkflowDocument', entityId: doc._id, after: doc.toObject() });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await WorkflowDocument.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('party', 'name partyCode gstin gstTreatment billingAddress shippingAddress address phone email')
      .populate('items.item', 'name hsnCode gstRate unit')
      .populate('items.unit', 'symbol')
      .populate('items.godown', 'name')
      .populate('convertedToVoucher', 'voucherType voucherNo total');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const before = await WorkflowDocument.findOne({ _id: req.params.id, company: req.params.companyId }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Document not found' });
    const doc = await WorkflowDocument.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      recalc(req.body),
      { new: true, runValidators: true }
    ).populate('party', 'name partyCode gstin phone email');
    await logAudit({ req, company: req.params.companyId, action: 'workflow_document.updated', entityType: 'WorkflowDocument', entityId: doc._id, before, after: doc.toObject() });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const doc = await WorkflowDocument.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const filter = { company: req.params.companyId };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) filter._id = req.params.id;
    else filter.documentNo = req.params.id;

    const doc = await WorkflowDocument.findOne(filter);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (doc.convertedToVoucher || doc.convertedToDocument) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a document that has already been converted.',
      });
    }
    await WorkflowDocument.deleteOne({ _id: doc._id, company: req.params.companyId });
    await logAudit({
      req,
      company: req.params.companyId,
      action: 'workflow_document.deleted',
      entityType: 'WorkflowDocument',
      entityId: doc._id,
      before: doc.toObject(),
    });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/convert', async (req, res) => {
  try {
    const doc = await WorkflowDocument.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const target = req.body.target;
    const targetDocumentType = {
      SalesOrder: 'SalesOrder',
      DeliveryNote: 'DeliveryNote',
      ReceiptNote: 'ReceiptNote',
    }[target];

    if (targetDocumentType) {
      const next = await WorkflowDocument.create({
        ...doc.toObject(),
        _id: undefined,
        documentType: targetDocumentType,
        documentNo: await counterNo(req.params.companyId, `document:${targetDocumentType}`, prefixes[targetDocumentType]),
        status: 'draft',
        convertedFrom: doc._id,
        convertedToVoucher: undefined,
        convertedToDocument: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
      doc.convertedToDocument = next._id;
      doc.status = targetDocumentType === 'SalesOrder' ? 'accepted' : 'closed';
      await doc.save();
      return res.status(201).json({ success: true, data: next, kind: 'document' });
    }

    const voucherType = voucherTypeFor[target];
    if (!voucherType) return res.status(400).json({ success: false, message: 'Unsupported conversion target' });
    const voucherNo = await counterNo(req.params.companyId, `voucher:${voucherType}`, { Sales: 'SI', Purchase: 'PI', DeliveryNote: 'DN', ReceiptNote: 'RN', Receipt: 'REC', Payment: 'PAY' }[voucherType] || 'VCH');
    const total = Number(req.body.amount || doc.total || 0);
    const voucherBody = {
      voucherType,
      voucherNo,
      date: req.body.date || new Date(),
      reference: doc.documentNo,
      narration: req.body.narration || `Converted from ${doc.documentNo}`,
      party: doc.party,
      partyGstin: req.body.partyGstin,
      placeOfSupply: doc.placeOfSupply,
      isIGST: doc.isIGST,
      items: ['Sales', 'Purchase', 'DeliveryNote', 'ReceiptNote'].includes(voucherType)
        ? doc.items.filter((item) => item.item)
        : [],
      subtotal: doc.subtotal,
      totalDiscount: doc.totalDiscount,
      totalCGST: doc.totalCGST,
      totalSGST: doc.totalSGST,
      totalIGST: doc.totalIGST,
      roundOff: doc.roundOff,
      total,
      entries: await voucherEntries(req.params.companyId, voucherType, doc.party, total),
    };
    const errors = await validateVoucher(voucherBody, req.params.companyId);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });
    const voucher = await Voucher.create({ ...voucherBody, company: req.params.companyId });
    doc.convertedToVoucher = voucher._id;
    doc.status = voucherType === 'Purchase' ? 'billed' : voucherType === 'Sales' ? 'invoiced' : 'closed';
    await doc.save();
    await logAudit({ req, company: req.params.companyId, action: 'workflow_document.converted', entityType: 'WorkflowDocument', entityId: doc._id, after: { target, voucher: voucher._id } });
    res.status(201).json({ success: true, data: voucher, kind: 'voucher' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
