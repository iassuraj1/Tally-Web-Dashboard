const express        = require('express');
const router         = express.Router({ mergeParams: true });
const Employee       = require('../models/Employee');
const PayHead        = require('../models/PayHead');
const PayrollVoucher = require('../models/PayrollVoucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

// Employees
router.get('/employees', async (req, res) => {
  try {
    const data = await Employee.find({ company: req.params.companyId }).sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/employees', async (req, res) => {
  try {
    const data = await Employee.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/employees/:id', async (req, res) => {
  try {
    const data = await Employee.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/employees/:id', async (req, res) => {
  try {
    const data = await Employee.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/employees/:id', async (req, res) => {
  try {
    await Employee.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Pay Heads
router.get('/pay-heads', async (req, res) => {
  try {
    const data = await PayHead.find({ company: req.params.companyId }).sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/pay-heads', async (req, res) => {
  try {
    const data = await PayHead.create({ ...req.body, company: req.params.companyId });
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/pay-heads/:id', async (req, res) => {
  try {
    const data = await PayHead.findOneAndUpdate({ _id: req.params.id, company: req.params.companyId }, req.body, { new: true });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/pay-heads/:id', async (req, res) => {
  try {
    await PayHead.findOneAndDelete({ _id: req.params.id, company: req.params.companyId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Process payroll
router.post('/process', async (req, res) => {
  try {
    const { employeeId, month, year, payDays = 30, lopDays = 0 } = req.body;
    const employee = await Employee.findOne({ _id: employeeId, company: req.params.companyId });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const payHeads = await PayHead.find({ company: req.params.companyId });
    const lines = [];
    let grossPay = 0, totalDeductions = 0;

    for (const ph of payHeads) {
      let amount = 0;
      const basic = employee.basic * (payDays - lopDays) / 30;
      if (ph.calcType === 'Fixed')                    amount = ph.calcValue * (payDays - lopDays) / 30;
      if (ph.calcType === 'Percentage of Basic')      amount = (basic * ph.calcValue) / 100;
      if (ph.calcType === 'Percentage of Gross')      amount = (employee.ctc * ph.calcValue) / 100;
      amount = Math.round(amount * 100) / 100;
      lines.push({ payHead: ph._id, type: ph.type, amount });
      if (ph.type === 'Earning') grossPay += amount;
      if (ph.type === 'Deduction') totalDeductions += amount;
    }

    // Statutory
    const pfEmployee = employee.pfApplicable   ? Math.round(employee.basic * 0.12) : 0;
    const pfEmployer = employee.pfApplicable   ? Math.round(employee.basic * 0.12) : 0;
    const esicEmp    = employee.esicApplicable ? Math.round(grossPay * 0.0075) : 0;
    const esicEr     = employee.esicApplicable ? Math.round(grossPay * 0.0325) : 0;
    totalDeductions += pfEmployee + esicEmp;
    const netPay = grossPay - totalDeductions;

    const existing = await PayrollVoucher.findOne({ company: req.params.companyId, employee: employeeId, month, year });
    const vData = { company: req.params.companyId, employee: employeeId, month, year, payDays, lopDays, lines, grossPay, totalDeductions, netPay, pfEmployee, pfEmployer, esicEmployee: esicEmp, esicEmployer: esicEr, status: 'Processed' };
    const voucher = existing
      ? await PayrollVoucher.findByIdAndUpdate(existing._id, vData, { new: true })
      : await PayrollVoucher.create(vData);

    await voucher.populate('employee', 'name empCode');
    res.status(201).json({ success: true, data: voucher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// List payroll vouchers
router.get('/payslips', async (req, res) => {
  try {
    const filter = { company: req.params.companyId };
    if (req.query.month)    filter.month    = req.query.month;
    if (req.query.year)     filter.year     = req.query.year;
    if (req.query.employee) filter.employee = req.query.employee;
    const data = await PayrollVoucher.find(filter).populate('employee', 'name empCode designation').sort({ year: -1, month: -1 });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/payslips/:id', async (req, res) => {
  try {
    const data = await PayrollVoucher.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('employee').populate('lines.payHead', 'name type');
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
