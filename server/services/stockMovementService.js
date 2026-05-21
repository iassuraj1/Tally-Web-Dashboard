const StockItem = require('../models/StockItem');
const Voucher = require('../models/Voucher');
const InventoryValuationSnapshot = require('../models/InventoryValuationSnapshot');
const { query } = require('../config/db');

const IN_TYPES = new Set(['Purchase', 'CreditNote', 'ReceiptNote']);
const OUT_TYPES = new Set(['Sales', 'DebitNote', 'DeliveryNote']);
const STOCK_POSTING_STATUSES = new Set(['Submitted', 'Approved']);
const STOCK_QTY_PRECISION = 6;
const STOCK_EPSILON = 1 / (10 ** STOCK_QTY_PRECISION);

class StockLevelError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'StockLevelError';
    this.code = 'INSUFFICIENT_STOCK';
    this.statusCode = 400;
    this.details = details;
  }
}

const roundQty = (value) => {
  const rounded = Math.round((Number(value) || 0) * (10 ** STOCK_QTY_PRECISION)) / (10 ** STOCK_QTY_PRECISION);
  return Math.abs(rounded) < STOCK_EPSILON ? 0 : rounded;
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const idString = (value) => {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
};

const isStockPosted = (voucher) => {
  if (!voucher || voucher.isCancelled) return false;
  const status = voucher.status || 'Submitted';
  return STOCK_POSTING_STATUSES.has(status);
};

const toDateEnd = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const movementSign = (voucherType) => {
  if (IN_TYPES.has(voucherType)) return 1;
  if (OUT_TYPES.has(voucherType)) return -1;
  if (voucherType === 'StockJournal') return 1;
  return 0;
};

const collectVoucherDeltas = (voucher) => {
  const deltas = new Map();
  if (!isStockPosted(voucher)) return deltas;

  const sign = movementSign(voucher.voucherType);
  if (!sign) return deltas;

  for (const line of voucher.items || []) {
    const itemId = idString(line.item);
    const qty = Number(line.qty || 0);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
    deltas.set(itemId, roundQty((deltas.get(itemId) || 0) + (sign * qty)));
  }

  return deltas;
};

const stockDeltasForChange = (before, after) => {
  const deltas = new Map();
  const beforeDeltas = collectVoucherDeltas(before);
  const afterDeltas = collectVoucherDeltas(after);

  for (const [itemId, qty] of beforeDeltas.entries()) {
    deltas.set(itemId, roundQty((deltas.get(itemId) || 0) - qty));
  }
  for (const [itemId, qty] of afterDeltas.entries()) {
    deltas.set(itemId, roundQty((deltas.get(itemId) || 0) + qty));
  }

  return [...deltas.entries()].filter(([, qty]) => Math.abs(qty) >= STOCK_EPSILON);
};

const lockStockItemData = async (companyId, itemId) => {
  const item = await StockItem.findOne({ _id: itemId, company: companyId }).select('name openingQty currentQty').lean();
  if (!item) {
    const err = new Error('Stock item not found for this company.');
    err.statusCode = 404;
    throw err;
  }

  const result = await query(
    'SELECT data FROM "stock_items" WHERE id = $1 AND data @> $2::jsonb FOR UPDATE',
    [String(itemId), JSON.stringify({ company: String(companyId) })]
  );

  const data = result.rows[0]?.data;
  if (!data) {
    const err = new Error('Stock item not found for this company.');
    err.statusCode = 404;
    throw err;
  }

  return data;
};

const saveStockItemData = async (itemId, data) => {
  const now = new Date();
  data.updatedAt = now.toISOString();
  await query(
    'UPDATE "stock_items" SET data = $2::jsonb, updated_at = $3 WHERE id = $1',
    [String(itemId), JSON.stringify(data), now]
  );
};

const syncCompanyStockBalances = async (companyId) => {
  const rows = await getValuation(companyId);
  const now = new Date().toISOString();

  for (const row of rows) {
    const itemId = idString(row._id);
    const data = await lockStockItemData(companyId, itemId);
    data.currentQty = roundQty(row.closingQty);
    data.currentRate = roundMoney(row.closingRate);
    data.currentValue = roundMoney(row.closingValue);
    data.stockSyncedAt = now;
    await saveStockItemData(itemId, data);
  }

  return rows;
};

const applyVoucherStockEffect = async (companyId, beforeVoucher, afterVoucher) => {
  const deltas = stockDeltasForChange(beforeVoucher, afterVoucher);
  if (!deltas.length) return [];

  await syncCompanyStockBalances(companyId);

  const applied = [];
  for (const [itemId, deltaQty] of deltas) {
    const data = await lockStockItemData(companyId, itemId);
    const currentQty = roundQty(data.currentQty ?? data.openingQty ?? 0);
    const nextQty = roundQty(currentQty + deltaQty);

    if (deltaQty < 0 && nextQty < -STOCK_EPSILON) {
      throw new StockLevelError(
        `Insufficient stock for "${data.name || 'selected item'}". Available ${currentQty}, requested ${Math.abs(deltaQty)}.`,
        {
          itemId,
          itemName: data.name || '',
          availableQty: currentQty,
          requestedQty: Math.abs(deltaQty),
        }
      );
    }

    data.currentQty = nextQty < 0 ? 0 : nextQty;
    data.lastStockMovementAt = new Date().toISOString();
    await saveStockItemData(itemId, data);
    applied.push({ itemId, deltaQty, currentQty, nextQty: data.currentQty });
  }

  return applied;
};

const getMovements = async (companyId, { itemId, to } = {}) => {
  const filter = {
    company: companyId,
    voucherType: { $in: ['Sales', 'Purchase', 'CreditNote', 'DebitNote', 'StockJournal', 'DeliveryNote', 'ReceiptNote'] },
    isCancelled: false,
    $or: [
      { status: { $in: [...STOCK_POSTING_STATUSES] } },
      { status: { $exists: false } },
    ],
  };
  const end = toDateEnd(to);
  if (end) filter.date = { $lte: end };
  if (itemId) filter['items.item'] = itemId;

  const vouchers = await Voucher.find(filter)
    .populate('party', 'name')
    .populate('items.item', 'name hsnCode valuationMethod standardCost costPrice openingQty openingRate reorderLevel minimumStock maximumStock maintainBatch trackExpiry')
    .populate('items.unit', 'symbol')
    .sort({ date: 1, _id: 1 });

  const movements = [];
  for (const voucher of vouchers) {
    const sign = movementSign(voucher.voucherType);
    for (const line of voucher.items || []) {
      if (itemId && String(line.item?._id || line.item) !== String(itemId)) continue;
      if (!line.item || !sign) continue;
      const qty = Number(line.qty || 0);
      movements.push({
        item: line.item,
        itemId: String(line.item._id || line.item),
        date: voucher.date,
        voucherType: voucher.voucherType,
        voucherNo: voucher.voucherNo,
        party: voucher.party?.name || '',
        inQty: sign > 0 ? qty : 0,
        outQty: sign < 0 ? qty : 0,
        qty: sign * qty,
        rate: Number(line.rate || 0),
        amount: Number(line.amount || 0),
        batchNo: line.batchNo || '',
        expiry: line.expiry,
        serialNumbers: line.serialNumbers || [],
      });
    }
  }
  return movements;
};

const applyFifoOut = (layers, outQty) => {
  let remaining = outQty;
  let value = 0;
  while (remaining > 0 && layers.length) {
    const layer = layers[0];
    const used = Math.min(layer.qty, remaining);
    value += used * layer.rate;
    layer.qty -= used;
    remaining -= used;
    if (layer.qty <= 0.000001) layers.shift();
  }
  if (remaining > 0) value += remaining * (layers[0]?.rate || 0);
  return value;
};

const valueItem = (item, movements, methodOverride) => {
  const method = methodOverride || item.valuationMethod || 'Weighted Average';
  const openingQty = Number(item.openingQty || 0);
  const openingRate = Number(item.openingRate || item.costPrice || item.standardCost || 0);
  let closingQty = openingQty;
  let closingValue = method === 'Standard Cost'
    ? openingQty * Number(item.standardCost || item.costPrice || openingRate || 0)
    : openingQty * openingRate;
  let weightedQty = openingQty;
  let weightedValue = openingQty * openingRate;
  const layers = openingQty > 0 ? [{ qty: openingQty, rate: openingRate, source: 'Opening', date: item.createdAt }] : [];

  for (const movement of movements) {
    const inQty = Number(movement.inQty || 0);
    const outQty = Number(movement.outQty || 0);
    if (inQty > 0) {
      closingQty += inQty;
      if (method === 'FIFO') {
        layers.push({ qty: inQty, rate: movement.rate, source: movement.voucherNo, date: movement.date });
        closingValue += inQty * movement.rate;
      } else if (method === 'Standard Cost') {
        closingValue += inQty * Number(item.standardCost || item.costPrice || movement.rate || 0);
      } else {
        weightedQty += inQty;
        weightedValue += inQty * movement.rate;
        closingValue = weightedValue;
      }
    }
    if (outQty > 0) {
      closingQty -= outQty;
      if (method === 'FIFO') {
        closingValue -= applyFifoOut(layers, outQty);
      } else if (method === 'Standard Cost') {
        closingValue -= outQty * Number(item.standardCost || item.costPrice || openingRate || 0);
      } else {
        const avgRate = weightedQty > 0 ? weightedValue / weightedQty : 0;
        weightedQty -= outQty;
        weightedValue -= outQty * avgRate;
        closingValue = weightedValue;
      }
    }
  }

  const closingRate = closingQty ? closingValue / closingQty : 0;
  return {
    valuationMethod: method,
    closingQty,
    closingRate,
    closingValue,
    layers: method === 'FIFO' ? layers.filter((layer) => layer.qty > 0.000001) : [],
  };
};

const getValuation = async (companyId, { method, to, saveSnapshot = false } = {}) => {
  const items = await StockItem.find({ company: companyId }).populate('unit', 'symbol').populate('group', 'name');
  const movements = await getMovements(companyId, { to });
  const byItem = movements.reduce((map, movement) => {
    if (!map[movement.itemId]) map[movement.itemId] = [];
    map[movement.itemId].push(movement);
    return map;
  }, {});

  const rows = items.map((item) => {
    const valuation = valueItem(item, byItem[item._id.toString()] || [], method);
    return {
      _id: item._id,
      name: item.name,
      group: item.group?.name || '',
      unit: item.unit?.symbol || '',
      hsnCode: item.hsnCode || '',
      openingQty: item.openingQty || 0,
      inQty: (byItem[item._id.toString()] || []).reduce((sum, m) => sum + m.inQty, 0),
      outQty: (byItem[item._id.toString()] || []).reduce((sum, m) => sum + m.outQty, 0),
      reorderLevel: item.reorderLevel || 0,
      minimumStock: item.minimumStock || 0,
      maximumStock: item.maximumStock || 0,
      ...valuation,
    };
  });

  if (saveSnapshot) {
    const asOfDate = toDateEnd(to) || new Date();
    await InventoryValuationSnapshot.insertMany(rows.map((row) => ({
      company: companyId,
      item: row._id,
      asOfDate,
      valuationMethod: row.valuationMethod,
      closingQty: row.closingQty,
      closingRate: row.closingRate,
      closingValue: row.closingValue,
      layers: row.layers,
    })), { ordered: false }).catch(() => {});
  }

  return rows;
};

const getBatchReport = async (companyId, { expiryTo } = {}) => {
  const movements = await getMovements(companyId);
  const expiryLimit = toDateEnd(expiryTo);
  const map = {};
  for (const movement of movements) {
    if (!movement.batchNo && !movement.serialNumbers.length) continue;
    if (expiryLimit && movement.expiry && new Date(movement.expiry) > expiryLimit) continue;
    const key = `${movement.itemId}|${movement.batchNo}|${movement.expiry || ''}`;
    if (!map[key]) {
      map[key] = {
        item: movement.item?.name || '',
        itemId: movement.itemId,
        batchNo: movement.batchNo || 'No Batch',
        expiry: movement.expiry,
        inQty: 0,
        outQty: 0,
        closingQty: 0,
        serialNumbers: new Set(),
      };
    }
    map[key].inQty += movement.inQty;
    map[key].outQty += movement.outQty;
    map[key].closingQty += movement.qty;
    movement.serialNumbers.forEach((serial) => map[key].serialNumbers.add(serial));
  }
  return Object.values(map).map((row) => ({ ...row, serialNumbers: [...row.serialNumbers] }));
};

module.exports = {
  STOCK_POSTING_STATUSES,
  StockLevelError,
  applyVoucherStockEffect,
  getMovements,
  getValuation,
  getBatchReport,
  isStockPosted,
  syncCompanyStockBalances,
};
