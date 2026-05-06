const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router({ mergeParams: true });

const BankReconciliation = require('../models/BankReconciliation');
const BankStatementLine = require('../models/BankStatementLine');
const Group = require('../models/Group');
const Ledger = require('../models/Ledger');
const PaymentReminder = require('../models/PaymentReminder');
const { protect, companyAccess } = require('../middleware/auth');
const {
  createLineFingerprint,
  findBestVoucherMatch,
  findVoucherCandidates,
  parseStatementContent,
} = require('../services/bankMatchingService');
const { generatePaymentReminders } = require('../services/paymentReminderService');

router.use(protect, companyAccess);

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
};

const createReconciliationFromLine = async (companyId, line, voucherId) => BankReconciliation.findOneAndUpdate(
  { voucher: voucherId, bankLedger: line.bankLedger, company: companyId },
  {
    isReconciled: true,
    bankDate: line.statementDate,
    date: line.statementDate,
    amount: line.amount,
    type: line.type,
    narration: line.narration,
    chequeNo: line.chequeNo,
    reconDate: new Date(),
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

// Get all bank ledgers.
router.get('/bank-ledgers', async (req, res) => {
  try {
    const bankGroup = await Group.findOne({ company: req.params.companyId, name: 'Bank Accounts' });
    if (!bankGroup) return res.json({ success: true, data: [] });
    const ledgers = await Ledger.find({ company: req.params.companyId, group: bankGroup._id }).sort({ name: 1 });
    res.json({ success: true, data: ledgers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get unreconciled and reconciled book entries for a bank ledger.
router.get('/unreconciled/:bankLedgerId', async (req, res) => {
  try {
    const filter = {
      company: req.params.companyId,
      'entries.ledger': req.params.bankLedgerId,
      isCancelled: false,
      status: 'Approved',
    };
    if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
    if (req.query.to) filter.date = { ...filter.date, $lte: new Date(req.query.to) };

    const vouchers = await require('../models/Voucher').find(filter)
      .populate('entries.ledger', 'name')
      .sort({ date: 1 });
    const reconciliations = await BankReconciliation.find({
      company: req.params.companyId,
      bankLedger: req.params.bankLedgerId,
      voucher: { $in: vouchers.map((voucher) => voucher._id) },
    });
    const reconByVoucher = new Map(reconciliations.map((recon) => [String(recon.voucher), recon]));
    const entries = [];

    for (const voucher of vouchers) {
      for (const entry of voucher.entries) {
        if (String(entry.ledger?._id || entry.ledger) !== String(req.params.bankLedgerId)) continue;
        const recon = reconByVoucher.get(String(voucher._id));
        entries.push({
          _id: voucher._id,
          date: voucher.date,
          voucherType: voucher.voucherType,
          voucherNo: voucher.voucherNo,
          narration: voucher.narration || entry.narration,
          chequeNo: entry.billRef,
          amount: entry.amount,
          type: entry.type,
          isReconciled: recon?.isReconciled || false,
          bankDate: recon?.bankDate || null,
          reconId: recon?._id || null,
        });
      }
    }

    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark a book entry as reconciled manually.
router.post('/reconcile', async (req, res) => {
  try {
    const { voucherId, bankLedgerId, bankDate, amount, type, chequeNo } = req.body;
    if (!voucherId || !bankLedgerId || !bankDate) {
      return res.status(400).json({ success: false, message: 'Voucher, bank ledger, and bank date are required' });
    }

    const recon = await BankReconciliation.findOneAndUpdate(
      { voucher: voucherId, bankLedger: bankLedgerId, company: req.params.companyId },
      {
        isReconciled: true,
        date: new Date(bankDate),
        bankDate: new Date(bankDate),
        amount,
        type,
        chequeNo,
        reconDate: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: recon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Un-reconcile a book entry.
router.delete('/reconcile/:reconId', async (req, res) => {
  try {
    await BankReconciliation.findOneAndUpdate(
      { _id: req.params.reconId, company: req.params.companyId },
      { isReconciled: false, bankDate: null, reconDate: null }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Import CSV, TSV, XLS, or XLSX bank statements.
router.post('/statement-import', async (req, res) => {
  try {
    const { bankLedgerId, csv, text, fileName } = req.body;
    const fileData = String(req.body.fileData || '').replace(/^data:.*;base64,/, '');
    if (!bankLedgerId) return res.status(400).json({ success: false, message: 'Bank ledger is required' });

    const bankLedger = await Ledger.findOne({ _id: bankLedgerId, company: req.params.companyId });
    if (!bankLedger) return res.status(404).json({ success: false, message: 'Bank ledger not found' });

    const parsed = parseStatementContent({ text: text || csv, fileData, fileName });
    if (!parsed.length) return res.status(400).json({ success: false, message: 'No valid statement lines were found' });

    const importBatchId = crypto.randomUUID();
    const withFingerprints = parsed.map((line) => ({
      ...line,
      fingerprint: createLineFingerprint(req.params.companyId, bankLedgerId, line),
    }));
    const existing = await BankStatementLine.find({
      company: req.params.companyId,
      bankLedger: bankLedgerId,
      fingerprint: { $in: withFingerprints.map((line) => line.fingerprint) },
    }).select('fingerprint');
    const existingFingerprints = new Set(existing.map((line) => line.fingerprint));
    const freshLines = withFingerprints.filter((line) => !existingFingerprints.has(line.fingerprint));

    const importDocs = await Promise.all(freshLines.map(async (line) => {
      const match = await findBestVoucherMatch(req.params.companyId, bankLedgerId, line);
      return {
        ...line,
        company: req.params.companyId,
        bankLedger: bankLedgerId,
        sourceFile: fileName,
        importBatchId,
        matchedVoucher: match?.voucher?._id,
        matchScore: match?.score || 0,
        matchType: match ? 'auto' : '',
        status: match ? 'matched' : 'imported',
      };
    }));

    const data = importDocs.length ? await BankStatementLine.insertMany(importDocs) : [];
    res.status(201).json({
      success: true,
      data,
      parsed: parsed.length,
      imported: data.length,
      skippedDuplicates: parsed.length - data.length,
      matched: data.filter((line) => line.status === 'matched').length,
      importBatchId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/statement-lines/:bankLedgerId', async (req, res) => {
  try {
    const filter = { company: req.params.companyId, bankLedger: req.params.bankLedgerId };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.from) filter.statementDate = { $gte: new Date(req.query.from) };
    if (req.query.to) filter.statementDate = { ...filter.statementDate, $lte: new Date(req.query.to) };
    if (req.query.q) filter.narration = { $regex: escapeRegex(req.query.q), $options: 'i' };

    const data = await BankStatementLine.find(filter)
      .populate('matchedVoucher', 'voucherNo voucherType date narration total')
      .sort({ statementDate: -1, createdAt: -1 })
      .limit(Number(req.query.limit || 500));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/statement-lines/:id/candidates', async (req, res) => {
  try {
    const line = await BankStatementLine.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!line) return res.status(404).json({ success: false, message: 'Statement line not found' });
    const data = await findVoucherCandidates(req.params.companyId, line.bankLedger, line, {
      days: req.query.days || 30,
      limit: req.query.limit || 20,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/statement-lines/:id/match', async (req, res) => {
  try {
    const line = await BankStatementLine.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!line) return res.status(404).json({ success: false, message: 'Statement line not found' });
    if (!req.body.voucherId) return res.status(400).json({ success: false, message: 'Voucher is required' });

    const candidates = await findVoucherCandidates(req.params.companyId, line.bankLedger, line, { days: 365, limit: 100 });
    const selected = candidates.find((candidate) => String(candidate.voucher._id) === String(req.body.voucherId));
    if (!selected) {
      return res.status(400).json({ success: false, message: 'Selected voucher does not match this statement amount and bank ledger' });
    }

    line.matchedVoucher = selected.voucher._id;
    line.matchScore = selected.score;
    line.matchType = 'manual';
    line.status = 'matched';
    await line.save();
    await line.populate('matchedVoucher', 'voucherNo voucherType date narration total');
    res.json({ success: true, data: line });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/statement-lines/:id/status', async (req, res) => {
  try {
    const allowed = ['imported', 'matched', 'ignored'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const line = await BankStatementLine.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      { status: req.body.status },
      { new: true }
    ).populate('matchedVoucher', 'voucherNo voucherType date narration total');
    if (!line) return res.status(404).json({ success: false, message: 'Statement line not found' });
    res.json({ success: true, data: line });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/statement-lines/:id/reconcile', async (req, res) => {
  try {
    const line = await BankStatementLine.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!line) return res.status(404).json({ success: false, message: 'Statement line not found' });

    let voucherId = req.body.voucherId || line.matchedVoucher;
    if (req.body.voucherId && String(req.body.voucherId) !== String(line.matchedVoucher || '')) {
      const candidates = await findVoucherCandidates(req.params.companyId, line.bankLedger, line, { days: 365, limit: 100 });
      const selected = candidates.find((candidate) => String(candidate.voucher._id) === String(req.body.voucherId));
      if (!selected) {
        return res.status(400).json({ success: false, message: 'Selected voucher does not match this statement amount and bank ledger' });
      }
      voucherId = selected.voucher._id;
      line.matchedVoucher = voucherId;
      line.matchScore = selected.score;
      line.matchType = 'manual';
    }

    if (!voucherId) return res.status(400).json({ success: false, message: 'Statement line has no matched voucher' });
    const recon = await createReconciliationFromLine(req.params.companyId, line, voucherId);
    line.status = 'reconciled';
    await line.save();
    res.json({ success: true, data: recon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/payment-reminders', async (req, res) => {
  try {
    const filter = { company: req.params.companyId };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.reminderType && req.query.reminderType !== 'all') filter.reminderType = req.query.reminderType;
    if (req.query.from) filter.dueDate = { $gte: new Date(req.query.from) };
    if (req.query.to) filter.dueDate = { ...filter.dueDate, $lte: new Date(req.query.to) };

    const data = await PaymentReminder.find(filter)
      .populate('party', 'name email phone paymentTerms creditDays')
      .populate('voucher', 'voucherNo voucherType date total')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payment-reminders/generate', async (req, res) => {
  try {
    const data = await generatePaymentReminders(req.params.companyId, {
      type: req.body.type,
      asOf: req.body.asOf,
      includeUpcoming: req.body.includeUpcoming,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/payment-reminders/:id', async (req, res) => {
  try {
    const allowed = ['dueDate', 'nextReminderAt', 'amount', 'templateName', 'subject', 'message', 'status'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = ['dueDate', 'nextReminderAt'].includes(key) ? new Date(req.body[key]) : req.body[key];
    }
    const reminder = await PaymentReminder.findOneAndUpdate(
      { _id: req.params.id, company: req.params.companyId },
      update,
      { new: true, runValidators: true }
    )
      .populate('party', 'name email phone paymentTerms creditDays')
      .populate('voucher', 'voucherNo voucherType date total');
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payment-reminders/:id/send', async (req, res) => {
  try {
    const reminder = await PaymentReminder.findOne({ _id: req.params.id, company: req.params.companyId })
      .populate('party', 'name email');
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (!reminder.party?.email) return res.status(400).json({ success: false, message: 'Party email is missing' });

    if (req.body.subject !== undefined) reminder.subject = req.body.subject;
    if (req.body.message !== undefined) reminder.message = req.body.message;

    const subject = reminder.subject || 'Payment reminder';
    const message = reminder.message || '';
    const transporter = getTransporter();
    let deliveryStatus = 'logged';
    let responseMessage = 'SMTP not configured; reminder logged';

    try {
      if (transporter) {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: reminder.party.email,
          subject,
          text: message,
        });
        deliveryStatus = 'sent';
        responseMessage = 'Reminder sent';
      }

      reminder.status = 'sent';
      reminder.lastSentAt = new Date();
      reminder.nextReminderAt = null;
      reminder.lastError = undefined;
      reminder.sendCount = Number(reminder.sendCount || 0) + 1;
      reminder.history.push({
        to: reminder.party.email,
        subject,
        status: deliveryStatus,
        error: transporter ? undefined : 'SMTP not configured; reminder was logged.',
      });
      await reminder.save();
      res.json({ success: true, data: reminder, message: responseMessage });
    } catch (mailErr) {
      reminder.status = 'failed';
      reminder.lastError = mailErr.message;
      reminder.history.push({
        to: reminder.party.email,
        subject,
        status: 'failed',
        error: mailErr.message,
      });
      await reminder.save();
      res.status(500).json({ success: false, message: mailErr.message, data: reminder });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
