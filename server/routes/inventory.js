const express    = require('express');
const router     = express.Router({ mergeParams: true });
const StockGroup = require('../models/StockGroup');
const StockItem  = require('../models/StockItem');
const Unit       = require('../models/Unit');
const Godown     = require('../models/Godown');
const Voucher    = require('../models/Voucher');
const { getValuation, getBatchReport, syncCompanyStockBalances, StockLevelError } = require('../services/stockMovementService');
const { protect, companyAccess } = require('../middleware/auth');
const { withTransaction } = require('../config/db');

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
router.delete('/godowns/:id', async (req, res) => {
  try {
    const godown = await Godown.findOne({ _id: req.params.id, company: req.params.companyId });
    if (godown?.isDefault) return res.status(400).json({ success: false, message: 'Cannot delete the default godown' });
    await Godown.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
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
router.delete('/stock-groups/:id', async (req, res) => {
  try {
    const hasItems = await StockItem.findOne({ group: req.params.id, company: req.params.companyId });
    if (hasItems) return res.status(400).json({ success: false, message: 'Cannot delete: stock items exist in this group' });
    const hasChildren = await StockGroup.findOne({ parent: req.params.id, company: req.params.companyId });
    if (hasChildren) return res.status(400).json({ success: false, message: 'Cannot delete: child groups exist' });
    await StockGroup.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Items ---
router.get('/items', async (req, res) => {
  try {
    const [items, valuation] = await Promise.all([
      StockItem.find({ company: req.params.companyId })
        .populate('group', 'name')
        .populate('unit', 'symbol')
        .sort({ name: 1 }),
      getValuation(req.params.companyId),
    ]);
    const valuationByItem = new Map(valuation.map((row) => [String(row._id), row]));
    const data = items.map((item) => {
      const plain = item.toObject();
      const row = valuationByItem.get(String(plain._id));
      return {
        ...plain,
        currentQty: row ? row.closingQty : Number(plain.currentQty ?? plain.openingQty ?? 0),
        currentRate: row ? row.closingRate : Number(plain.currentRate || 0),
        currentValue: row ? row.closingValue : Number(plain.currentValue || 0),
        inQty: row ? row.inQty : 0,
        outQty: row ? row.outQty : 0,
      };
    });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/items', async (req, res) => {
  try {
    const openingQty = Number(req.body.openingQty || 0);
    const openingRate = Number(req.body.openingRate || req.body.costPrice || req.body.standardCost || 0);
    const data = await StockItem.create({
      ...req.body,
      company: req.params.companyId,
      currentQty: openingQty,
      currentRate: openingRate,
      currentValue: openingQty * openingRate,
    });
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
    const data = await withTransaction(async () => {
      const updated = await StockItem.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
      if (!updated) return null;
      const valuation = await syncCompanyStockBalances(req.params.companyId);
      const row = valuation.find((item) => String(item._id) === String(req.params.id));
      if (row && Number(row.closingQty || 0) < 0) {
        throw new StockLevelError(
          `Cannot save "${updated.name}" because it would make stock negative (${row.closingQty}).`,
          { itemId: req.params.id, itemName: updated.name, availableQty: row.closingQty }
        );
      }
      return updated;
    }, { isolationLevel: 'SERIALIZABLE' });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(err.statusCode || 500).json({ success: false, message: err.message, code: err.code, details: err.details }); }
});
router.delete('/items/:id', async (req, res) => {
  try {
    const used = await Voucher.countDocuments({ company: req.params.companyId, 'items.item': req.params.id });
    if (used) return res.status(400).json({ success: false, message: `Stock item is used in ${used} voucher(s) and cannot be deleted.` });
    await StockItem.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Item Movements (ledger for one item) ---
router.get('/items/:id/movements', async (req, res) => {
  try {
    const item = await StockItem.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('unit', 'symbol').populate('group', 'name');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const vouchers = await Voucher.find({
      company: req.params.companyId,
      'items.item': req.params.id,
      isCancelled: false,
      $or: [
        { status: { $in: ['Submitted', 'Approved'] } },
        { status: { $exists: false } },
      ],
    }).populate('party', 'name').sort({ date: 1, _id: 1 });

    let balance = item.openingQty || 0;
    const movements = [];

    for (const v of vouchers) {
      for (const line of v.items) {
        if (line.item?.toString() !== req.params.id) continue;
        let inQty = 0, outQty = 0;
        if (['Purchase', 'CreditNote', 'ReceiptNote'].includes(v.voucherType)) inQty = line.qty;
        else if (['Sales', 'DebitNote', 'DeliveryNote'].includes(v.voucherType)) outQty = line.qty;
        else if (v.voucherType === 'StockJournal') inQty = line.qty;
        balance += inQty - outQty;
        movements.push({
          date: v.date,
          voucherType: v.voucherType,
          voucherNo: v.voucherNo,
          party: v.party?.name || '',
          inQty, outQty,
          rate: line.rate || 0,
          amount: line.amount || 0,
          balance,
        });
      }
    }

    res.json({ success: true, item, movements, openingQty: item.openingQty || 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- Stock Summary (computed from vouchers + opening stock) ---
router.get('/stock-summary', async (req, res) => {
  try {
    const summary = await getValuation(req.params.companyId, {
      method: req.query.method,
      to: req.query.to,
      saveSnapshot: req.query.snapshot === 'true',
    });
    res.json({ success: true, data: summary });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/valuation', async (req, res) => {
  try {
    const data = await getValuation(req.params.companyId, {
      method: req.query.method,
      to: req.query.to,
      saveSnapshot: req.query.snapshot === 'true',
    });
    res.json({
      success: true,
      data,
      totalValue: data.reduce((sum, row) => sum + Number(row.closingValue || 0), 0),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/batch-report', async (req, res) => {
  try {
    const data = await getBatchReport(req.params.companyId, { expiryTo: req.query.expiryTo });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/expiry-report', async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const expiryTo = new Date();
    expiryTo.setDate(expiryTo.getDate() + days);
    const data = (await getBatchReport(req.params.companyId, { expiryTo }))
      .filter((row) => row.expiry && row.closingQty > 0)
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    res.json({ success: true, data, expiryTo });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reorder', async (req, res) => {
  try {
    const valuation = await getValuation(req.params.companyId, { to: req.query.to });
    const data = valuation
      .filter((row) => {
        const level = Number(row.reorderLevel || row.minimumStock || 0);
        return level > 0 && Number(row.closingQty || 0) <= level;
      })
      .map((row) => ({
        ...row,
        shortage: Math.max(0, Number(row.reorderLevel || row.minimumStock || 0) - Number(row.closingQty || 0)),
      }));
    res.json({ success: true, data, count: data.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
