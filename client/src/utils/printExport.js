export const COMPANY_NAME = 'JBCrownstone Prime';

const todayStr = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function exportCSV(filename, headers, rows, title = '') {
  const BOM = '﻿';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    [esc(COMPANY_NAME)],
    title ? [esc(title)] : null,
    [esc(`Generated: ${todayStr()}`)],
    [],
    headers.map(esc),
    ...rows.map((r) => r.map(esc)),
  ].filter(Boolean);
  const csv = BOM + lines.map((l) => l.join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printWindow(title, tableHTML, subtitle = '') {
  const w = window.open('', '_blank', 'width=960,height=720');
  if (!w) { alert('Please allow pop-ups to use the print feature.'); return; }
  w.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${COMPANY_NAME} — ${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:24px 32px}
  .no-print{display:flex;gap:10px;margin-bottom:16px}
  .hdr{text-align:center;border-bottom:2px solid #003087;padding-bottom:12px;margin-bottom:16px}
  .co{font-size:20px;font-weight:800;color:#003087;letter-spacing:.5px}
  .ttl{font-size:14px;font-weight:700;margin-top:4px}
  .sub{font-size:11px;color:#555;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead th{background:#003087;color:#fff;padding:7px 10px;text-align:left;font-size:11px;font-weight:600}
  thead th.r{text-align:right}
  tbody td{padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:11px}
  tbody td.r{text-align:right;font-family:monospace}
  tbody tr:nth-child(even){background:#f9fafb}
  tfoot td{font-weight:700;background:#eff6ff;padding:6px 10px;border-top:2px solid #003087}
  tfoot td.r{text-align:right;font-family:monospace}
  .foot{margin-top:20px;font-size:10px;color:#888;text-align:right}
  @media print{.no-print{display:none!important}}
</style></head>
<body>
<div class="no-print">
  <button onclick="window.print()" style="padding:7px 18px;background:#003087;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">Print</button>
  <button onclick="window.close()" style="padding:7px 18px;background:#f3f4f6;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:12px">Close</button>
</div>
<div class="hdr">
  <div class="co">${COMPANY_NAME}</div>
  <div class="ttl">${title}</div>
  ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
</div>
${tableHTML}
<div class="foot">Printed on ${new Date().toLocaleString('en-IN')}</div>
</body></html>`);
  w.document.close();
}
