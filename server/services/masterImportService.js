const XLSX = require('xlsx');
const Group = require('../models/Group');
const Ledger = require('../models/Ledger');
const StockGroup = require('../models/StockGroup');
const StockItem = require('../models/StockItem');
const Unit = require('../models/Unit');
const Godown = require('../models/Godown');

const IMPORT_TYPES = ['ledgers', 'stock_items', 'customers', 'vendors', 'opening_balances'];

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const key = (value) => String(value || '').trim().toLowerCase();
const text = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value) => ['true', 'yes', 'y', '1'].includes(String(value ?? '').trim().toLowerCase());
const drCr = (value, fallback = 'Dr') => {
  const normalized = String(value || fallback).trim().toLowerCase();
  return ['cr', 'credit', 'c'].includes(normalized) ? 'Cr' : 'Dr';
};
const gstType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (['regular', 'registered'].includes(normalized)) return 'Regular';
  if (normalized === 'composition') return 'Composition';
  if (normalized === 'consumer') return 'Consumer';
  if (normalized === 'overseas') return 'Overseas';
  return 'Unregistered';
};
const taxability = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'exempt') return 'Exempt';
  if (['nil', 'nil rated'].includes(normalized)) return 'Nil Rated';
  if (['nongst', 'non-gst', 'non gst'].includes(normalized)) return 'Non-GST';
  return 'Taxable';
};

