const mongoose = require('mongoose');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const Ledger = require('../models/Ledger');
const Project = require('../models/Project');
const StockItem = require('../models/StockItem');
const { validateInvoiceGst } = require('./gstService');

const JOURNAL_STYLE_VOUCHERS = new Set([
  'Payment',
  'Receipt',
  'Journal',
  'Contra',
  'CreditNote',
  'DebitNote',
]);

const objectIdToString = (value) => {
  if (!value) return '';
  if (value._id) return value._id.toString();
  return value.toString();
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(objectIdToString(value));

const unique = (values) => [...new Set(values.filter(Boolean).map(objectIdToString))];

const money = (value) => Math.round((Number(value) || 0) * 100);

const hasAccountingData = (entry) => Boolean(entry?.ledger) || money(entry?.amount) > 0;

const isFinancialYearLockingEnabled = (company) => Boolean(
  company.financialYearLockingEnabled ||
  company.financialYearLockEnabled ||
  company.financialYearLocked ||
  company.lockFinancialYear ||
  company.lockFinancialYearEnabled
);

const readDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const readFinancialYearRange = (company) => {
  const explicitStart = readDate(
    company.currentFinancialYearStart ||
    company.financialYearStartDate ||
    company.activeFinancialYearStart ||
    company.lockedFinancialYearStart
  );
  const explicitEnd = readDate(
    company.currentFinancialYearEnd ||
    company.financialYearEndDate ||
    company.activeFinancialYearEnd ||
    company.lockedFinancialYearEnd
  );

  if (explicitStart && explicitEnd) {
    return { start: explicitStart, end: explicitEnd };
  }

  const bookBeginning = readDate(company.bookBeginning);
  if (!bookBeginning) return null;

  const start = new Date(bookBeginning);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const getActiveFinancialYear = async (company) => {
  if (company.activeFinancialYear) {
    const activeByCompany = await FinancialYear.findOne({
      _id: company.activeFinancialYear,
      company: company._id,
    }).lean();
    if (activeByCompany) return activeByCompany;
  }

  return FinancialYear.findOne({ company: company._id, isActive: true }).lean();
};

const getContainingFinancialYear = (companyId, voucherDate) => FinancialYear.findOne({
  company: companyId,
  startDate: { $lte: voucherDate },
  endDate: { $gte: voucherDate },
}).lean();

const validateVoucherEditWindow = async (date, companyId) => {
  const errors = [];
  const company = await Company.findById(companyId).lean();
  if (!company) return ['Company not found.'];

  const voucherDate = readDate(date);
  if (!voucherDate) return ['Voucher date is required and must be valid.'];

  const containingFinancialYear = await getContainingFinancialYear(companyId, voucherDate);
  if (containingFinancialYear?.isLocked) {
    errors.push(
      `Voucher date falls in locked financial year ${containingFinancialYear.name}. Unlock the financial year before editing vouchers in this period.`
    );
  }

  if (!isFinancialYearLockingEnabled(company)) return errors;

  const activeFinancialYear = await getActiveFinancialYear(company);
  if (activeFinancialYear) {
    if (voucherDate < activeFinancialYear.startDate || voucherDate > activeFinancialYear.endDate) {
      errors.push(
        `Voucher date must be inside the active financial year ${activeFinancialYear.name} (${formatDate(activeFinancialYear.startDate)} to ${formatDate(activeFinancialYear.endDate)}).`
      );
    }
    return errors;
  }

  const range = readFinancialYearRange(company);
  if (range && (voucherDate < range.start || voucherDate > range.end)) {
    errors.push(
      `Voucher date must be inside the company financial year (${formatDate(range.start)} to ${formatDate(range.end)}).`
    );
  }

  return errors;
};

const validateVoucher = async (payload, companyId) => {
  const errors = [];
  const company = await Company.findById(companyId).lean();

  if (!company) {
    return ['Company not found.'];
  }

  const voucherType = payload.voucherType;
  if (payload.status === 'Draft') {
    return validateVoucherEditWindow(payload.date, companyId);
  }

  const entries = Array.isArray(payload.entries) ? payload.entries.filter(hasAccountingData) : [];
  const items = Array.isArray(payload.items) ? payload.items.filter((item) => item?.item) : [];

  if (JOURNAL_STYLE_VOUCHERS.has(voucherType) && entries.length < 2) {
    errors.push('At least two accounting entries are required for this voucher type.');
  }

  entries.forEach((entry, index) => {
    if (!entry.ledger) {
      errors.push(`Entry ${index + 1}: ledger is required.`);
    } else if (!isObjectId(entry.ledger)) {
      errors.push(`Entry ${index + 1}: ledger ID is invalid.`);
    }

    if (!['Dr', 'Cr'].includes(entry.type)) {
      errors.push(`Entry ${index + 1}: type must be Dr or Cr.`);
    }

    if (!Number.isFinite(Number(entry.amount)) || Number(entry.amount) <= 0) {
      errors.push(`Entry ${index + 1}: amount must be greater than zero.`);
    }
  });

  const debitTotal = entries
    .filter((entry) => entry.type === 'Dr')
    .reduce((total, entry) => total + money(entry.amount), 0);
  const creditTotal = entries
    .filter((entry) => entry.type === 'Cr')
    .reduce((total, entry) => total + money(entry.amount), 0);

  if (entries.length > 0 && debitTotal !== creditTotal) {
    errors.push('Debit total must equal credit total.');
  }

  const entryLedgerIds = unique(entries.map((entry) => entry.ledger));
  const invalidEntryLedgerIds = entryLedgerIds.filter((id) => !isObjectId(id));
  if (invalidEntryLedgerIds.length === 0 && entryLedgerIds.length > 0) {
    const ledgerCount = await Ledger.countDocuments({ _id: { $in: entryLedgerIds }, company: companyId });
    if (ledgerCount !== entryLedgerIds.length) {
      errors.push('All entry ledgers must belong to the selected company.');
    }
  }

  const entryProjectIds = unique(entries.map((entry) => entry.project));
  const invalidEntryProjectIds = entryProjectIds.filter((id) => !isObjectId(id));
  if (invalidEntryProjectIds.length === 0 && entryProjectIds.length > 0) {
    const projectCount = await Project.countDocuments({ _id: { $in: entryProjectIds }, company: companyId, isActive: true });
    if (projectCount !== entryProjectIds.length) {
      errors.push('All entry projects must belong to the selected company.');
    }
  }

  if (payload.party) {
    if (!isObjectId(payload.party)) {
      errors.push('Party ledger ID is invalid.');
    } else {
      const partyExists = await Ledger.exists({ _id: payload.party, company: companyId });
      if (!partyExists) {
        errors.push('Party ledger must belong to the selected company.');
      }
    }
  }

  const stockItemIds = unique(items.map((item) => item.item));
  stockItemIds.forEach((id, index) => {
    if (!isObjectId(id)) {
      errors.push(`Stock line ${index + 1}: stock item ID is invalid.`);
    }
  });

  const invalidStockItemIds = stockItemIds.filter((id) => !isObjectId(id));
  if (invalidStockItemIds.length === 0 && stockItemIds.length > 0) {
    const itemCount = await StockItem.countDocuments({ _id: { $in: stockItemIds }, company: companyId });
    if (itemCount !== stockItemIds.length) {
      errors.push('All stock items must belong to the selected company.');
    }
  }

  errors.push(...await validateVoucherEditWindow(payload.date, companyId));
  errors.push(...await validateInvoiceGst(payload, companyId));

  return errors;
};

module.exports = {
  validateVoucher,
  validateVoucherEditWindow,
};
