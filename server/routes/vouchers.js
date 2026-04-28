const express = require('express');
const router  = express.Router({ mergeParams: true });
const Voucher = require('../models/Voucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

// Auto-generate voucher number
const getNextVoucherNo = async (companyId, type) => {
  const prefix = { Sales: 'SI', Purchase: 'PI', Payment: 'PAY', Receipt: 'REC',
    Journal: 'JV', Contra: 'CON', CreditNote: 'CN', DebitNote: 'DN', StockJournal: 'SJ' }[type] || 'VCH';
  const last = await Voucher.findOne({ company: companyId, voucherType: type })
    .sort({ voucherNo: -1 }).select('voucherNo');
  if (!last) return `${prefix}-0001`;
  const num = parseInt(last.voucherNo.split('-')[1] || 0) + 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
};

router.get('/', async (req, res) => {
  try {
    const filter = { company: req.params.companyId, isCancelled: false };
    if (req.query.type)  filter.voucherType = req.query.type;
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

router.post('/', async (req, res) => {
  try {
    const voucherNo = req.body.voucherNo || await getNextVoucherNo(req.params.companyId, req.body.voucherType);
    const voucher = await Voucher.create({ ...req.body, company: req.params.companyId, voucherNo });
    await voucher.populate(['party', 'entries.ledger', 'items.item']);
    res.status(201).json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const voucher = await Voucher.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('party', 'name gstin address')
      .populate('entries.ledger', 'name group')
      .populate('items.item', 'name hsnCode gstRate unit')
      .populate('items.unit', 'symbol')
      .populate('items.godown', 'name');
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const voucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId, isCancelled: false },
      req.body, { new: true }
    );
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Cancel voucher
router.patch('/:id/cancel', async (req, res) => {
  try {
    const voucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      { isCancelled: true, cancelReason: req.body.reason },
      { new: true }
    );
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
