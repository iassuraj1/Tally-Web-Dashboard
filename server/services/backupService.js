const Company = require('../models/Company');
const Budget = require('../models/Budget');
const CostCentre = require('../models/CostCentre');
const Employee = require('../models/Employee');
const FinancialYear = require('../models/FinancialYear');
const Godown = require('../models/Godown');
const Group = require('../models/Group');
const Ledger = require('../models/Ledger');
const PayHead = require('../models/PayHead');
const PayrollVoucher = require('../models/PayrollVoucher');
const Project = require('../models/Project');
const RecurringVoucher = require('../models/RecurringVoucher');
const StockGroup = require('../models/StockGroup');
const StockItem = require('../models/StockItem');
const Unit = require('../models/Unit');
const Voucher = require('../models/Voucher');
const WebhookEndpoint = require('../models/WebhookEndpoint');

const omit = (source, keys) => Object.fromEntries(
  Object.entries(source || {}).filter(([key]) => !keys.includes(key))
);

const dateOnly = (value) => (value ? new Date(value).toISOString() : undefined);
const key = (value) => String(value || '').trim().toLowerCase();

const stripDoc = (doc, extra = []) => omit(doc, ['_id', '__v', 'company', 'createdAt', 'updatedAt', ...extra]);

const buildCompanyBackup = async (companyId) => {
  const [
    company,
    groups,
    ledgers,
    units,
    godowns,
    stockGroups,
    stockItems,
    costCentres,
    financialYears,
    vouchers,
    employees,
    payHeads,
    payrollVouchers,
    budgets,
    projects,
    recurringVouchers,
    webhooks,
  ] = await Promise.all([
    Company.findById(companyId).lean(),
    Group.find({ company: companyId }).populate('parent', 'name').lean(),
    Ledger.find({ company: companyId }).populate('group', 'name').lean(),
    Unit.find({ company: companyId }).lean(),
    Godown.find({ company: companyId }).populate('parent', 'name').lean(),
    StockGroup.find({ company: companyId }).populate('parent', 'name').lean(),
    StockItem.find({ company: companyId }).populate('group', 'name').populate('unit', 'name symbol').populate('openingGodown', 'name').lean(),
    CostCentre.find({ company: companyId }).populate('parent', 'name').lean(),
    FinancialYear.find({ company: companyId }).lean(),
    Voucher.find({ company: companyId })
      .populate('party', 'name')
      .populate('entries.ledger', 'name')
      .populate('items.item', 'name')
      .populate('items.unit', 'symbol name')
      .populate('items.godown', 'name')
      .lean(),
    Employee.find({ company: companyId }).lean(),
    PayHead.find({ company: companyId }).populate('ledger', 'name').lean(),
    PayrollVoucher.find({ company: companyId }).populate('employee', 'name').populate('lines.payHead', 'name').lean(),
    Budget.find({ company: companyId }).populate('ledger', 'name').lean(),
    Project.find({ company: companyId }).populate('customer', 'name').lean(),
    RecurringVoucher.find({ company: companyId }).populate('party', 'name').populate('sourceVoucher', 'voucherNo').lean(),
    WebhookEndpoint.find({ company: companyId }).lean(),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    company: stripDoc(company, ['owner', 'members', 'activeFinancialYear']),
    masters: {
      groups: groups.map((group) => ({ ...stripDoc(group, ['parent']), parentName: group.parent?.name || '' })),
      ledgers: ledgers.map((ledger) => ({ ...stripDoc(ledger, ['group']), groupName: ledger.group?.name || '' })),
      units: units.map((unit) => stripDoc(unit, ['baseUnit'])),
      godowns: godowns.map((godown) => ({ ...stripDoc(godown, ['parent']), parentName: godown.parent?.name || '' })),
      stockGroups: stockGroups.map((group) => ({ ...stripDoc(group, ['parent']), parentName: group.parent?.name || '' })),
      stockItems: stockItems.map((item) => ({
        ...stripDoc(item, ['group', 'unit', 'openingGodown']),
        groupName: item.group?.name || '',
        unitSymbol: item.unit?.symbol || item.unit?.name || '',
        openingGodownName: item.openingGodown?.name || '',
      })),
      costCentres: costCentres.map((centre) => ({ ...stripDoc(centre, ['parent']), parentName: centre.parent?.name || '' })),
      financialYears: financialYears.map((year) => stripDoc(year, ['lockedBy'])),
    },
    vouchers: vouchers.map((voucher) => ({
      ...stripDoc(voucher, ['party', 'entries', 'items', 'submittedBy', 'approvedBy', 'rejectedBy', 'amendedFrom']),
      partyName: voucher.party?.name || '',
      date: dateOnly(voucher.date),
      ackDate: dateOnly(voucher.ackDate),
      ewayBillDate: dateOnly(voucher.ewayBillDate),
      ewayBillValidUntil: dateOnly(voucher.ewayBillValidUntil),
      transporterDocDate: dateOnly(voucher.transporterDocDate),
      entries: (voucher.entries || []).map((entry) => ({ ...entry, ledgerName: entry.ledger?.name || '' })),
      items: (voucher.items || []).map((item) => ({
        ...item,
        itemName: item.item?.name || '',
        unitSymbol: item.unit?.symbol || item.unit?.name || '',
        godownName: item.godown?.name || '',
        expiry: dateOnly(item.expiry),
      })),
    })),
    payroll: {
      employees: employees.map((employee) => stripDoc(employee)),
      payHeads: payHeads.map((payHead) => ({ ...stripDoc(payHead, ['ledger']), ledgerName: payHead.ledger?.name || '' })),
      vouchers: payrollVouchers.map((voucher) => ({
        ...stripDoc(voucher, ['employee', 'lines']),
        employeeName: voucher.employee?.name || '',
        lines: (voucher.lines || []).map((line) => ({ ...line, payHeadName: line.payHead?.name || '' })),
      })),
    },
    advanced: {
      budgets: budgets.map((budget) => ({ ...stripDoc(budget, ['ledger', 'createdBy']), ledgerName: budget.ledger?.name || '' })),
      projects: projects.map((project) => ({ ...stripDoc(project, ['customer']), customerName: project.customer?.name || '' })),
      recurringVouchers: recurringVouchers.map((row) => ({
        ...stripDoc(row, ['party', 'sourceVoucher', 'lastGeneratedVoucher', 'createdBy']),
        partyName: row.party?.name || '',
        sourceVoucherNo: row.sourceVoucher?.voucherNo || '',
      })),
      webhooks: webhooks.map((webhook) => stripDoc(webhook, ['createdBy', 'secret'])),
    },
  };
};

const validateBackup = (backup) => {
  const errors = [];
  if (!backup || typeof backup !== 'object') errors.push('Backup JSON is required.');
  if (backup?.schemaVersion !== 1) errors.push('Unsupported backup schema version.');
  if (!backup?.company?.name) errors.push('Company profile is missing.');
  if (!Array.isArray(backup?.masters?.groups)) errors.push('Account groups are missing.');
  if (!Array.isArray(backup?.masters?.ledgers)) errors.push('Ledgers are missing.');
  if (!Array.isArray(backup?.vouchers)) errors.push('Vouchers section is missing.');
  return errors;
};

const upsertByName = async (Model, companyId, rows, map, prepare) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];
  for (const row of rows || []) {
    if (!row.name) {
      skipped += 1;
      continue;
    }
    try {
      const prepared = prepare ? await prepare(row) : row;
      const doc = await Model.findOneAndUpdate(
        { company: companyId, name: row.name },
        { ...prepared, company: companyId, name: row.name },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      map.set(key(row.name), doc);
      imported += 1;
    } catch (err) {
      errors.push({ name: row.name, reason: err.message });
    }
  }
  return { imported, skipped, errors };
};