const get = (row, names) => {
  for (const name of names) {
    const value = row[normalizeKey(name)];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const parseRows = ({ fileData, text: rawText, fileName }) => {
  let workbook;
  const base64 = String(fileData || '').replace(/^data:.*;base64,/, '');
  if (base64) {
    workbook = XLSX.read(Buffer.from(base64, 'base64'), { type: 'buffer', cellDates: true });
  } else {
    workbook = XLSX.read(rawText || '', { type: 'string', cellDates: true });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], sheetName: '', fileName };
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
  return {
    sheetName,
    fileName,
    rows: rawRows.map((row) => Object.entries(row).reduce((acc, [header, value]) => {
      acc[normalizeKey(header)] = value;
      return acc;
    }, {})),
  };
};

const loadRefs = async (companyId) => {
  const [groups, ledgers, stockGroups, stockItems, units, godowns] = await Promise.all([
    Group.find({ company: companyId }).lean(),
    Ledger.find({ company: companyId }).lean(),
    StockGroup.find({ company: companyId }).lean(),
    StockItem.find({ company: companyId }).lean(),
    Unit.find({ company: companyId }).lean(),
    Godown.find({ company: companyId }).lean(),
  ]);

  const byName = (items) => new Map(items.map((item) => [key(item.name), item]));
  const unitMap = byName(units);
  units.forEach((unit) => unitMap.set(key(unit.symbol), unit));

  return {
    groups: byName(groups),
    ledgers: byName(ledgers),
    stockGroups: byName(stockGroups),
    stockItems: byName(stockItems),
    units: unitMap,
    godowns: byName(godowns),
    defaultUnit: units.find((unit) => ['nos', 'numbers'].includes(key(unit.symbol)) || key(unit.name) === 'numbers') || units[0],
  };
};

const ledgerPayload = (row, refs, options = {}) => {
  const reasons = [];
  const name = text(get(row, ['ledger', 'ledger name', 'name', 'account name', 'party name']));
  const defaultGroup = options.groupName || '';
  const groupName = text(get(row, ['group', 'under', 'ledger group'])) || defaultGroup;
  const group = refs.groups.get(key(groupName));

  if (!name) reasons.push('Ledger name is required.');
  if (!groupName) reasons.push('Group is required.');
  if (groupName && !group) reasons.push(`Group "${groupName}" was not found.`);
  if (name && refs.ledgers.has(key(name))) reasons.push(`Ledger "${name}" already exists.`);

  return {
    reasons,
    payload: {
      name,
      group: group?._id,
      openingBalance: number(get(row, ['opening balance', 'balance', 'opening']), 0),
      openingBalanceType: drCr(get(row, ['opening balance type', 'drcr', 'type']), options.openingBalanceType || 'Dr'),
      gstApplicable: bool(get(row, ['gst applicable'])) || Boolean(get(row, ['gstin'])),
      gstin: text(get(row, ['gstin', 'gst no', 'gst number'])).toUpperCase(),
      gstType: gstType(get(row, ['gst type', 'registration type'])),
      partyType: options.partyType || text(get(row, ['party type'])),
      partyCode: text(get(row, ['party code', 'code'])),
      address: text(get(row, ['address', 'billing address'])),
      billingAddress: text(get(row, ['billing address'])),
      shippingAddress: text(get(row, ['shipping address'])),
      city: text(get(row, ['city'])),
      state: text(get(row, ['state'])),
      pincode: text(get(row, ['pincode', 'pin code', 'pin'])),
      country: text(get(row, ['country'])) || 'India',
      phone: text(get(row, ['phone', 'mobile'])),
      email: text(get(row, ['email'])),
      creditLimit: number(get(row, ['credit limit']), 0),
      creditDays: number(get(row, ['credit days']), 0),
      paymentTerms: text(get(row, ['payment terms'])),
      isActive: true,
    },
  };
};

const stockItemPayload = (row, refs) => {
  const reasons = [];
  const name = text(get(row, ['stock item', 'item', 'item name', 'name']));
  const groupName = text(get(row, ['stock group', 'group']));
  const unitName = text(get(row, ['unit', 'uom', 'symbol']));
  const group = groupName ? refs.stockGroups.get(key(groupName)) : null;
  const unit = unitName ? refs.units.get(key(unitName)) : refs.defaultUnit;
  const godownName = text(get(row, ['opening godown', 'godown']));
  const godown = godownName ? refs.godowns.get(key(godownName)) : null;

  if (!name) reasons.push('Stock item name is required.');
  if (name && refs.stockItems.has(key(name))) reasons.push(`Stock item "${name}" already exists.`);
  if (groupName && !group) reasons.push(`Stock group "${groupName}" was not found.`);
  if (!unit) reasons.push(unitName ? `Unit "${unitName}" was not found.` : 'Unit is required.');
  if (godownName && !godown) reasons.push(`Godown "${godownName}" was not found.`);

  return {
    reasons,
    payload: {
      name,
      group: group?._id,
      unit: unit?._id,
      hsnCode: text(get(row, ['hsn', 'hsn code', 'hsn/sac'])),
      gstRate: number(get(row, ['gst rate', 'gst %', 'tax rate']), 0),
      taxability: taxability(get(row, ['taxability'])),
      costPrice: number(get(row, ['cost price', 'cost']), 0),
      sellingPrice: number(get(row, ['selling price', 'sale price', 'rate']), 0),
      openingQty: number(get(row, ['opening qty', 'opening quantity', 'qty']), 0),
      openingRate: number(get(row, ['opening rate']), number(get(row, ['rate']), 0)),
      openingGodown: godown?._id,
      reorderLevel: number(get(row, ['reorder level']), 0),
      minimumStock: number(get(row, ['minimum stock', 'min stock']), 0),
      maximumStock: number(get(row, ['maximum stock', 'max stock']), 0),
      isActive: true,
    },
  };
};

const openingBalancePayload = (row, refs) => {
  const reasons = [];
  const ledgerName = text(get(row, ['ledger', 'ledger name', 'name', 'account name']));
  const itemName = text(get(row, ['stock item', 'item', 'item name']));
  const ledger = ledgerName ? refs.ledgers.get(key(ledgerName)) : null;
  const item = itemName ? refs.stockItems.get(key(itemName)) : null;

  if (!ledgerName && !itemName) reasons.push('Ledger name or stock item name is required.');
  if (ledgerName && !ledger) reasons.push(`Ledger "${ledgerName}" was not found.`);
  if (itemName && !item) reasons.push(`Stock item "${itemName}" was not found.`);

  if (ledger) {
    return {
      reasons,
      payload: {
        target: 'ledger',
        id: ledger._id,
        name: ledger.name,
        openingBalance: number(get(row, ['opening balance', 'balance', 'amount']), 0),
        openingBalanceType: drCr(get(row, ['opening balance type', 'drcr', 'type']), 'Dr'),
      },
    };
  }

  return {
    reasons,
    payload: {
      target: 'stock_item',
      id: item?._id,
      name: item?.name || itemName,
      openingQty: number(get(row, ['opening qty', 'opening quantity', 'qty']), 0),
      openingRate: number(get(row, ['opening rate', 'rate']), 0),
    },
  };
};

const validateRows = async (companyId, type, rows) => {
  if (!IMPORT_TYPES.includes(type)) throw new Error('Invalid import type.');
  const refs = await loadRefs(companyId);
  const seen = new Set();

  return rows.map((row, index) => {
    const options = type === 'customers'
      ? { groupName: 'Sundry Debtors', partyType: 'customer', openingBalanceType: 'Dr' }
      : type === 'vendors'
        ? { groupName: 'Sundry Creditors', partyType: 'vendor', openingBalanceType: 'Cr' }
        : {};

    const prepared = type === 'stock_items'
      ? stockItemPayload(row, refs)
      : type === 'opening_balances'
        ? openingBalancePayload(row, refs)
        : ledgerPayload(row, refs, options);

    const duplicateKey = type === 'opening_balances'
      ? `${prepared.payload.target}:${prepared.payload.name}`
      : prepared.payload.name;
    if (duplicateKey && seen.has(key(duplicateKey))) prepared.reasons.push('Duplicate row in this file.');
    if (duplicateKey) seen.add(key(duplicateKey));

    return {
      rowNumber: index + 2,
      status: prepared.reasons.length ? 'invalid' : 'valid',
      reasons: prepared.reasons,
      payload: prepared.payload,
      raw: row,
    };
  });
};

const previewMasterImport = async (companyId, type, source) => {
  const parsed = parseRows(source);
  const rows = await validateRows(companyId, type, parsed.rows);
  return {
    type,
    fileName: source.fileName || parsed.fileName || '',
    sheetName: parsed.sheetName,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === 'valid').length,
    invalidRows: rows.filter((row) => row.status === 'invalid').length,
    rows,
  };
};

