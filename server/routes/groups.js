const express = require('express');
const router  = express.Router({ mergeParams: true });
const Group   = require('../models/Group');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ company: req.params.companyId })
      .populate('parent', 'name').sort({ name: 1 });
    res.json({ success: true, data: groups });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const group = await Group.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data: group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      req.body, { new: true }
    );
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: group });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const Ledger = require('../models/Ledger');
    const hasLedgers = await Ledger.countDocuments({ group: req.params.id });
    if (hasLedgers) return res.status(400).json({ success: false, message: 'Cannot delete group with ledgers' });
    await Group.findOneAndDelete({ _id: req.params.id, company: req.params.companyId, isDefault: false });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
