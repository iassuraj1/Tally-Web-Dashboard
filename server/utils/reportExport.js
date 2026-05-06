const XLSX = require('xlsx');

const cleanSheetName = (name) => String(name || 'Sheet').replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet';
const cleanFilename = (name) => String(name || 'report').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'report';

const flattenRows = (sheets) => sheets.flatMap((sheet) => [
  { section: sheet.name },
  ...(sheet.rows || []).map((row) => ({ section: sheet.name, ...row })),
  {},
]);

const escCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const escPdf = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const stringifyCell = (value) => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const sendCsv = (res, filename, sheets) => {
  const rows = flattenRows(sheets);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    headers.map(escCsv).join(','),
    ...rows.map((row) => headers.map((header) => escCsv(row[header])).join(',')),
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename(filename)}.csv"`);
  res.send(`\uFEFF${csv}`);
};

const sendXlsx = (res, filename, sheets) => {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(sheet.rows || []),
      cleanSheetName(sheet.name)
    );
  }
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename(filename)}.xlsx"`);
  res.send(buffer);
};

const tableLines = (title, sheets) => {
  const lines = [title, `Generated: ${new Date().toLocaleString('en-IN')}`, ''];
  for (const sheet of sheets) {
    lines.push(sheet.name);
    const rows = sheet.rows || [];
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (headers.length) lines.push(headers.join(' | '));
    for (const row of rows) {
      lines.push(headers.map((header) => stringifyCell(row[header])).join(' | '));
    }
    lines.push('');
  }
  return lines.flatMap((line) => {
    const text = String(line || '');
    const chunks = [];
    for (let i = 0; i < Math.max(text.length, 1); i += 112) chunks.push(text.slice(i, i + 112));
    return chunks.length ? chunks : [''];
  });
};

const buildSimplePdf = (title, sheets) => {
  const lines = tableLines(title, sheets);
  const pageSize = 62;
  const pages = [];
  for (let i = 0; i < lines.length; i += pageSize) pages.push(lines.slice(i, i + pageSize));

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  for (const pageLines of pages) {
    const content = [
      'BT',
      '/F1 8 Tf',
      '10 TL',
      '36 806 Td',
      ...pageLines.map((line) => `(${escPdf(line)}) Tj T*`),
      'ET',
    ].join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objects.length; i += 1) {
    chunks.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(chunks.join(''), 'binary');
};

const sendPdf = (res, filename, sheets, title) => {
  const buffer = buildSimplePdf(title || filename, sheets);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename(filename)}.pdf"`);
  res.send(buffer);
};

const sendReportExport = (res, filename, sheets, format, title) => {
  if (format === 'xlsx') return sendXlsx(res, filename, sheets);
  if (format === 'pdf') return sendPdf(res, filename, sheets, title);
  return sendCsv(res, filename, sheets);
};

module.exports = {
  cleanFilename,
  sendReportExport,
};
