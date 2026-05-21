const express = require('express');
const router = express.Router({ mergeParams: true });
const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');
const StockItem = require('../models/StockItem');
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { getGSTR3BReport } = require('../services/gstService');
const { getValuation } = require('../services/stockMovementService');

router.use(protect, companyAccess);

const CASH_BANK_GROUPS = new Set(['Cash-in-Hand', 'Bank Accounts']);

const VOUCHER_SLUGS = {
  Sales: 'sales',
  Purchase: 'purchase',
  Payment: 'payment',
  Receipt: 'receipt',
  Journal: 'journal',
  Contra: 'contra',
  CreditNote: 'credit-note',
  DebitNote: 'debit-note',
  StockJournal: 'stock-journal',
};

const STATIC_COMMANDS = [
  { type: 'command', label: 'Dashboard', subtitle: 'Business overview', href: '/app' },
  { type: 'voucher', label: 'New Sales Invoice', subtitle: 'Create a sales voucher', href: '/app/vouchers/sales' },
  { type: 'voucher', label: 'New Purchase Invoice', subtitle: 'Create a purchase voucher', href: '/app/vouchers/purchase' },
  { type: 'voucher', label: 'New Payment', subtitle: 'Create a payment voucher', href: '/app/vouchers/payment' },
  { type: 'voucher', label: 'New Receipt', subtitle: 'Create a receipt voucher', href: '/app/vouchers/receipt' },
  { type: 'approval', label: 'Approval Queue', subtitle: 'Submitted vouchers waiting for approval', href: '/app/vouchers/approvals' },
  { type: 'master', label: 'Ledgers', subtitle: 'Ledger master list', href: '/app/masters/ledgers' },
  { type: 'master', label: 'Stock Items', subtitle: 'Inventory item master', href: '/app/masters/stock-items' },
  { type: 'command', label: 'Accounting Controls', subtitle: 'Financial years, voucher locks, and audit trail', href: '/app/settings/accounting-controls' },
  { type: 'command', label: 'Import Masters', subtitle: 'CSV and Excel import with preview', href: '/app/tools/import-masters' },
  { type: 'command', label: 'Backup & Restore', subtitle: 'Company JSON backup archive', href: '/app/tools/backup' },
  { type: 'command', label: 'Advanced Features', subtitle: 'Sharing, recurring invoices, budgets, projects, API keys, and webhooks', href: '/app/tools/advanced' },
];

const STATIC_REPORTS = [
  { type: 'report', label: 'Day Book', subtitle: 'Voucher register', href: '/app/reports/daybook' },
  { type: 'report', label: 'Trial Balance', subtitle: 'Debit and credit balances', href: '/app/reports/trial-balance' },
  { type: 'report', label: 'Balance Sheet', subtitle: 'Assets and liabilities', href: '/app/reports/balance-sheet' },
  { type: 'report', label: 'Profit & Loss', subtitle: 'Income and expenses', href: '/app/reports/profit-loss' },
  { type: 'report', label: 'Ledger Report', subtitle: 'Account statement', href: '/app/reports/ledger' },
  { type: 'report', label: 'Receivables', subtitle: 'Outstanding customer balances', href: '/app/reports/receivables' },
  { type: 'report', label: 'Payables', subtitle: 'Outstanding vendor balances', href: '/app/reports/payables' },
  { type: 'report', label: 'Cash Flow', subtitle: 'Receipts and payments', href: '/app/reports/cash-flow' },
  { type: 'report', label: 'GSTR-1', subtitle: 'Outward supply return sections', href: '/app/gst/gstr1' },
  { type: 'report', label: 'GSTR-3B', subtitle: 'GST payable summary', href: '/app/gst/gstr3b' },
  { type: 'report', label: 'HSN Summary', subtitle: 'HSN-wise GST summary', href: '/app/gst/hsn-summary' },
  { type: 'report', label: 'GST Mismatch Checks', subtitle: 'Invoice tax validation report', href: '/app/gst/mismatch-checks' },
  { type: 'report', label: 'Missing GSTIN Report', subtitle: 'Parties without GSTIN', href: '/app/gst/missing-gstin' },
  { type: 'report', label: 'Reverse Charge Report', subtitle: 'Reverse charge purchases', href: '/app/gst/reverse-charge' },
  { type: 'report', label: 'Stock Summary', subtitle: 'Current stock by item', href: '/app/inventory/stock-summary' },
  { type: 'report', label: 'Reorder Alerts', subtitle: 'Items below reorder level', href: '/app/inventory/reorder' },
];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const cid = (req) => req.params.companyId;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toDateEnd = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date) => date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

const lastMonths = (count, endDate = new Date()) => {
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - index, 1);
    months.push({
      key: monthKey(date),
      label: monthLabel(date),
      start: date,
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      sales: 0,
      purchases: 0,
      receipts: 0,
      payments: 0,
    });
  }
  return months;
};

