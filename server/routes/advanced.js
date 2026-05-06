const express = require('express');
const router = express.Router({ mergeParams: true });
const ApiKey = require('../models/ApiKey');
const Budget = require('../models/Budget');
const Company = require('../models/Company');
const Ledger = require('../models/Ledger');
const Project = require('../models/Project');
const RecurringVoucher = require('../models/RecurringVoucher');
const Voucher = require('../models/Voucher');
const WebhookDelivery = require('../models/WebhookDelivery');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const {
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
} = require('../services/advancedService');

router.use(protect, companyAccess);

const cid = (req) => req.params.companyId;

const allowedSettings = [
  'branches',
  'currencies',
  'tdsTcsEnabled',
  'defaultTdsRate',
  'defaultTcsRate',
  'cloudStorageProvider',
  'cloudStorageBucket',
  'currency',
  'currencySymbol',
];

const pick = (source, keys) => keys.reduce((acc, key) => {
  if (Object.prototype.hasOwnProperty.call(source || {}, key)) acc[key] = source[key];
  return acc;
}, {});

const sendError = (res, err) => res.status(err.statusCode || 500).json({
  success: false,
  message: err.message,
  errors: err.errors,
});

router.get('/settings', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const company = await Company.findOne({ _id: cid(req), isActive: true }).select(allowedSettings.join(' '));
    res.json({ success: true, data: company });
  } catch (err) { sendError(res, err); }
});

router.put('/settings', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const before = await Company.findOne({ _id: cid(req), isActive: true }).lean();
    const company = await Company.findOneAndUpdate(
      { _id: cid(req), isActive: true },
      pick(req.body, allowedSettings),
      { new: true, runValidators: true }
    ).select(allowedSettings.join(' '));
    await logAudit({
      req,
      company: cid(req),
      action: 'advanced_settings.updated',
      entityType: 'Company',
      entityId: cid(req),
      before,
      after: company.toObject(),
    });
    res.json({ success: true, data: company });
  } catch (err) { sendError(res, err); }
});

