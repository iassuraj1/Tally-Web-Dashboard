const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Budget = require('../models/Budget');
const Company = require('../models/Company');
const Counter = require('../models/Counter');
const Group = require('../models/Group');
const Ledger = require('../models/Ledger');
const Project = require('../models/Project');
const RecurringVoucher = require('../models/RecurringVoucher');
const Voucher = require('../models/Voucher');
const WebhookDelivery = require('../models/WebhookDelivery');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const { validateVoucher } = require('./voucherValidationService');
const { applyVoucherStockEffect } = require('./stockMovementService');
const { withTransaction } = require('../config/db');

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const dateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const voucherPrefixes = {
  Sales: 'SI',
  Purchase: 'PI',
  Payment: 'PAY',
  Receipt: 'REC',
  Journal: 'JV',
  Contra: 'CON',
  CreditNote: 'CN',
  DebitNote: 'DBN',
};

const addFrequency = (date, frequency) => {
  const next = new Date(date);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
  else if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const getNextVoucherNo = async (companyId, type) => {
  const counter = await Counter.findOneAndUpdate(
    { company: companyId, scope: `voucher:${type}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${voucherPrefixes[type] || 'VCH'}-${String(counter.seq).padStart(4, '0')}`;
};

const invoiceUrl = (voucherId) => `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/invoice-print/${voucherId}`;

const buildInvoiceShare = async (companyId, voucherId) => {
  const [company, voucher] = await Promise.all([
    Company.findOne({ _id: companyId, isActive: true }).lean(),
    Voucher.findOne({ _id: voucherId, company: companyId })
      .populate('party', 'name phone email')
      .lean(),
  ]);
  if (!voucher) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  const url = invoiceUrl(voucher._id);
  const message = [
    `Invoice ${voucher.voucherNo} from ${company?.name || 'our business'}`,
    `Amount: ${company?.currencySymbol || 'Rs'} ${round2(voucher.total).toLocaleString('en-IN')}`,
    `Date: ${dateOnly(voucher.date)}`,
    url,
  ].filter(Boolean).join('\n');
  const phone = String(voucher.party?.phone || '').replace(/\D/g, '');

  return {
    voucher: {
      _id: voucher._id,
      voucherNo: voucher.voucherNo,
      partyName: voucher.party?.name || '',
      partyEmail: voucher.party?.email || '',
      total: voucher.total,
    },
    invoiceUrl: url,
    message,
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    mailtoUrl: `mailto:${voucher.party?.email || ''}?subject=${encodeURIComponent(`Invoice ${voucher.voucherNo}`)}&body=${encodeURIComponent(message)}`,
  };
};

const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

const sendInvoiceEmail = async (companyId, voucherId, options = {}) => {
  const share = await buildInvoiceShare(companyId, voucherId);
  const to = options.to || share.voucher.partyEmail;
  if (!to) {
    const err = new Error('Customer email is missing');
    err.statusCode = 400;
    throw err;
  }

  const subject = options.subject || `Invoice ${share.voucher.voucherNo}`;
  const html = `
    <p>Hello,</p>
    <p>Please find invoice <strong>${share.voucher.voucherNo}</strong>.</p>
    <p>Amount: <strong>${round2(share.voucher.total).toLocaleString('en-IN')}</strong></p>
    <p><a href="${share.invoiceUrl}">Open invoice</a></p>
    ${options.note ? `<p>${String(options.note).replace(/[<>]/g, '')}</p>` : ''}
  `;

  if (!smtpConfigured()) {
    return { sent: false, configured: false, to, subject, preview: { html, invoiceUrl: share.invoiceUrl } };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });

  return { sent: true, configured: true, messageId: info.messageId, to, subject };
};

const cleanVoucherTemplate = (voucher) => {
  const { _id, __v, company, voucherNo, createdAt, updatedAt, submittedAt, submittedBy, approvedAt, approvedBy, rejectedAt, rejectedBy, isCancelled, cancelReason, ...rest } = voucher;
  return {
    ...rest,
    status: 'Draft',
    reference: '',
    isRecurringGenerated: true,
    entries: (voucher.entries || []).map((entry) => ({ ...entry })),
    items: (voucher.items || []).map((item) => ({ ...item })),
  };
};

const createRecurringFromVoucher = async ({ companyId, voucherId, body, userId }) => {
  const voucher = await Voucher.findOne({ _id: voucherId, company: companyId, isCancelled: false }).lean();
  if (!voucher) {
    const err = new Error('Source voucher not found');
    err.statusCode = 404;
    throw err;
  }
  return RecurringVoucher.create({
    company: companyId,
    name: body.name || `${voucher.voucherType} ${voucher.voucherNo}`,
    kind: body.kind || 'recurring_invoice',
    voucherType: voucher.voucherType,
    party: voucher.party,
    sourceVoucher: voucher._id,
    template: cleanVoucherTemplate(voucher),
    frequency: body.frequency || 'monthly',
    nextRunDate: body.nextRunDate,
    endDate: body.endDate || undefined,
    autoSubmit: Boolean(body.autoSubmit),
    createdBy: userId,
  });
};

const generateRecurringVoucher = async ({ companyId, recurringId, userId }) => {
  const recurring = await RecurringVoucher.findOne({ _id: recurringId, company: companyId, isActive: true });
  if (!recurring) {
    const err = new Error('Recurring template not found');
    err.statusCode = 404;
    throw err;
  }
  if (recurring.endDate && recurring.nextRunDate > recurring.endDate) {
    const err = new Error('Recurring template has passed its end date');
    err.statusCode = 400;
    throw err;
  }

  const voucherType = recurring.voucherType;
  const body = {
    ...(recurring.template || {}),
    company: companyId,
    voucherType,
    date: recurring.nextRunDate,
    status: recurring.autoSubmit ? 'Submitted' : 'Draft',
    recurringTemplate: recurring._id,
    isRecurringGenerated: true,
    submittedAt: recurring.autoSubmit ? new Date() : undefined,
    submittedBy: recurring.autoSubmit ? userId : undefined,
  };
  body.baseTotal = round2(Number(body.total || 0) * Number(body.exchangeRate || 1));

  const validationErrors = await validateVoucher(body, companyId);
  if (validationErrors.length) {
    const err = new Error(validationErrors.join(' '));
    err.statusCode = 400;
    err.errors = validationErrors;
    throw err;
  }

  const voucher = await withTransaction(async () => {
    const nextVoucher = {
      ...body,
      voucherNo: await getNextVoucherNo(companyId, voucherType),
      isCancelled: false,
    };
    await applyVoucherStockEffect(companyId, null, nextVoucher);
    const created = await Voucher.create(nextVoucher);
    recurring.lastGeneratedAt = new Date();
    recurring.lastGeneratedVoucher = created._id;
    recurring.nextRunDate = addFrequency(recurring.nextRunDate, recurring.frequency);
    await recurring.save();
    return created;
  }, { isolationLevel: 'SERIALIZABLE' });
  return voucher.populate('party', 'name email phone');
};

const getBudgetReport = async (companyId, query = {}) => {
  const filter = { company: companyId, isActive: true };
  if (query.ledger) filter.ledger = query.ledger;
  if (query.from || query.to) {
    filter.periodEnd = { $gte: new Date(query.from || '1900-01-01') };
    filter.periodStart = { $lte: new Date(query.to || '2999-12-31') };
  }

  const budgets = await Budget.find(filter).populate({
    path: 'ledger',
    select: 'name group',
    populate: { path: 'group', select: 'name nature' },
  }).sort({ periodStart: -1 });

  const rows = [];
  for (const budget of budgets) {
    const vouchers = await Voucher.find({
      company: companyId,
      isCancelled: false,
      status: 'Approved',
      date: { $gte: budget.periodStart, $lte: budget.periodEnd },
      'entries.ledger': budget.ledger._id,
    }).select('entries');

    let debit = 0;
    let credit = 0;
    for (const voucher of vouchers) {
      for (const entry of voucher.entries || []) {
        if (String(entry.ledger) !== String(budget.ledger._id)) continue;
        if (entry.type === 'Dr') debit += Number(entry.amount || 0);
        else credit += Number(entry.amount || 0);
      }
    }

    const nature = budget.ledger.group?.nature;
    const actual = nature === 'Income' ? credit - debit : nature === 'Expenses' ? debit - credit : Math.abs(debit - credit);
    rows.push({
      _id: budget._id,
      name: budget.name,
      ledger: budget.ledger.name,
      nature,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      budget: round2(budget.amount),
      actual: round2(actual),
      variance: round2(Number(budget.amount || 0) - actual),
      usedPct: budget.amount ? round2((actual / budget.amount) * 100) : 0,
    });
  }

  return {
    rows,
    totals: {
      budget: round2(rows.reduce((sum, row) => sum + row.budget, 0)),
      actual: round2(rows.reduce((sum, row) => sum + row.actual, 0)),
      variance: round2(rows.reduce((sum, row) => sum + row.variance, 0)),
    },
  };
};

const getProjectProfitability = async (companyId) => {
  const projects = await Project.find({ company: companyId, isActive: true }).sort({ name: 1 }).lean();
  const ids = projects.map((project) => String(project._id));
  const result = new Map(ids.map((id) => [id, { revenue: 0, cost: 0 }]));
  if (!ids.length) return [];

  const vouchers = await Voucher.find({
    company: companyId,
    isCancelled: false,
    status: 'Approved',
    'entries.project': { $in: ids },
  }).populate({
    path: 'entries.ledger',
    select: 'name group',
    populate: { path: 'group', select: 'nature name' },
  }).select('entries');

  for (const voucher of vouchers) {
    for (const entry of voucher.entries || []) {
      const projectId = String(entry.project || '');
      if (!result.has(projectId)) continue;
      const amount = Number(entry.amount || 0);
      const nature = entry.ledger?.group?.nature;
      if (nature === 'Income') result.get(projectId).revenue += entry.type === 'Cr' ? amount : -amount;
      if (nature === 'Expenses') result.get(projectId).cost += entry.type === 'Dr' ? amount : -amount;
    }
  }

  return projects.map((project) => {
    const totals = result.get(String(project._id)) || { revenue: 0, cost: 0 };
    return {
      ...project,
      revenue: round2(totals.revenue),
      cost: round2(totals.cost),
      profit: round2(totals.revenue - totals.cost),
      budgetVariance: round2(Number(project.budgetAmount || 0) - totals.cost),
    };
  });
};

const createApiKey = async ({ companyId, name, scopes, userId }) => {
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('hex');
  const plainKey = `sp_${prefix}_${secret}`;
  const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
  const apiKey = await require('../models/ApiKey').create({
    company: companyId,
    name,
    prefix,
    keyHash,
    last4: plainKey.slice(-4),
    scopes: Array.isArray(scopes) && scopes.length ? scopes : ['read'],
    createdBy: userId,
  });
  return { apiKey, plainKey };
};

const signPayload = (secret, payload) => crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

const deliverWebhook = async ({ endpoint, event, payload }) => {
  const headers = { 'content-type': 'application/json', 'x-suraj-event': event };
  if (endpoint.secret) headers['x-suraj-signature'] = signPayload(endpoint.secret, payload);

  try {
    if (typeof fetch !== 'function') throw new Error('Fetch API is not available in this Node runtime');
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();
    const status = response.ok ? 'success' : 'failed';
    await WebhookDelivery.create({
      company: endpoint.company,
      endpoint: endpoint._id,
      event,
      payload,
      status,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 2000),
    });
    endpoint.lastDeliveryStatus = status;
    endpoint.lastDeliveredAt = new Date();
    await endpoint.save();
    return { status, statusCode: response.status, responseBody: responseBody.slice(0, 500) };
  } catch (err) {
    await WebhookDelivery.create({
      company: endpoint.company,
      endpoint: endpoint._id,
      event,
      payload,
      status: 'failed',
      error: err.message,
    });
    endpoint.lastDeliveryStatus = 'failed';
    endpoint.lastDeliveredAt = new Date();
    await endpoint.save();
    return { status: 'failed', error: err.message };
  }
};

const dispatchWebhooks = async (companyId, event, payload) => {
  const endpoints = await WebhookEndpoint.find({
    company: companyId,
    isActive: true,
    events: event,
  });
  return Promise.all(endpoints.map((endpoint) => deliverWebhook({ endpoint, event, payload })));
};

const getOutstandingTotal = async (companyId, type) => {
  const groupName = type === 'payables' ? 'Sundry Creditors' : 'Sundry Debtors';
  const group = await Group.findOne({ company: companyId, name: groupName }).lean();
  if (!group) return 0;
  const ledgers = await Ledger.find({ company: companyId, group: group._id }).select('_id openingBalance openingBalanceType').lean();
  const ids = new Set(ledgers.map((ledger) => String(ledger._id)));
  const balances = new Map(ledgers.map((ledger) => [
    String(ledger._id),
    Number(ledger.openingBalance || 0) * (ledger.openingBalanceType === 'Dr' ? 1 : -1),
  ]));
  const vouchers = await Voucher.find({ company: companyId, isCancelled: false, status: 'Approved', 'entries.ledger': { $in: [...ids] } }).select('entries');
  for (const voucher of vouchers) {
    for (const entry of voucher.entries || []) {
      const id = String(entry.ledger || '');
      if (!balances.has(id)) continue;
      balances.set(id, balances.get(id) + (entry.type === 'Dr' ? Number(entry.amount || 0) : -Number(entry.amount || 0)));
    }
  }
  return round2([...balances.values()].reduce((sum, balance) => sum + (type === 'payables' ? Math.max(0, -balance) : Math.max(0, balance)), 0));
};

const answerBusinessQuestion = async (companyId, question = '') => {
  const q = String(question).toLowerCase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthlyVouchers, pendingApprovals, receivables, payables] = await Promise.all([
    Voucher.find({
      company: companyId,
      isCancelled: false,
      status: 'Approved',
      date: { $gte: monthStart, $lte: monthEnd },
    }).select('voucherType total totalCGST totalSGST totalUTGST totalIGST'),
    Voucher.countDocuments({
      company: companyId,
      isCancelled: false,
      $or: [{ status: 'Submitted' }, { status: { $exists: false } }],
    }),
    getOutstandingTotal(companyId, 'receivables'),
    getOutstandingTotal(companyId, 'payables'),
  ]);

  const sales = round2(monthlyVouchers.filter((voucher) => voucher.voucherType === 'Sales').reduce((sum, voucher) => sum + Number(voucher.total || 0), 0));
  const purchases = round2(monthlyVouchers.filter((voucher) => voucher.voucherType === 'Purchase').reduce((sum, voucher) => sum + Number(voucher.total || 0), 0));
  const gst = round2(monthlyVouchers.reduce((sum, voucher) => sum + Number(voucher.totalCGST || 0) + Number(voucher.totalSGST || 0) + Number(voucher.totalUTGST || 0) + Number(voucher.totalIGST || 0), 0));
  const profit = round2(sales - purchases);

  let answer = `This month sales are ${sales.toLocaleString('en-IN')} and purchases are ${purchases.toLocaleString('en-IN')}. Estimated trading profit before expenses is ${profit.toLocaleString('en-IN')}.`;
  if (q.includes('receivable') || q.includes('customer') || q.includes('collect')) {
    answer = `Receivables currently stand at ${receivables.toLocaleString('en-IN')}. Start with the largest overdue customers in the receivables report and send payment reminders.`;
  } else if (q.includes('payable') || q.includes('vendor')) {
    answer = `Payables currently stand at ${payables.toLocaleString('en-IN')}. Compare this with cash and bank balances before scheduling vendor payments.`;
  } else if (q.includes('gst') || q.includes('tax')) {
    answer = `GST captured on approved vouchers this month is ${gst.toLocaleString('en-IN')}. Use GSTR-3B and mismatch checks before filing.`;
  } else if (q.includes('approval')) {
    answer = `${pendingApprovals} voucher(s) are waiting for approval. Approving valid vouchers will make them appear in final reports.`;
  } else if (q.includes('profit') || q.includes('loss')) {
    answer = `This month's sales minus purchases estimate is ${profit.toLocaleString('en-IN')}. For a full net figure, review Profit & Loss because expenses and income ledgers are included there.`;
  }

  return {
    answer,
    facts: { salesThisMonth: sales, purchasesThisMonth: purchases, gstThisMonth: gst, receivables, payables, pendingApprovals },
  };
};

module.exports = {
  answerBusinessQuestion,
  buildInvoiceShare,
  createApiKey,
  createRecurringFromVoucher,
  deliverWebhook,
  dispatchWebhooks,
  generateRecurringVoucher,
  getBudgetReport,
  getProjectProfitability,
  sendInvoiceEmail,
};
