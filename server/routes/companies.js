const express = require('express');
const router  = express.Router();
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const { seedDefaultMasters } = require('../utils/seedMasters');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const companies = await Company.find({ owner: req.user._id });
    res.json({ success: true, data: companies });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const company = await Company.create({ ...req.body, owner: req.user._id });
    // Seed default Tally groups + ledgers for this company
    await seedDefaultMasters(company._id);
    res.status(201).json({ success: true, data: company });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const company = await Company.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