router.get('/invoices/:voucherId/share', requirePermission('export_data'), async (req, res) => {
  try {
    const data = await buildInvoiceShare(cid(req), req.params.voucherId);
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.post('/invoices/:voucherId/email', requirePermission('export_data'), async (req, res) => {
  try {
    const data = await sendInvoiceEmail(cid(req), req.params.voucherId, req.body);
    await logAudit({
      req,
      company: cid(req),
      action: data.sent ? 'invoice.email_sent' : 'invoice.email_previewed',
      entityType: 'Voucher',
      entityId: req.params.voucherId,
      metadata: { to: data.to, configured: data.configured },
    });
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.get('/recurring', requirePermission('view_reports'), async (req, res) => {
  try {
    const rows = await RecurringVoucher.find({ company: cid(req) })
      .populate('party', 'name email phone')
      .populate('lastGeneratedVoucher', 'voucherNo date total')
      .sort({ nextRunDate: 1, createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/recurring/from-voucher', requirePermission('create_vouchers'), async (req, res) => {
  try {
    const recurring = await createRecurringFromVoucher({
      companyId: cid(req),
      voucherId: req.body.sourceVoucher,
      body: req.body,
      userId: req.user._id,
    });
    await recurring.populate('party', 'name email phone');
    await logAudit({
      req,
      company: cid(req),
      action: 'recurring_voucher.created',
      entityType: 'RecurringVoucher',
      entityId: recurring._id,
      after: recurring.toObject(),
    });
    res.status(201).json({ success: true, data: recurring });
  } catch (err) { sendError(res, err); }
});

router.patch('/recurring/:id', requirePermission('create_vouchers'), async (req, res) => {
  try {
    const before = await RecurringVoucher.findOne({ _id: req.params.id, company: cid(req) }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Recurring template not found' });
    const allowed = pick(req.body, ['name', 'kind', 'frequency', 'nextRunDate', 'endDate', 'autoSubmit', 'isActive']);
    const recurring = await RecurringVoucher.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      allowed,
      { new: true, runValidators: true }
    );
    await logAudit({
      req,
      company: cid(req),
      action: 'recurring_voucher.updated',
      entityType: 'RecurringVoucher',
      entityId: recurring._id,
      before,
      after: recurring.toObject(),
    });
    res.json({ success: true, data: recurring });
  } catch (err) { sendError(res, err); }
});

router.post('/recurring/:id/generate', requirePermission('create_vouchers'), async (req, res) => {
  try {
    const voucher = await generateRecurringVoucher({
      companyId: cid(req),
      recurringId: req.params.id,
      userId: req.user._id,
    });
    await logAudit({
      req,
      company: cid(req),
      action: 'recurring_voucher.generated',
      entityType: 'Voucher',
      entityId: voucher._id,
      after: voucher.toObject(),
    });
    dispatchWebhooks(cid(req), 'voucher.created', {
      event: 'voucher.created',
      voucher: { id: voucher._id, voucherNo: voucher.voucherNo, voucherType: voucher.voucherType, total: voucher.total },
      source: 'recurring',
    }).catch(() => {});
    res.status(201).json({ success: true, data: voucher });
  } catch (err) { sendError(res, err); }
});

router.get('/budgets', requirePermission('view_reports'), async (req, res) => {
  try {
    const rows = await Budget.find({ company: cid(req) })
      .populate({ path: 'ledger', select: 'name group', populate: { path: 'group', select: 'name nature' } })
      .sort({ periodStart: -1, createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/budgets', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const ledger = await Ledger.exists({ _id: req.body.ledger, company: cid(req) });
    if (!ledger) return res.status(400).json({ success: false, message: 'Ledger is required' });
    const budget = await Budget.create({
      ...pick(req.body, ['name', 'ledger', 'periodStart', 'periodEnd', 'amount', 'notes', 'isActive']),
      company: cid(req),
      createdBy: req.user._id,
    });
    await logAudit({ req, company: cid(req), action: 'budget.created', entityType: 'Budget', entityId: budget._id, after: budget.toObject() });
    res.status(201).json({ success: true, data: budget });
  } catch (err) { sendError(res, err); }
});

router.put('/budgets/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const before = await Budget.findOne({ _id: req.params.id, company: cid(req) }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Budget not found' });
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      pick(req.body, ['name', 'ledger', 'periodStart', 'periodEnd', 'amount', 'notes', 'isActive']),
      { new: true, runValidators: true }
    );
    await logAudit({ req, company: cid(req), action: 'budget.updated', entityType: 'Budget', entityId: budget._id, before, after: budget.toObject() });
    res.json({ success: true, data: budget });
  } catch (err) { sendError(res, err); }
});

router.delete('/budgets/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate({ _id: req.params.id, company: cid(req) }, { isActive: false }, { new: true });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    await logAudit({ req, company: cid(req), action: 'budget.deactivated', entityType: 'Budget', entityId: budget._id, after: budget.toObject() });
    res.json({ success: true, data: budget });
  } catch (err) { sendError(res, err); }
});

router.get('/budgets/report', requirePermission('view_reports'), async (req, res) => {
  try {
    const data = await getBudgetReport(cid(req), req.query);
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.get('/projects', requirePermission('view_reports'), async (req, res) => {
  try {
    const rows = await Project.find({ company: cid(req), isActive: true }).populate('customer', 'name').sort({ name: 1 });
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/projects', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const project = await Project.create({
      ...pick(req.body, ['code', 'name', 'customer', 'manager', 'startDate', 'endDate', 'budgetAmount', 'status', 'notes']),
      customer: req.body.customer || undefined,
      company: cid(req),
    });
    await logAudit({ req, company: cid(req), action: 'project.created', entityType: 'Project', entityId: project._id, after: project.toObject() });
    res.status(201).json({ success: true, data: project });
  } catch (err) { sendError(res, err); }
});

router.put('/projects/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const before = await Project.findOne({ _id: req.params.id, company: cid(req) }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      { ...pick(req.body, ['code', 'name', 'customer', 'manager', 'startDate', 'endDate', 'budgetAmount', 'status', 'notes']), customer: req.body.customer || undefined },
      { new: true, runValidators: true }
    );
    await logAudit({ req, company: cid(req), action: 'project.updated', entityType: 'Project', entityId: project._id, before, after: project.toObject() });
    res.json({ success: true, data: project });
  } catch (err) { sendError(res, err); }
});

router.delete('/projects/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.id, company: cid(req) }, { isActive: false }, { new: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await logAudit({ req, company: cid(req), action: 'project.deactivated', entityType: 'Project', entityId: project._id, after: project.toObject() });
    res.json({ success: true, data: project });
  } catch (err) { sendError(res, err); }
});

