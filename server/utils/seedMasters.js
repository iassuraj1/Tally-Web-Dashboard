const Group  = require('../models/Group');
const Ledger = require('../models/Ledger');
const Unit   = require('../models/Unit');
const Godown = require('../models/Godown');

// Standard Tally Groups (hierarchical)
const DEFAULT_GROUPS = [
  // Primary groups
  { name: 'Capital Account',          nature: 'Liabilities', isPrimary: true  },
  { name: 'Loans (Liability)',        nature: 'Liabilities', isPrimary: true  },
  { name: 'Current Liabilities',      nature: 'Liabilities', isPrimary: true  },
  { name: 'Fixed Assets',             nature: 'Assets',      isPrimary: true  },
  { name: 'Investments',              nature: 'Assets',      isPrimary: true  },
  { name: 'Current Assets',           nature: 'Assets',      isPrimary: true  },
  { name: 'Miscellaneous Expenses (Asset)', nature: 'Assets', isPrimary: true },
  { name: 'Sales Accounts',           nature: 'Income',      isPrimary: true, affectsGross: true },
  { name: 'Purchase Accounts',        nature: 'Expenses',    isPrimary: true, affectsGross: true },
  { name: 'Direct Income',            nature: 'Income',      isPrimary: true, affectsGross: true },
  { name: 'Indirect Income',          nature: 'Income',      isPrimary: true  },
  { name: 'Direct Expenses',          nature: 'Expenses',    isPrimary: true, affectsGross: true },
  { name: 'Indirect Expenses',        nature: 'Expenses',    isPrimary: true  },
  // Sub groups (parent resolved after insert)
  { name: 'Reserves & Surplus',       nature: 'Liabilities', parentName: 'Capital Account' },
  { name: 'Secured Loans',            nature: 'Liabilities', parentName: 'Loans (Liability)' },
  { name: 'Unsecured Loans',          nature: 'Liabilities', parentName: 'Loans (Liability)' },
  { name: 'Bank OD Accounts',         nature: 'Liabilities', parentName: 'Loans (Liability)' },
  { name: 'Duties & Taxes',           nature: 'Liabilities', parentName: 'Current Liabilities' },
  { name: 'Provisions',               nature: 'Liabilities', parentName: 'Current Liabilities' },
  { name: 'Sundry Creditors',         nature: 'Liabilities', parentName: 'Current Liabilities' },
  { name: 'Bank Accounts',            nature: 'Assets',      parentName: 'Current Assets' },
  { name: 'Cash-in-Hand',             nature: 'Assets',      parentName: 'Current Assets' },
  { name: 'Sundry Debtors',           nature: 'Assets',      parentName: 'Current Assets' },
  { name: 'Stock-in-Hand',            nature: 'Assets',      parentName: 'Current Assets' },
  { name: 'Loans & Advances (Asset)', nature: 'Assets',      parentName: 'Current Assets' },
  { name: 'Deposits (Asset)',         nature: 'Assets',      parentName: 'Current Assets' },
];

// Standard Tally Ledgers
const DEFAULT_LEDGERS = [
  { name: 'Cash',          groupName: 'Cash-in-Hand' },
  { name: 'Capital Account', groupName: 'Capital Account' },
  { name: 'Opening Stock', groupName: 'Stock-in-Hand' },
  { name: 'Closing Stock', groupName: 'Stock-in-Hand' },
  { name: 'Purchase',      groupName: 'Purchase Accounts' },
  { name: 'Sales',         groupName: 'Sales Accounts' },
  { name: 'CGST Input',    groupName: 'Duties & Taxes' },
  { name: 'SGST Input',    groupName: 'Duties & Taxes' },
  { name: 'UTGST Input',   groupName: 'Duties & Taxes' },
  { name: 'IGST Input',    groupName: 'Duties & Taxes' },
  { name: 'CGST Output',   groupName: 'Duties & Taxes' },
  { name: 'SGST Output',   groupName: 'Duties & Taxes' },
  { name: 'UTGST Output',  groupName: 'Duties & Taxes' },
  { name: 'IGST Output',   groupName: 'Duties & Taxes' },
  { name: 'TDS Payable',   groupName: 'Duties & Taxes' },
  { name: 'PF Payable',    groupName: 'Duties & Taxes' },
  { name: 'ESI Payable',   groupName: 'Duties & Taxes' },
  { name: 'Salary',        groupName: 'Indirect Expenses' },
  { name: 'Rent',          groupName: 'Indirect Expenses' },
  { name: 'Electricity',   groupName: 'Indirect Expenses' },
  { name: 'Telephone',     groupName: 'Indirect Expenses' },
  { name: 'Discount Allowed',   groupName: 'Indirect Expenses' },
  { name: 'Discount Received',  groupName: 'Indirect Income' },
  { name: 'Interest Received',  groupName: 'Indirect Income' },
  { name: 'Interest Paid',      groupName: 'Indirect Expenses' },
  { name: 'Freight & Forwarding', groupName: 'Direct Expenses' },
  { name: 'Commission',          groupName: 'Indirect Expenses' },
  { name: 'Bad Debts',           groupName: 'Indirect Expenses' },
  { name: 'Round Off',           groupName: 'Indirect Expenses' },
];

const DEFAULT_UNITS = [
  { name: 'Numbers', symbol: 'Nos', decimalPlaces: 0 },
  { name: 'Kilograms', symbol: 'Kgs', decimalPlaces: 3 },
  { name: 'Grams', symbol: 'Gms', decimalPlaces: 2 },
  { name: 'Litres', symbol: 'Ltr', decimalPlaces: 3 },
  { name: 'Metres', symbol: 'Mtrs', decimalPlaces: 2 },
  { name: 'Pieces', symbol: 'Pcs', decimalPlaces: 0 },
  { name: 'Box', symbol: 'Box', decimalPlaces: 0 },
  { name: 'Dozen', symbol: 'Doz', decimalPlaces: 0 },
];

const seedDefaultMasters = async (companyId) => {
  // Groups
  const insertedGroups = {};
  for (const g of DEFAULT_GROUPS) {
    const { parentName, isPrimary, ...rest } = g;
    const parentId = parentName ? insertedGroups[parentName] : null;
    try {
      const grp = await Group.create({ company: companyId, ...rest, parent: parentId, isPrimary: isPrimary || false, isDefault: true });
      insertedGroups[g.name] = grp._id;
    } catch { /* skip duplicates */ }
  }

  // Ledgers
  for (const l of DEFAULT_LEDGERS) {
    const groupId = insertedGroups[l.groupName];
    if (!groupId) continue;
    try {
      await Ledger.create({ company: companyId, name: l.name, group: groupId, isDefault: true });
    } catch { /* skip */ }
  }

  // Units
  for (const u of DEFAULT_UNITS) {
    try {
      await Unit.create({ company: companyId, ...u, isDefault: true });
    } catch { /* skip */ }
  }

  // Default Godown
  try {
    await Godown.create({ company: companyId, name: 'Main Godown', isDefault: true });
  } catch { /* skip */ }
};

module.exports = { seedDefaultMasters };
