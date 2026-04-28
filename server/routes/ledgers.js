const express = require('express');
const router  = express.Router({ mergeParams: true });
const Ledger  = require('../models/Ledger');
const Voucher = require('../models/Voucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

const cid = (req) => req.params.companyId;

// Compute balance for one or many ledgers from vouchers
const computeBalances = async (companyId, ledgerIds) => {
  const vouchers = await Voucher.find({ company: companyId, isCancelled: false }).select('entries');
  const map = {};
  for (const id of ledgerIds) map[id.toString()] = 0;
  for (const v of vouchers) {
    for (const e of v.entries) {
      const id = e.ledger?.toString();
      if (id && map[id] !== undefined) {
        map[id] += e.type === 'Dr' ? e.amount : -e.amount;
      }
    }
  }
  return map; // positive = Dr balance, negative = Cr balance
};

// GET /ledgers
router.get('/', async (req, res) => {
  try {
    const filter = { company: cid(req) };
    if (req.query.group)    filter.group    = req.query.group;
    if (req.query.nature)   { /* join via group */ }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const ledgers = await Ledger.find(filter).populate('group', 'name nature affectsGross isPrimary').sort({ name: 1 });

    // Optionally include live balances
    if (req.query.withBalance === 'true') {
      const ids = ledgers.map(l => l._id);
      const balMap = await computeBalances(cid(req), ids);
      const result = ledgers.map(l => {
        const txnBal = balMap[l._id.toString()] || 0;
        const openBal = l.openingBalanceType === 'Dr' ? l.openingBalance : -l.openingBalance;
        const total   = openBal + txnBal;
        return {
          ...l.toObject(),
          currentBalance: Math.abs(total),
          currentBalanceType: total >= 0 ? 'Dr' : 'Cr',
        };
      });
      return res.json({ success: true, data: result });
    }

    res.json({ success: true, data: ledgers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /ledgers
router.post('/', async (req, res) => {
  try {
    const ledger = await Ledger.create({ ...req.body, company: cid(req) });
    await ledger.populate('group', 'name nature');
    res.status(201).json({ success: true, data: ledger });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /ledgers/:id  — with balance + last transactions
router.get('/:id', async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, company: cid(req) }).populate('group', 'name nature');
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });

    // Compute current balance
    const balMap  = await computeBalances(cid(req), [ledger._id]);
    const txnBal  = balMap[ledger._id.toString()] || 0;
    const openBal = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : -ledger.openingBalance;
    const total   = openBal + txnBal;

    // Last 10 transactions
    const vouchers = await Voucher.find({ company: cid(req), 'entries.ledger': ledger._id, isCancelled: false })
      .populate('entries.ledger', 'name').sort({ date: -1 }).limit(10);

    const transactions = [];
    let running = openBal;
    for (const v of [...vouchers].reverse()) {
      for (const e of v.entries) {
        if (e.ledger?._id?.toString() !== req.params.id) continue;
        running += e.type === 'Dr' ? e.amount : -e.amount;
        transactions.push({
          date: v.date, voucherType: v.voucherType, voucherNo: v.voucherNo,
          narration: v.narration, debit: e.type === 'Dr' ? e.amount : 0,
          credit: e.type === 'Cr' ? e.amount : 0,
          balance: Math.abs(running), balanceType: running >= 0 ? 'Dr' : 'Cr',
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...ledger.toObject(),
        currentBalance: Math.abs(total),
        currentBalanceType: total >= 0 ? 'Dr' : 'Cr',
        transactions: transactions.reverse(),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /ledgers/:id
router.put('/:id', async (req, res) => {
  try {
    const ledger = await Ledger.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      req.body, { new: true, runValidators: true }
    ).populate('group', 'name nature');
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });
    res.json({ success: true, data: ledger });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /ledgers/:id/toggle-active  — activate / deactivate
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, company: cid(req) });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });
    ledger.isActive = !ledger.isActive;
    await ledger.save();
    res.json({ success: true, data: ledger });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /ledgers/:id
router.delete('/:id', async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, company: cid(req) });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });
    if (ledger.isDefault) return res.status(400).json({ success: false, message: 'Default ledgers cannot be deleted' });
    const used = await Voucher.countDocuments({ company: cid(req), 'entries.ledger': req.params.id });
    if (used) return res.status(400).json({ success: false, message: `Ledger is used in ${used} voucher(s) — cannot delete` });
    await ledger.deleteOne();
    res.json({ success: true, message: 'Ledger deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
