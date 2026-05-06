const express = require('express');
const router  = express.Router({ mergeParams: true });
const Voucher = require('../models/Voucher');
const Ledger  = require('../models/Ledger');
const Group   = require('../models/Group');
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { sendReportExport } = require('../utils/reportExport');

router.use(protect, companyAccess);
router.use(requirePermission('view_reports'));

const cid = (req) => req.params.companyId;

const exportFilename = (name) => `${name}_${new Date().toISOString().slice(0, 10)}`;

const respondOrExport = (req, res, reportName, payload, sheets, title) => {
  if (!['csv', 'xlsx', 'pdf'].includes(req.query.format)) return res.json({ success: true, ...payload });
  if (!req.companyPermissions?.includes('export_data')) {
    return res.status(403).json({ success: false, message: 'Permission required: export_data' });
  }
  return sendReportExport(res, exportFilename(reportName), sheets, req.query.format, title || reportName);
};

const moneyDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

// Build ledger balance map from vouchers
const buildBalances = async (companyId, toDate, fromDate) => {
  const filter = { company: companyId, isCancelled: false, status: 'Approved' };
  if (toDate)   filter.date = { $lte: new Date(toDate) };
  if (fromDate) filter.date = { ...filter.date, $gte: new Date(fromDate) };

  const vouchers = await Voucher.find(filter).select('entries');
  const ledgers  = await Ledger.find({ company: companyId }).populate('group', 'nature isPrimary affectsGross name');

  const balMap = {}; // ledgerId -> { name, group, nature, balance (Dr positive) }
  for (const l of ledgers) {
    const openingSign = l.openingBalanceType === 'Dr' ? 1 : -1;
    balMap[l._id.toString()] = {
      _id: l._id, name: l.name,
      groupId: l.group?._id?.toString(), groupName: l.group?.name,
      nature: l.group?.nature, affectsGross: l.group?.affectsGross,
      balance: l.openingBalance * openingSign,
    };
  }
  for (const v of vouchers) {
    for (const e of v.entries) {
      const id = e.ledger?.toString();
      if (!balMap[id]) continue;
      balMap[id].balance += e.type === 'Dr' ? e.amount : -e.amount;
    }
  }
  return balMap;
};

