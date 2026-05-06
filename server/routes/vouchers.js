const express = require('express');
const router  = express.Router({ mergeParams: true });
const Voucher = require('../models/Voucher');
const Counter = require('../models/Counter');
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { validateVoucher, validateVoucherEditWindow } = require('../services/voucherValidationService');
const { dispatchWebhooks } = require('../services/advancedService');
const { logAudit } = require('../utils/audit');

router.use(protect, companyAccess);

// Auto-generate voucher number
const getNextVoucherNo = async (companyId, type) => {
  const prefix = { Sales: 'SI', Purchase: 'PI', Payment: 'PAY', Receipt: 'REC',
    Journal: 'JV', Contra: 'CON', CreditNote: 'CN', DebitNote: 'DBN', StockJournal: 'SJ',
    DeliveryNote: 'DN', ReceiptNote: 'RN' }[type] || 'VCH';
  const counter = await Counter.findOneAndUpdate(
    { company: companyId, scope: `voucher:${type}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(4, '0')}`;
};

router.get('/', async (req, res) => {
  try {
    const filter = { company: req.params.companyId };
    if (req.query.includeCancelled !== 'true') filter.isCancelled = false;
    if (req.query.type)  filter.voucherType = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from)  filter.date = { $gte: new Date(req.query.from) };
    if (req.query.to)    filter.date = { ...filter.date, $lte: new Date(req.query.to) };
    if (req.query.party) filter.party = req.query.party;
    const vouchers = await Voucher.find(filter)
      .populate('party', 'name')
      .populate('entries.ledger', 'name')
      .sort({ date: -1 })
      .limit(parseInt(req.query.limit) || 200);
    res.json({ success: true, data: vouchers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/approval-queue', requirePermission('approve_vouchers'), async (req, res) => {
  try {
    const filter = {
      company: req.params.companyId,
      isCancelled: false,
      $or: [{ status: 'Submitted' }, { status: { $exists: false } }],
    };
    if (req.query.type) filter.voucherType = req.query.type;
    const vouchers = await Voucher.find(filter)
      .populate('party', 'name')
      .populate('submittedBy', 'name email')
      .sort({ date: 1, createdAt: 1 })
      .limit(parseInt(req.query.limit, 10) || 200);
    res.json({ success: true, data: vouchers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', requirePermission('create_vouchers'), async (req, res) => {
  try {
    if (req.body.status === 'Approved' && !req.companyPermissions?.includes('approve_vouchers')) {
      return res.status(403).json({ success: false, message: 'Permission required: approve_vouchers' });
    }
    const validationErrors = await validateVoucher(req.body, req.params.companyId);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(' '),
        errors: validationErrors,
      });
    }

    const voucherNo = req.body.voucherNo || await getNextVoucherNo(req.params.companyId, req.body.voucherType);
    const status = req.body.status || 'Submitted';
    const voucher = await Voucher.create({
      ...req.body,
      company: req.params.companyId,
      voucherNo,
      status,
      submittedAt: status === 'Submitted' ? new Date() : req.body.submittedAt,
      submittedBy: status === 'Submitted' ? req.user._id : req.body.submittedBy,
      approvedAt: status === 'Approved' ? new Date() : req.body.approvedAt,
      approvedBy: status === 'Approved' ? req.user._id : req.body.approvedBy,
    });
    await voucher.populate(['party', 'entries.ledger', 'items.item']);
    await logAudit({
      req,
      company: req.params.companyId,
      action: 'voucher.created',
      entityType: 'Voucher',
      entityId: voucher._id,
      after: voucher.toObject(),
    });
    dispatchWebhooks(req.params.companyId, 'voucher.created', {
      event: 'voucher.created',
      voucher: { id: voucher._id, voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, total: voucher.total },
    }).catch(() => {});
    res.status(201).json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/approval', async (req, res) => {
  try {
    const action = req.body.action;
    const allowed = ['draft', 'submit', 'approve', 'reject'];
    if (!allowed.includes(action)) return res.status(400).json({ success: false, message: 'Invalid approval action' });
    if (['approve', 'reject'].includes(action) && !req.companyPermissions?.includes('approve_vouchers')) {
      return res.status(403).json({ success: false, message: 'Permission required: approve_vouchers' });
    }
    if (['draft', 'submit'].includes(action) && !req.companyPermissions?.includes('edit_vouchers')) {
      return res.status(403).json({ success: false, message: 'Permission required: edit_vouchers' });
    }

    const existingVoucher = await Voucher.findOne({ _id: req.params.id, company: req.params.companyId, isCancelled: false }).lean();
    if (!existingVoucher) return res.status(404).json({ success: false, message: 'Voucher not found' });

    if (['submit', 'approve'].includes(action)) {
      const validationErrors = await validateVoucher(
        { ...existingVoucher, status: action === 'approve' ? 'Approved' : 'Submitted' },
        req.params.companyId
      );
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors.join(' '),
          errors: validationErrors,
        });
      }
    }

    const update = {};
    if (action === 'draft') {
      update.status = 'Draft';
      update.$unset = { submittedAt: '', submittedBy: '', approvedAt: '', approvedBy: '', rejectedAt: '', rejectedBy: '', rejectionReason: '' };
    }
    if (action === 'submit') {
      update.status = 'Submitted';
      update.submittedAt = new Date();
      update.submittedBy = req.user._id;
      update.$unset = { approvedAt: '', approvedBy: '', rejectedAt: '', rejectedBy: '', rejectionReason: '' };
    }
    if (action === 'approve') {
      update.status = 'Approved';
      update.approvedAt = new Date();
      update.approvedBy = req.user._id;
      update.$unset = { rejectedAt: '', rejectedBy: '', rejectionReason: '' };
    }
    if (action === 'reject') {
      update.status = 'Rejected';
      update.rejectedAt = new Date();
      update.rejectedBy = req.user._id;
      update.rejectionReason = req.body.reason || '';
      update.$unset = { approvedAt: '', approvedBy: '' };
    }

    const voucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId, isCancelled: false },
      update,
      { new: true, runValidators: true }
    ).populate('party', 'name');
    await logAudit({
      req,
      company: req.params.companyId,
      action: `voucher.${action}`,
      entityType: 'Voucher',
      entityId: voucher._id,
      before: existingVoucher,
      after: voucher.toObject(),
      metadata: { reason: req.body.reason },
    });
    if (['approve', 'reject', 'submit'].includes(action)) {
      dispatchWebhooks(req.params.companyId, `voucher.${action}`, {
        event: `voucher.${action}`,
        voucher: { id: voucher._id, voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, total: voucher.total },
      }).catch(() => {});
    }
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const voucher = await Voucher.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('party', 'name partyCode gstin gstTreatment address billingAddress shippingAddress phone email')
      .populate('entries.ledger', 'name group')
      .populate('entries.project', 'name code')
      .populate('items.item', 'name hsnCode gstRate unit')
      .populate('items.unit', 'symbol')
      .populate('items.godown', 'name');
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', requirePermission('edit_vouchers'), async (req, res) => {
  try {
    const existingVoucher = await Voucher.findOne({
      _id: req.params.id,
      company: req.params.companyId,
      isCancelled: false,
    }).lean();
    if (!existingVoucher) return res.status(404).json({ success: false, message: 'Voucher not found' });

    const existingPeriodErrors = await validateVoucherEditWindow(existingVoucher.date, req.params.companyId);
    if (existingPeriodErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: existingPeriodErrors.join(' '),
        errors: existingPeriodErrors,
      });
    }

    const validationErrors = await validateVoucher(
      { ...existingVoucher, ...req.body, company: req.params.companyId },
      req.params.companyId
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(' '),
        errors: validationErrors,
      });
    }

    const voucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId, isCancelled: false },
      req.body, { new: true, runValidators: true }
    );
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    await logAudit({
      req,
      company: req.params.companyId,
      action: 'voucher.updated',
      entityType: 'Voucher',
      entityId: voucher._id,
      before: existingVoucher,
      after: voucher.toObject(),
    });
    dispatchWebhooks(req.params.companyId, 'voucher.updated', {
      event: 'voucher.updated',
      voucher: { id: voucher._id, voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, total: voucher.total },
    }).catch(() => {});
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Cancel voucher
router.patch('/:id/cancel', requirePermission('cancel_vouchers'), async (req, res) => {
  try {
    const existingVoucher = await Voucher.findOne({
      _id: req.params.id,
      company: req.params.companyId,
      isCancelled: false,
    }).lean();
    if (!existingVoucher) return res.status(404).json({ success: false, message: 'Voucher not found' });

    const existingPeriodErrors = await validateVoucherEditWindow(existingVoucher.date, req.params.companyId);
    if (existingPeriodErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: existingPeriodErrors.join(' '),
        errors: existingPeriodErrors,
      });
    }

    const voucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      { isCancelled: true, cancelReason: req.body.reason },
      { new: true }
    );
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    await logAudit({
      req,
      company: req.params.companyId,
      action: 'voucher.cancelled',
      entityType: 'Voucher',
      entityId: voucher._id,
      before: existingVoucher,
      after: voucher.toObject(),
      metadata: { reason: req.body.reason },
    });
    dispatchWebhooks(req.params.companyId, 'voucher.cancelled', {
      event: 'voucher.cancelled',
      voucher: { id: voucher._id, voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, total: voucher.total },
    }).catch(() => {});
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
