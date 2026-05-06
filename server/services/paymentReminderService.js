const Group = require('../models/Group');
const Ledger = require('../models/Ledger');
const PaymentReminder = require('../models/PaymentReminder');
const Voucher = require('../models/Voucher');

const parsePaymentDays = (party) => {
  if (Number(party.creditDays || 0) > 0) return Number(party.creditDays);
  const terms = String(party.paymentTerms || '').toLowerCase();
  if (!terms || /due\s*(on|upon)?\s*receipt|immediate|cash/.test(terms)) return 0;
  const netMatch = terms.match(/net\s*(\d+)/);
  if (netMatch) return Number(netMatch[1]);
  const dayMatch = terms.match(/(\d+)\s*(day|days|d)\b/);
  return dayMatch ? Number(dayMatch[1]) : 0;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
};

const getVoucherAmount = (voucher, partyId) => {
  if (Number(voucher.total || 0) > 0) return Number(voucher.total);
  const partyEntry = voucher.entries.find((entry) => String(entry.ledger) === String(partyId));
  return Number(partyEntry?.amount || 0);
};

const buildBalances = async (companyId) => {
  const vouchers = await Voucher.find({ company: companyId, isCancelled: false, status: 'Approved' }).select('entries');
  const ledgers = await Ledger.find({ company: companyId }).select('openingBalance openingBalanceType');
  const balances = {};

  for (const ledger of ledgers) {
    balances[String(ledger._id)] = Number(ledger.openingBalance || 0) * (ledger.openingBalanceType === 'Dr' ? 1 : -1);
  }

  for (const voucher of vouchers) {
    for (const entry of voucher.entries) {
      const ledgerId = String(entry.ledger);
      if (balances[ledgerId] === undefined) balances[ledgerId] = 0;
      balances[ledgerId] += entry.type === 'Dr' ? Number(entry.amount || 0) : -Number(entry.amount || 0);
    }
  }

  return balances;
};

const renderTemplate = (template, values) => String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
  const value = values[key];
  return value === undefined || value === null ? '' : String(value);
});

const defaultTemplate = (type) => ({
  name: type === 'payable' ? 'Payable due notice' : 'Receivable reminder',
  subject: type === 'payable'
    ? 'Payment due for {{voucherNo}}'
    : 'Payment reminder for {{voucherNo}}',
  message: type === 'payable'
    ? 'Dear {{partyName}}, payment of Rs {{amount}} is due for {{voucherNo}} dated {{invoiceDate}}. Due date: {{dueDate}}.'
    : 'Dear {{partyName}}, this is a reminder that Rs {{amount}} is due for {{voucherNo}} dated {{invoiceDate}}. Due date: {{dueDate}}.',
});

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN');
const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generatePaymentReminders = async (companyId, options = {}) => {
  const type = options.type === 'payable' ? 'payable' : 'receivable';
  const asOf = options.asOf ? new Date(options.asOf) : new Date();
  const includeUpcoming = Boolean(options.includeUpcoming);
  const groupName = type === 'payable' ? 'Sundry Creditors' : 'Sundry Debtors';
  const voucherType = type === 'payable' ? 'Purchase' : 'Sales';
  const group = await Group.findOne({ company: companyId, name: groupName });
  if (!group) return [];

  const parties = await Ledger.find({ company: companyId, group: group._id }).sort({ name: 1 });
  const balances = await buildBalances(companyId);
  const reminders = [];
  const template = defaultTemplate(type);

  for (const party of parties) {
    const rawBalance = Number(balances[String(party._id)] || 0);
    let remaining = type === 'payable' ? Math.max(0, -rawBalance) : Math.max(0, rawBalance);
    if (remaining <= 0) continue;

    const vouchers = await Voucher.find({
      company: companyId,
      party: party._id,
        voucherType,
        isCancelled: false,
        status: 'Approved',
      }).sort({ date: 1 });

    for (const voucher of vouchers) {
      if (remaining <= 0) break;
      const invoiceAmount = getVoucherAmount(voucher, party._id);
      if (invoiceAmount <= 0) continue;

      const dueDate = addDays(voucher.date, parsePaymentDays(party));
      if (!includeUpcoming && dueDate > asOf) continue;

      const amount = Math.min(invoiceAmount, remaining);
      const values = {
        partyName: party.name,
        voucherNo: voucher.voucherNo,
        amount: formatAmount(amount),
        invoiceDate: formatDate(voucher.date),
        dueDate: formatDate(dueDate),
      };

      const existing = await PaymentReminder.findOne({ company: companyId, voucher: voucher._id, reminderType: type });
      if (existing) {
        existing.dueDate = dueDate;
        existing.amount = amount;
        existing.nextReminderAt = existing.status === 'sent' ? existing.nextReminderAt : dueDate;
        if (!existing.subject) existing.subject = renderTemplate(template.subject, values);
        if (!existing.message) existing.message = renderTemplate(template.message, values);
        if (!existing.templateName) existing.templateName = template.name;
        reminders.push(await existing.save());
      } else {
        reminders.push(await PaymentReminder.create({
          company: companyId,
          party: party._id,
          voucher: voucher._id,
          reminderType: type,
          dueDate,
          nextReminderAt: dueDate,
          amount,
          templateName: template.name,
          subject: renderTemplate(template.subject, values),
          message: renderTemplate(template.message, values),
          status: 'draft',
        }));
      }

      remaining -= amount;
    }
  }

  return reminders;
};

module.exports = {
  defaultTemplate,
  generatePaymentReminders,
  parsePaymentDays,
};