// GET /reports/trial-balance
router.get('/trial-balance', async (req, res) => {
  try {
    const balMap = await buildBalances(cid(req), req.query.to, req.query.from);
    const rows = Object.values(balMap)
      .filter((l) => l.balance !== 0)
      .map((l) => ({
        ledger: l.name, group: l.groupName, nature: l.nature,
        debit: l.balance > 0 ? l.balance : 0,
        credit: l.balance < 0 ? -l.balance : 0,
      }))
      .sort((a, b) => a.ledger.localeCompare(b.ledger));
    const totDebit  = rows.reduce((s, r) => s + r.debit,  0);
    const totCredit = rows.reduce((s, r) => s + r.credit, 0);
    return respondOrExport(req, res, 'trial_balance', {
      data: rows,
      totals: { debit: totDebit, credit: totCredit },
    }, [{
      name: 'trial_balance',
      rows: [...rows, { ledger: 'Total', group: '', nature: '', debit: totDebit, credit: totCredit }],
    }], 'Trial Balance');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/balance-sheet
router.get('/balance-sheet', async (req, res) => {
  try {
    const balMap = await buildBalances(cid(req), req.query.to);
    const result = { assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0 };
    for (const l of Object.values(balMap)) {
      if (!l.balance) continue;
      const entry = { name: l.name, group: l.groupName, amount: Math.abs(l.balance) };
      if (l.nature === 'Assets')      { result.assets.push(entry);      result.totalAssets      += Math.abs(l.balance); }
      if (l.nature === 'Liabilities') { result.liabilities.push(entry); result.totalLiabilities += Math.abs(l.balance); }
    }
    return respondOrExport(req, res, 'balance_sheet', { data: result }, [{
      name: 'balance_sheet',
      rows: [
        ...result.liabilities.map((row) => ({ section: 'Liabilities', ...row })),
        { section: 'Liabilities', name: 'Total Liabilities', group: '', amount: result.totalLiabilities },
        ...result.assets.map((row) => ({ section: 'Assets', ...row })),
        { section: 'Assets', name: 'Total Assets', group: '', amount: result.totalAssets },
      ],
    }], 'Balance Sheet');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/profit-loss
router.get('/profit-loss', async (req, res) => {
  try {
    const balMap = await buildBalances(cid(req), req.query.to, req.query.from);
    const result = { income: [], expenses: [], grossProfit: 0, netProfit: 0, totalIncome: 0, totalExpenses: 0 };
    for (const l of Object.values(balMap)) {
      if (!l.balance) continue;
      const entry = { name: l.name, group: l.groupName, amount: Math.abs(l.balance), affectsGross: l.affectsGross };
      if (l.nature === 'Income')   { result.income.push(entry);   result.totalIncome   += Math.abs(l.balance); }
      if (l.nature === 'Expenses') { result.expenses.push(entry); result.totalExpenses += Math.abs(l.balance); }
    }
    const grossIncome   = result.income.filter(i => i.affectsGross).reduce((s, i) => s + i.amount, 0);
    const grossExpenses = result.expenses.filter(i => i.affectsGross).reduce((s, i) => s + i.amount, 0);
    result.grossProfit = grossIncome - grossExpenses;
    result.netProfit   = result.totalIncome - result.totalExpenses;
    return respondOrExport(req, res, 'profit_loss', { data: result }, [{
      name: 'profit_loss',
      rows: [
        ...result.income.map((row) => ({ section: 'Income', ...row })),
        { section: 'Income', name: 'Total Income', group: '', amount: result.totalIncome },
        ...result.expenses.map((row) => ({ section: 'Expenses', ...row })),
        { section: 'Expenses', name: 'Total Expenses', group: '', amount: result.totalExpenses },
        { section: 'Summary', name: 'Gross Profit', group: '', amount: result.grossProfit },
        { section: 'Summary', name: 'Net Profit', group: '', amount: result.netProfit },
      ],
    }], 'Profit and Loss');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/ledger/:ledgerId — Ledger report (account statement)
router.get('/ledger/:ledgerId', async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.ledgerId, company: cid(req) }).populate('group', 'nature');
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });

    const filter = { company: cid(req), 'entries.ledger': req.params.ledgerId, isCancelled: false, status: 'Approved' };
    if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
    if (req.query.to)   filter.date = { ...filter.date, $lte: new Date(req.query.to) };

    const vouchers = await Voucher.find(filter)
      .populate('entries.ledger', 'name').sort({ date: 1 });

    let runningBalance = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : -ledger.openingBalance;
    const rows = [];
    for (const v of vouchers) {
      for (const e of v.entries) {
        if (e.ledger?._id?.toString() !== req.params.ledgerId) continue;
        const sign    = e.type === 'Dr' ? 1 : -1;
        runningBalance += sign * e.amount;
        rows.push({
          date: v.date, voucherType: v.voucherType, voucherNo: v.voucherNo,
          narration: v.narration || e.narration,
          debit: e.type === 'Dr' ? e.amount : 0,
          credit: e.type === 'Cr' ? e.amount : 0,
          balance: Math.abs(runningBalance),
          balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
        });
      }
    }
    return respondOrExport(req, res, `ledger_${ledger.name}`, {
      ledger: { name: ledger.name, openingBalance: ledger.openingBalance, openingType: ledger.openingBalanceType },
      data: rows,
    }, [{
      name: 'ledger',
      rows: rows.map((row) => ({ ...row, date: moneyDate(row.date) })),
    }], `Ledger Report - ${ledger.name}`);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/daybook
router.get('/daybook', async (req, res) => {
  try {
    const filter = { company: cid(req), isCancelled: false, status: 'Approved' };
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else {
      if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
      if (req.query.to)   filter.date = { ...filter.date, $lte: new Date(req.query.to) };
    }
    const vouchers = await Voucher.find(filter)
      .populate('party', 'name').populate('entries.ledger', 'name').sort({ date: 1 });
    return respondOrExport(req, res, 'daybook', { data: vouchers }, [{
      name: 'daybook',
      rows: vouchers.map((voucher) => ({
        date: moneyDate(voucher.date),
        voucherType: voucher.voucherType,
        voucherNo: voucher.voucherNo,
        party: voucher.party?.name || '',
        narration: voucher.narration || '',
        entries: (voucher.entries || []).map((entry) => `${entry.ledger?.name || ''} ${entry.type} ${entry.amount}`).join('; '),
        total: voucher.total,
        status: voucher.status,
      })),
    }], 'Day Book');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/outstanding?type=receivable|payable
router.get('/outstanding', async (req, res) => {
  try {
    const type      = req.query.type || 'receivable'; // receivable = debtors, payable = creditors
    const groupName = type === 'receivable' ? 'Sundry Debtors' : 'Sundry Creditors';
    const group = await Group.findOne({ company: cid(req), name: groupName });
    if (!group) return respondOrExport(req, res, `outstanding_${type}`, { data: [], total: 0 }, [{ name: 'outstanding', rows: [] }], 'Outstanding');

    const ledgers  = await Ledger.find({ company: cid(req), group: group._id });
    const balMap   = await buildBalances(cid(req), req.query.to);
    const result   = [];
    for (const l of ledgers) {
      const bal = balMap[l._id.toString()];
      if (!bal || !bal.balance) continue;
      result.push({ ledger: l.name, _id: l._id, balance: Math.abs(bal.balance), type: bal.balance >= 0 ? 'Dr' : 'Cr', phone: l.phone, email: l.email });
    }
    const total = result.reduce((s, r) => s + r.balance, 0);
    return respondOrExport(req, res, `outstanding_${type}`, { data: result, total }, [{
      name: 'outstanding',
      rows: [...result, { ledger: 'Total Outstanding', balance: total }],
    }], type === 'receivable' ? 'Sundry Receivables' : 'Sundry Payables');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /reports/cash-flow
router.get('/cash-flow', async (req, res) => {
  try {
    const filter = { company: cid(req), voucherType: { $in: ['Payment', 'Receipt', 'Contra'] }, isCancelled: false, status: 'Approved' };
    if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
    if (req.query.to)   filter.date = { ...filter.date, $lte: new Date(req.query.to) };
    const vouchers = await Voucher.find(filter).populate('entries.ledger', 'name group').sort({ date: 1 });
    const inflow = [], outflow = [];
    for (const v of vouchers) {
      for (const e of v.entries) {
        if (v.voucherType === 'Receipt' && e.type === 'Dr')  inflow.push({ date: v.date, ledger: e.ledger?.name, amount: e.amount, narration: v.narration });
        if (v.voucherType === 'Payment' && e.type === 'Cr') outflow.push({ date: v.date, ledger: e.ledger?.name, amount: e.amount, narration: v.narration });
      }
    }
    const payload = {
      inflow,
      outflow,
      totalInflow: inflow.reduce((s, i) => s + i.amount, 0),
      totalOutflow: outflow.reduce((s, o) => s + o.amount, 0),
    };
    return respondOrExport(req, res, 'cash_flow', { data: payload }, [
      { name: 'inflow', rows: inflow.map((row) => ({ ...row, date: moneyDate(row.date) })) },
      { name: 'outflow', rows: outflow.map((row) => ({ ...row, date: moneyDate(row.date) })) },
      { name: 'summary', rows: [{ totalInflow: payload.totalInflow, totalOutflow: payload.totalOutflow, netFlow: payload.totalInflow - payload.totalOutflow }] },
    ], 'Cash Flow');
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