router.get('/projects/profitability', requirePermission('view_reports'), async (req, res) => {
  try {
    const data = await getProjectProfitability(cid(req));
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.get('/api-keys', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const rows = await ApiKey.find({ company: cid(req) }).select('-keyHash').sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/api-keys', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const { apiKey, plainKey } = await createApiKey({
      companyId: cid(req),
      name: req.body.name || 'Integration key',
      scopes: req.body.scopes,
      userId: req.user._id,
    });
    await logAudit({ req, company: cid(req), action: 'api_key.created', entityType: 'ApiKey', entityId: apiKey._id, after: { name: apiKey.name, scopes: apiKey.scopes } });
    const safe = apiKey.toObject();
    delete safe.keyHash;
    res.status(201).json({ success: true, data: { ...safe, key: plainKey } });
  } catch (err) { sendError(res, err); }
});

router.patch('/api-keys/:id/revoke', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      { status: 'revoked', revokedAt: new Date() },
      { new: true }
    ).select('-keyHash');
    if (!apiKey) return res.status(404).json({ success: false, message: 'API key not found' });
    await logAudit({ req, company: cid(req), action: 'api_key.revoked', entityType: 'ApiKey', entityId: apiKey._id, after: apiKey.toObject() });
    res.json({ success: true, data: apiKey });
  } catch (err) { sendError(res, err); }
});

router.get('/webhooks', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const rows = await WebhookEndpoint.find({ company: cid(req) }).sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/webhooks', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.create({
      ...pick(req.body, ['name', 'url', 'events', 'secret', 'isActive']),
      events: Array.isArray(req.body.events) && req.body.events.length ? req.body.events : ['voucher.created'],
      company: cid(req),
      createdBy: req.user._id,
    });
    await logAudit({ req, company: cid(req), action: 'webhook.created', entityType: 'WebhookEndpoint', entityId: endpoint._id, after: endpoint.toObject() });
    res.status(201).json({ success: true, data: endpoint });
  } catch (err) { sendError(res, err); }
});

router.put('/webhooks/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const before = await WebhookEndpoint.findOne({ _id: req.params.id, company: cid(req) }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Webhook not found' });
    const endpoint = await WebhookEndpoint.findOneAndUpdate(
      { _id: req.params.id, company: cid(req) },
      pick(req.body, ['name', 'url', 'events', 'secret', 'isActive']),
      { new: true, runValidators: true }
    );
    await logAudit({ req, company: cid(req), action: 'webhook.updated', entityType: 'WebhookEndpoint', entityId: endpoint._id, before, after: endpoint.toObject() });
    res.json({ success: true, data: endpoint });
  } catch (err) { sendError(res, err); }
});

router.delete('/webhooks/:id', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOneAndUpdate({ _id: req.params.id, company: cid(req) }, { isActive: false }, { new: true });
    if (!endpoint) return res.status(404).json({ success: false, message: 'Webhook not found' });
    await logAudit({ req, company: cid(req), action: 'webhook.deactivated', entityType: 'WebhookEndpoint', entityId: endpoint._id, after: endpoint.toObject() });
    res.json({ success: true, data: endpoint });
  } catch (err) { sendError(res, err); }
});

router.post('/webhooks/:id/test', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const endpoint = await WebhookEndpoint.findOne({ _id: req.params.id, company: cid(req) });
    if (!endpoint) return res.status(404).json({ success: false, message: 'Webhook not found' });
    const data = await deliverWebhook({
      endpoint,
      event: 'test.ping',
      payload: { event: 'test.ping', company: cid(req), sentAt: new Date().toISOString() },
    });
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.get('/webhooks/:id/deliveries', requirePermission('manage_company_settings'), async (req, res) => {
  try {
    const rows = await WebhookDelivery.find({ company: cid(req), endpoint: req.params.id }).sort({ deliveredAt: -1 }).limit(50);
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

router.post('/assistant/query', requirePermission('view_reports'), async (req, res) => {
  try {
    const data = await answerBusinessQuestion(cid(req), req.body.question);
    res.json({ success: true, data });
  } catch (err) { sendError(res, err); }
});

router.get('/invoice-candidates', requirePermission('view_reports'), async (req, res) => {
  try {
    const rows = await Voucher.find({
      company: cid(req),
      voucherType: { $in: ['Sales', 'Purchase'] },
      isCancelled: false,
    }).populate('party', 'name email phone').sort({ date: -1, createdAt: -1 }).limit(100);
    res.json({ success: true, data: rows });
  } catch (err) { sendError(res, err); }
});

module.exports = router;
