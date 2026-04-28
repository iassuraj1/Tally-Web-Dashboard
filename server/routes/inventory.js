const express    = require('express');
const router     = express.Router({ mergeParams: true });
const StockGroup = require('../models/StockGroup');
const StockItem  = require('../models/StockItem');
const Unit       = require('../models/Unit');
const Godown     = require('../models/Godown');
const Voucher    = require('../models/Voucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

// --- Units ---
router.get('/units', async (req, res) => {
  try {
    const data = await Unit.find({ company: req.params.companyId }).sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/units', async (req, res) => {
  try {
    const data = await Unit.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/units/:id', async (req, res) => {
  try {
    const data = await Unit.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/units/:id', async (req, res) => {
  try {
    await Unit.findOneAndDelete({ _id: req.params.id, company: req.params.companyId, isDefault: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Godowns ---
router.get('/godowns', async (req, res) => {
  try {
    const data = await Godown.find({ company: req.params.companyId }).populate('parent', 'name').sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/godowns', async (req, res) => {
  try {
    const data = await Godown.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/godowns/:id', async (req, res) => {
  try {
    const data = await Godown.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Groups ---
router.get('/stock-groups', async (req, res) => {
  try {
    const data = await StockGroup.find({ company: req.params.companyId }).populate('parent', 'name').sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/stock-groups', async (req, res) => {
  try {
    const data = await StockGroup.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/stock-groups/:id', async (req, res) => {
  try {
    const data = await StockGroup.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Items ---
router.get('/items', async (req, res) => {
  try {
    const data = await StockItem.find({ company: req.params.companyId })
      .populate('group', 'name').populate('unit', 'symbol').sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/items', async (req, res) => {
  try {
    const data = await StockItem.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/items/:id', async (req, res) => {
  try {
    const data = await StockItem.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('group', 'name').populate('unit', 'name symbol').populate('openingGodown', 'name');
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/items/:id', async (req, res) => {
  try {
    const data = await StockItem.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/items/:id', async (req, res) => {
  try {
    await StockItem.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Summary (computed from vouchers + opening stock) ---
router.get('/stock-summary', async (req, res) => {
  try {
    const items = await StockItem.find({ company: req.params.companyId }).populate('unit', 'symbol');
    const vouchers = await Voucher.find({
      company: req.params.companyId,
      voucherType: { $in: ['Sales', 'Purchase', 'StockJournal', 'DeliveryNote', 'ReceiptNote'] },
      isCancelled: false,
    }).select('voucherType items');

    const stockMap = {};
    for (const item of items) {
      stockMap[item._id.toString()] = {
        _id: item._id, name: item.name, unit: item.unit?.symbol || '',
        openingQty: item.openingQty, inQty: 0, outQty: 0, rate: item.costPrice,
        hsnCode: item.hsnCode,
      };
    }
    for (const v of vouchers) {
      for (const line of v.items) {
        const id = line.item?.toString();
        if (!stockMap[id]) continue;
        if (['Purchase', 'ReceiptNote'].includes(v.voucherType)) {
          stockMap[id].inQty += line.qty;
          stockMap[id].rate   = line.rate;
        } else if (['Sales', 'DeliveryNote'].includes(v.voucherType)) {
          stockMap[id].outQty += line.qty;
        }
      }
    }
    const summary = Object.values(stockMap).map((s) => ({
      ...s,
      closingQty: s.openingQty + s.inQty - s.outQty,
      closingValue: (s.openingQty + s.inQty - s.outQty) * s.rate,
    }));
    res.json({ success: true, data: summary });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