const commitMasterImport = async (companyId, type, rows) => {
  if (!IMPORT_TYPES.includes(type)) throw new Error('Invalid import type.');
  const results = [];

  for (const row of rows || []) {
    if (row.status !== 'valid' || !row.payload) {
      results.push({ ...row, status: 'skipped', reasons: row.reasons?.length ? row.reasons : ['Row is not valid.'] });
      continue;
    }

    try {
      let data;
      if (type === 'stock_items') {
        data = await StockItem.create({ ...row.payload, company: companyId });
      } else if (type === 'opening_balances') {
        if (row.payload.target === 'ledger') {
          data = await Ledger.findOneAndUpdate(
            { _id: row.payload.id, company: companyId },
            { openingBalance: row.payload.openingBalance, openingBalanceType: row.payload.openingBalanceType },
            { new: true }
          );
        } else {
          data = await StockItem.findOneAndUpdate(
            { _id: row.payload.id, company: companyId },
            { openingQty: row.payload.openingQty, openingRate: row.payload.openingRate },
            { new: true }
          );
        }
      } else {
        data = await Ledger.create({ ...row.payload, company: companyId });
      }
      results.push({ rowNumber: row.rowNumber, status: 'imported', name: row.payload.name, id: data?._id });
    } catch (err) {
      results.push({ rowNumber: row.rowNumber, status: 'failed', name: row.payload.name, reasons: [err.message] });
    }
  }

  return {
    imported: results.filter((row) => row.status === 'imported').length,
    failed: results.filter((row) => row.status === 'failed').length,
    skipped: results.filter((row) => row.status === 'skipped').length,
    results,
  };
};

module.exports = {
  IMPORT_TYPES,
  commitMasterImport,
  previewMasterImport,
};
