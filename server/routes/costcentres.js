const express     = require('express');
const router      = express.Router({ mergeParams: true });
const CostCentre  = require('../models/CostCentre');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

router.get('/', async (req, res) => {
  try {
    const data = await CostCentre.find({ company: req.params.companyId }).populate('parent', 'name').sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/', async (req, res) => {
  try {
    const data = await CostCentre.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const data = await CostCentre.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    await CostCentre.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