const financialYearStart = (date) => {
  const year = date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
  return new Date(year, 3, 1);
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const buildBalances = async (companyId, { from, to, includeOpening = true } = {}) => {
  const filter = { company: companyId, isCancelled: false, status: 'Approved' };
  if (from) filter.date = { ...filter.date, $gte: new Date(from) };
  if (to) filter.date = { ...filter.date, $lte: toDateEnd(to) };

  const [vouchers, ledgers] = await Promise.all([
    Voucher.find(filter).select('entries'),
    Ledger.find({ company: companyId }).populate('group', 'name nature affectsGross isPrimary'),
  ]);

  const balances = {};
  for (const ledger of ledgers) {
    const openingSign = ledger.openingBalanceType === 'Dr' ? 1 : -1;
    balances[ledger._id.toString()] = {
      _id: ledger._id,
      name: ledger.name,
      groupName: ledger.group?.name || '',
      nature: ledger.group?.nature || '',
      affectsGross: Boolean(ledger.group?.affectsGross),
      balance: includeOpening ? Number(ledger.openingBalance || 0) * openingSign : 0,
    };
  }

  for (const voucher of vouchers) {
    for (const entry of voucher.entries || []) {
      const key = entry.ledger?.toString();
      if (!key || !balances[key]) continue;
      balances[key].balance += entry.type === 'Dr' ? Number(entry.amount || 0) : -Number(entry.amount || 0);
    }
  }

  return balances;
};

const sumGroups = (balances, groupNames, project = (balance) => balance) => Object.values(balances)
  .filter((ledger) => groupNames.has(ledger.groupName))
  .reduce((sum, ledger) => sum + project(ledger.balance), 0);

const getMonthlyVoucherTotals = async (companyId, from, to) => {
  const vouchers = await Voucher.find({
    company: companyId,
    isCancelled: false,
    status: 'Approved',
    voucherType: { $in: ['Sales', 'Purchase'] },
    date: { $gte: from, $lte: to },
  }).select('voucherType total subtotal');

  return vouchers.reduce((acc, voucher) => {
    const amount = Number(voucher.total || voucher.subtotal || 0);
    if (voucher.voucherType === 'Sales') acc.sales += amount;
    if (voucher.voucherType === 'Purchase') acc.purchases += amount;
    return acc;
  }, { sales: 0, purchases: 0 });
};

const getDashboardTrend = async (companyId, asOf) => {
  const months = lastMonths(6, asOf);
  const lookup = new Map(months.map((month) => [month.key, month]));
  const vouchers = await Voucher.find({
    company: companyId,
    isCancelled: false,
    status: 'Approved',
    voucherType: { $in: ['Sales', 'Purchase', 'Receipt', 'Payment'] },
    date: { $gte: months[0].start, $lte: toDateEnd(asOf) },
  }).select('voucherType date total subtotal entries');

  for (const voucher of vouchers) {
    const row = lookup.get(monthKey(new Date(voucher.date)));
    if (!row) continue;
    const entryTotal = (voucher.entries || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0) / 2;
    const amount = Number(voucher.total || voucher.subtotal || entryTotal || 0);
    if (voucher.voucherType === 'Sales') row.sales += amount;
    if (voucher.voucherType === 'Purchase') row.purchases += amount;
    if (voucher.voucherType === 'Receipt') row.receipts += amount;
    if (voucher.voucherType === 'Payment') row.payments += amount;
  }

  return months.map((row) => ({
    key: row.key,
    label: row.label,
    sales: round2(row.sales),
    purchases: round2(row.purchases),
    receipts: round2(row.receipts),
    payments: round2(row.payments),
    netSales: round2(row.sales - row.purchases),
    netCashFlow: round2(row.receipts - row.payments),
  }));
};

router.get('/summary', requirePermission('view_reports'), async (req, res) => {
  try {
    const today = new Date();
    const todayEnd = toDateEnd(today);
    const monthStart = startOfMonth(today);
    const fyStart = financialYearStart(today);
    const companyId = cid(req);

    const [
      currentBalances,
      profitBalances,
      monthlyTotals,
      valuationRows,
      gstReport,
      pendingApprovals,
      recentVouchers,
      trend,
    ] = await Promise.all([
      buildBalances(companyId, { to: todayEnd, includeOpening: true }),
      buildBalances(companyId, { from: fyStart, to: todayEnd, includeOpening: false }),
      getMonthlyVoucherTotals(companyId, monthStart, todayEnd),
      getValuation(companyId, { to: toIsoDate(todayEnd) }),
      getGSTR3BReport(companyId, { from: toIsoDate(monthStart), to: toIsoDate(todayEnd) }),
      Voucher.countDocuments({
        company: companyId,
        isCancelled: false,
        $or: [{ status: 'Submitted' }, { status: { $exists: false } }],
      }),
      Voucher.find({ company: companyId, isCancelled: false })
        .populate('party', 'name')
        .sort({ date: -1, createdAt: -1 })
        .limit(8)
        .select('voucherType voucherNo date total narration party status'),
      getDashboardTrend(companyId, todayEnd),
    ]);

    const totalIncome = Object.values(profitBalances)
      .filter((ledger) => ledger.nature === 'Income')
      .reduce((sum, ledger) => sum - ledger.balance, 0);
    const totalExpenses = Object.values(profitBalances)
      .filter((ledger) => ledger.nature === 'Expenses')
      .reduce((sum, ledger) => sum + ledger.balance, 0);

    const lowStock = valuationRows
      .map((row) => ({ ...row, alertLevel: Number(row.reorderLevel || row.minimumStock || 0) }))
      .filter((row) => row.alertLevel > 0 && Number(row.closingQty || 0) <= row.alertLevel)
      .sort((a, b) => (a.closingQty - a.alertLevel) - (b.closingQty - b.alertLevel))
      .slice(0, 8);

    const summary = {
      asOf: todayEnd,
      period: {
        monthStart,
        fyStart,
      },
      cashBankBalance: round2(sumGroups(currentBalances, CASH_BANK_GROUPS)),
      receivables: round2(sumGroups(currentBalances, new Set(['Sundry Debtors']), (balance) => Math.max(0, balance))),
      payables: round2(sumGroups(currentBalances, new Set(['Sundry Creditors']), (balance) => Math.max(0, -balance))),
      salesThisMonth: round2(monthlyTotals.sales),
      purchasesThisMonth: round2(monthlyTotals.purchases),
      profitEstimate: round2(totalIncome - totalExpenses),
      gstPayable: round2(gstReport.data?.['6.1']?.taxPayable?.total || 0),
      pendingApprovals,
      charts: {
        trend,
        financialPosition: [
          { label: 'Cash/Bank', value: round2(sumGroups(currentBalances, CASH_BANK_GROUPS)) },
          { label: 'Receivables', value: round2(sumGroups(currentBalances, new Set(['Sundry Debtors']), (balance) => Math.max(0, balance))) },
          { label: 'Payables', value: round2(sumGroups(currentBalances, new Set(['Sundry Creditors']), (balance) => Math.max(0, -balance))) },
          { label: 'Profit', value: round2(totalIncome - totalExpenses) },
        ],
        gst: [
          { label: 'CGST', value: round2(gstReport.data?.['6.1']?.taxPayable?.cgst || 0) },
          { label: 'SGST', value: round2(gstReport.data?.['6.1']?.taxPayable?.sgst || 0) },
          { label: 'UTGST', value: round2(gstReport.data?.['6.1']?.taxPayable?.utgst || 0) },
          { label: 'IGST', value: round2(gstReport.data?.['6.1']?.taxPayable?.igst || 0) },
          { label: 'Cess', value: round2(gstReport.data?.['6.1']?.taxPayable?.cess || 0) },
        ],
      },
      lowStock,
      recentVouchers,
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const lower = query.toLowerCase();
    const commandMatches = [...STATIC_COMMANDS, ...STATIC_REPORTS]
      .filter((item) => !query || `${item.label} ${item.subtitle}`.toLowerCase().includes(lower));

    if (!query) {
      return res.json({ success: true, data: commandMatches.slice(0, 12) });
    }

    const regex = new RegExp(escapeRegex(query), 'i');
    const companyId = cid(req);

    const [ledgers, vouchers, stockItems] = await Promise.all([
      Ledger.find({
        company: companyId,
        $or: [
          { name: regex },
          { gstin: regex },
          { phone: regex },
          { email: regex },
          { partyCode: regex },
        ],
      }).populate('group', 'name').sort({ name: 1 }).limit(6),
      Voucher.find({
        company: companyId,
        isCancelled: false,
        $or: [
          { voucherNo: regex },
          { reference: regex },
          { narration: regex },
        ],
      }).populate('party', 'name').sort({ date: -1 }).limit(6),
      StockItem.find({
        company: companyId,
        $or: [
          { name: regex },
          { hsnCode: regex },
          { description: regex },
        ],
      }).populate('group', 'name').sort({ name: 1 }).limit(6),
    ]);

    const results = [
      ...commandMatches,
      ...ledgers.map((ledger) => ({
        type: 'ledger',
        label: ledger.name,
        subtitle: ledger.group?.name || 'Ledger',
        href: '/app/masters/ledgers',
        meta: ledger.gstin || ledger.phone || ledger.email || '',
      })),
      ...vouchers.map((voucher) => ({
        type: 'voucher',
        label: `${voucher.voucherType} ${voucher.voucherNo}`,
        subtitle: voucher.party?.name || voucher.narration || 'Voucher',
        href: `/app/vouchers/${VOUCHER_SLUGS[voucher.voucherType] || ''}?edit=${voucher._id}`,
        meta: voucher.date,
      })),
      ...stockItems.map((item) => ({
        type: 'stock',
        label: item.name,
        subtitle: item.group?.name || 'Stock item',
        href: '/app/masters/stock-items',
        meta: item.hsnCode || '',
      })),
    ];

    res.json({ success: true, data: results.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
