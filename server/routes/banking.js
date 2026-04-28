const express            = require('express');
const router             = express.Router({ mergeParams: true });
const BankReconciliation = require('../models/BankReconciliation');
const Voucher            = require('../models/Voucher');
const Ledger             = require('../models/Ledger');
const Group              = require('../models/Group');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

// Get all bank ledgers
router.get('/bank-ledgers', async (req, res) => {
  try {
    const bankGroup = await Group.findOne({ company: req.params.companyId, name: 'Bank Accounts' });
    if (!bankGroup) return res.json({ success: true, data: [] });
    const ledgers = await Ledger.find({ company: req.params.companyId, group: bankGroup._id });
    res.json({ success: true, data: ledgers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get unreconciled entries for a bank ledger
router.get('/unreconciled/:bankLedgerId', async (req, res) => {
  try {
    const filter = {
      company: req.params.companyId,
      'entries.ledger': req.params.bankLedgerId,
      isCancelled: false,
    };
    if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
    if (req.query.to)   filter.date = { ...filter.date, $lte: new Date(req.query.to) };

    const vouchers = await Voucher.find(filter).populate('entries.ledger', 'name').sort({ date: 1 });
    const entries  = [];
    for (const v of vouchers) {
      for (const e of v.entries) {
        if (e.ledger?._id?.toString() !== req.params.bankLedgerId) continue;
        const recon = await BankReconciliation.findOne({ voucher: v._id, bankLedger: req.params.bankLedgerId });
        entries.push({
          _id: v._id, date: v.date, voucherType: v.voucherType,
          voucherNo: v.voucherNo, narration: v.narration,
          chequeNo: e.billRef, amount: e.amount, type: e.type,
          isReconciled: recon?.isReconciled || false,
          bankDate: recon?.bankDate || null,
          reconId: recon?._id || null,
        });
      }
    }
    res.json({ success: true, data: entries });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mark as reconciled
router.post('/reconcile', async (req, res) => {
  try {
    const { voucherId, bankLedgerId, bankDate, amount, type, chequeNo } = req.body;
    const recon = await BankReconciliation.findOneAndUpdate(
      { voucher: voucherId, bankLedger: bankLedgerId, company: req.params.companyId },
      { isReconciled: true, bankDate: new Date(bankDate), amount, type, chequeNo, reconDate: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: recon });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Un-reconcile
router.delete('/reconcile/:reconId', async (req, res) => {
  try {
    await BankReconciliation.findByIdAndUpdate(req.params.reconId, { isReconciled: false, bankDate: null, reconDate: null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
