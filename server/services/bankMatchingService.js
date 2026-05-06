const crypto = require('crypto');
const XLSX = require('xlsx');
const Voucher = require('../models/Voucher');

const HEADER_ALIASES = {
  date: ['date', 'transactiondate', 'txn date', 'txndate', 'valuedate', 'postingdate'],
  narration: ['narration', 'description', 'particulars', 'details', 'remarks', 'transactionremarks', 'transactiondetails'],
  chequeNo: ['chequeno', 'cheque no', 'chqno', 'chq no', 'refno', 'reference', 'reference no', 'utr', 'instrumentno'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'withdrawalamt', 'withdrawalamount', 'dr', 'paid', 'payment'],
  credit: ['credit', 'deposit', 'deposits', 'depositamt', 'depositamount', 'cr', 'received', 'receipt'],
  amount: ['amount', 'transactionamount', 'txnamount'],
  type: ['type', 'drcr', 'debitcredit', 'transactiontype'],
  balance: ['balance', 'closingbalance', 'runningbalance', 'availablebalance'],
};

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const aliasSet = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([key, values]) => [key, values.map(normalizeHeader)])
);

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }

  const raw = String(value).trim();
  const parts = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const [, dd, mm, yyyy] = parts;
    return new Date(`${yyyy.length === 2 ? `20${yyyy}` : yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  }

  const isoParts = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoParts) {
    const [, yyyy, mm, dd] = isoParts;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.abs(value);
  const raw = String(value).trim();
  const negative = raw.startsWith('-') || /^\(.+\)$/.test(raw);
  const cleaned = raw
    .replace(/\u20b9/g, '')
    .replace(/rs\.?|inr/gi, '')
    .replace(/[,\s()]/g, '')
    .replace(/[^\d.-]/g, '');
  const amount = Number(cleaned);
  if (Number.isNaN(amount)) return 0;
  return Math.abs(negative ? -amount : amount);
};

const parseSignedAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).trim();
  const negative = raw.startsWith('-') || /^\(.+\)$/.test(raw);
  const cleaned = raw
    .replace(/\u20b9/g, '')
    .replace(/rs\.?|inr/gi, '')
    .replace(/[,\s()]/g, '')
    .replace(/[^\d.-]/g, '');
  const amount = Number(cleaned);
  if (Number.isNaN(amount)) return 0;
  return negative && amount > 0 ? -amount : amount;
};

const parseDelimitedText = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  const firstLine = source.split(/\r?\n/).find((line) => line.trim()) || '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' && source[i + 1] === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
};

const parseWorkbookRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
};

const readByAlias = (row, headers, key) => {
  const index = headers.findIndex((header) => aliasSet[key].includes(header));
  return index >= 0 ? row[index] : '';
};

const mapRowsToStatementLines = (rows) => {
  if (!rows || rows.length < 2) return [];
  const headerIndex = rows.findIndex((row) => row.filter(Boolean).length >= 2);
  if (headerIndex < 0 || rows.length <= headerIndex + 1) return [];

  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1).map((row) => {
    const debit = parseAmount(readByAlias(row, headers, 'debit'));
    const credit = parseAmount(readByAlias(row, headers, 'credit'));
    const signedAmount = parseSignedAmount(readByAlias(row, headers, 'amount'));
    const amount = debit || credit || Math.abs(signedAmount);
    const typeText = normalizeText(readByAlias(row, headers, 'type'));
    const statementType = debit || typeText.includes('dr') || signedAmount < 0 ? 'Dr' : 'Cr';

    return {
      statementDate: parseDate(readByAlias(row, headers, 'date')),
      narration: readByAlias(row, headers, 'narration'),
      chequeNo: readByAlias(row, headers, 'chequeNo'),
      debit,
      credit,
      amount,
      statementType,
      type: statementType === 'Dr' ? 'Cr' : 'Dr',
      balance: parseAmount(readByAlias(row, headers, 'balance')),
      raw: headers.reduce((obj, header, index) => ({ ...obj, [header || `col${index}`]: row[index] }), {}),
    };
  }).filter((line) => line.statementDate && line.amount > 0);
};

const parseStatementContent = ({ text, fileData, fileName }) => {
  const lowerName = String(fileName || '').toLowerCase();
  if (fileData || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    if (!fileData) throw new Error('Excel file data is missing');
    const buffer = Buffer.from(fileData, 'base64');
    return mapRowsToStatementLines(parseWorkbookRows(buffer));
  }
  return mapRowsToStatementLines(parseDelimitedText(text));
};

const dateOnly = (date) => new Date(date).toISOString().slice(0, 10);

const createLineFingerprint = (companyId, bankLedgerId, line) => crypto
  .createHash('sha256')
  .update([
    companyId,
    bankLedgerId,
    dateOnly(line.statementDate),
    line.amount,
    line.type,
    normalizeText(line.narration),
    normalizeText(line.chequeNo),
  ].join('|'))
  .digest('hex');

const scoreText = (voucherText, lineText) => {
  const voucherTokens = new Set(normalizeText(voucherText).split(' ').filter((token) => token.length > 3));
  const lineTokens = normalizeText(lineText).split(' ').filter((token) => token.length > 3);
  if (!voucherTokens.size || !lineTokens.length) return 0;
  const hits = lineTokens.filter((token) => voucherTokens.has(token)).length;
  return Math.min(20, Math.round((hits / lineTokens.length) * 20));
};

const findVoucherCandidates = async (companyId, bankLedgerId, line, options = {}) => {
  const days = Number(options.days || 7);
  const start = new Date(line.statementDate);
  start.setDate(start.getDate() - days);
  const end = new Date(line.statementDate);
  end.setDate(end.getDate() + days);

  const vouchers = await Voucher.find({
    company: companyId,
    'entries.ledger': bankLedgerId,
    isCancelled: false,
    status: 'Approved',
    date: { $gte: start, $lte: end },
  })
    .select('date voucherNo voucherType narration reference entries total party')
    .populate('party', 'name');

  return vouchers.flatMap((voucher) => voucher.entries
    .filter((entry) => String(entry.ledger) === String(bankLedgerId))
    .map((entry) => {
      const amountDelta = Math.abs(Number(entry.amount || 0) - Number(line.amount || 0));
      if (amountDelta > 0.01) return null;
      const sameType = entry.type === line.type;
      if (!sameType && options.allowTypeMismatch !== true) return null;
      const dateDelta = Math.abs((new Date(voucher.date) - new Date(line.statementDate)) / 86400000);
      const voucherText = [voucher.narration, voucher.reference, voucher.party?.name, entry.narration, entry.billRef].join(' ');
      let score = 55;
      if (sameType) score += 20;
      score += Math.max(0, 15 - Math.round(dateDelta * 2));
      score += scoreText(voucherText, line.narration);
      if (entry.billRef && line.chequeNo && normalizeText(entry.billRef) === normalizeText(line.chequeNo)) score += 15;
      return {
        voucher: {
          _id: voucher._id,
          date: voucher.date,
          voucherNo: voucher.voucherNo,
          voucherType: voucher.voucherType,
          narration: voucher.narration,
          reference: voucher.reference,
          party: voucher.party,
          total: voucher.total,
        },
        entry: {
          amount: entry.amount,
          type: entry.type,
          narration: entry.narration,
          billRef: entry.billRef,
        },
        score,
        dateDelta,
        sameType,
      };
    })
    .filter(Boolean))
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(options.limit || 20));
};

const findBestVoucherMatch = async (companyId, bankLedgerId, line) => {
  const candidates = await findVoucherCandidates(companyId, bankLedgerId, line, { days: 7, limit: 1 });
  return candidates[0] || null;
};

module.exports = {
  createLineFingerprint,
  findBestVoucherMatch,
  findVoucherCandidates,
  parseStatementContent,
};