const restoreCompanyBackup = async (companyId, backup, options = {}) => {
  const errors = validateBackup(backup);
  const counts = {
    groups: backup?.masters?.groups?.length || 0,
    ledgers: backup?.masters?.ledgers?.length || 0,
    stockItems: backup?.masters?.stockItems?.length || 0,
    vouchers: backup?.vouchers?.length || 0,
    employees: backup?.payroll?.employees?.length || 0,
    payrollVouchers: backup?.payroll?.vouchers?.length || 0,
  };
  if (options.dryRun !== false || errors.length) return { valid: errors.length === 0, errors, counts };

  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found.');
  const profile = stripDoc(backup.company, ['owner', 'members', 'activeFinancialYear']);
  Object.assign(company, profile);
  await company.save();

  const maps = {
    groups: new Map(),
    ledgers: new Map(),
    units: new Map(),
    godowns: new Map(),
    stockGroups: new Map(),
    stockItems: new Map(),
    employees: new Map(),
    payHeads: new Map(),
  };

  (await Group.find({ company: companyId })).forEach((doc) => maps.groups.set(key(doc.name), doc));
  (await Ledger.find({ company: companyId })).forEach((doc) => maps.ledgers.set(key(doc.name), doc));
  (await Unit.find({ company: companyId })).forEach((doc) => { maps.units.set(key(doc.name), doc); maps.units.set(key(doc.symbol), doc); });
  (await Godown.find({ company: companyId })).forEach((doc) => maps.godowns.set(key(doc.name), doc));
  (await StockGroup.find({ company: companyId })).forEach((doc) => maps.stockGroups.set(key(doc.name), doc));
  (await StockItem.find({ company: companyId })).forEach((doc) => maps.stockItems.set(key(doc.name), doc));
  (await Employee.find({ company: companyId })).forEach((doc) => maps.employees.set(key(doc.name), doc));
  (await PayHead.find({ company: companyId })).forEach((doc) => maps.payHeads.set(key(doc.name), doc));

  const results = {};
  results.groups = await upsertByName(Group, companyId, backup.masters.groups, maps.groups, async (row) => ({
    ...stripDoc(row, ['parentName']),
    parent: row.parentName ? maps.groups.get(key(row.parentName))?._id : null,
  }));
  results.units = await upsertByName(Unit, companyId, backup.masters.units, maps.units, (row) => stripDoc(row));
  results.godowns = await upsertByName(Godown, companyId, backup.masters.godowns, maps.godowns, async (row) => ({
    ...stripDoc(row, ['parentName']),
    parent: row.parentName ? maps.godowns.get(key(row.parentName))?._id : null,
  }));
  results.stockGroups = await upsertByName(StockGroup, companyId, backup.masters.stockGroups, maps.stockGroups, async (row) => ({
    ...stripDoc(row, ['parentName']),
    parent: row.parentName ? maps.stockGroups.get(key(row.parentName))?._id : null,
  }));
  results.ledgers = await upsertByName(Ledger, companyId, backup.masters.ledgers, maps.ledgers, async (row) => ({
    ...stripDoc(row, ['groupName']),
    group: maps.groups.get(key(row.groupName))?._id,
  }));
  results.stockItems = await upsertByName(StockItem, companyId, backup.masters.stockItems, maps.stockItems, async (row) => ({
    ...stripDoc(row, ['groupName', 'unitSymbol', 'openingGodownName']),
    group: row.groupName ? maps.stockGroups.get(key(row.groupName))?._id : undefined,
    unit: maps.units.get(key(row.unitSymbol))?._id,
    openingGodown: row.openingGodownName ? maps.godowns.get(key(row.openingGodownName))?._id : undefined,
  }));
  results.costCentres = await upsertByName(CostCentre, companyId, backup.masters.costCentres, new Map(), async (row) => ({
    ...stripDoc(row, ['parentName']),
    parent: null,
  }));
  results.employees = await upsertByName(Employee, companyId, backup.payroll?.employees || [], maps.employees, (row) => stripDoc(row));
  results.payHeads = await upsertByName(PayHead, companyId, backup.payroll?.payHeads || [], maps.payHeads, async (row) => ({
    ...stripDoc(row, ['ledgerName']),
    ledger: row.ledgerName ? maps.ledgers.get(key(row.ledgerName))?._id : undefined,
  }));

  let vouchersImported = 0;
  const voucherErrors = [];
  for (const row of backup.vouchers || []) {
    try {
      const exists = await Voucher.findOne({ company: companyId, voucherType: row.voucherType, voucherNo: row.voucherNo });
      if (exists) continue;
      await Voucher.create({
        ...stripDoc(row, ['partyName', 'entries', 'items']),
        company: companyId,
        party: row.partyName ? maps.ledgers.get(key(row.partyName))?._id : undefined,
        entries: (row.entries || []).map((entry) => ({
          ...omit(entry, ['ledger', 'ledgerName']),
          ledger: maps.ledgers.get(key(entry.ledgerName))?._id,
        })).filter((entry) => entry.ledger),
        items: (row.items || []).map((item) => ({
          ...omit(item, ['item', 'itemName', 'unit', 'unitSymbol', 'godown', 'godownName']),
          item: maps.stockItems.get(key(item.itemName))?._id,
          unit: item.unitSymbol ? maps.units.get(key(item.unitSymbol))?._id : undefined,
          godown: item.godownName ? maps.godowns.get(key(item.godownName))?._id : undefined,
        })).filter((item) => item.item),
      });
      vouchersImported += 1;
    } catch (err) {
      voucherErrors.push({ voucherNo: row.voucherNo, reason: err.message });
    }
  }
  results.vouchers = { imported: vouchersImported, errors: voucherErrors };

  let payrollImported = 0;
  const payrollErrors = [];
  for (const row of backup.payroll?.vouchers || []) {
    try {
      const employee = maps.employees.get(key(row.employeeName));
      if (!employee) continue;
      const exists = await PayrollVoucher.findOne({ company: companyId, employee: employee._id, month: row.month, year: row.year });
      if (exists) continue;
      await PayrollVoucher.create({
        ...stripDoc(row, ['employeeName', 'lines']),
        company: companyId,
        employee: employee._id,
        lines: (row.lines || []).map((line) => ({
          ...omit(line, ['payHead', 'payHeadName']),
          payHead: maps.payHeads.get(key(line.payHeadName))?._id,
        })).filter((line) => line.payHead),
      });
      payrollImported += 1;
    } catch (err) {
      payrollErrors.push({ employee: row.employeeName, month: row.month, year: row.year, reason: err.message });
    }
  }
  results.payrollVouchers = { imported: payrollImported, errors: payrollErrors };

  return { valid: true, errors: [], counts, results };
};

module.exports = {
  buildCompanyBackup,
  restoreCompanyBackup,
  validateBackup,
};
