import ReportShell from '../reports/ReportShell';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const config = {
  mismatch: {
    title: 'GST Mismatch Checks',
    endpoint: 'gst/mismatch-checks',
    empty: 'No GST mismatches found',
    columns: ['Date', 'Voucher', 'Type', 'Party', 'Issue', 'Expected', 'Actual', 'Severity'],
    renderRow: (row) => [
      fmtDate(row.date),
      row.voucherNo,
      row.voucherType,
      row.party || '-',
      row.issue,
      row.expected ?? '-',
      row.actual ?? '-',
      row.severity,
    ],
  },
  missingGstin: {
    title: 'Missing GSTIN Report',
    endpoint: 'gst/missing-gstin',
    empty: 'No taxable parties without GSTIN',
    columns: ['Date', 'Voucher', 'Type', 'Party', 'Treatment', 'Place', 'Taxable', 'Tax', 'Total', 'Contact'],
    renderRow: (row, fmt) => [
      fmtDate(row.date),
      row.voucherNo,
      row.voucherType,
      row.party || '-',
      row.gstTreatment || '-',
      row.placeOfSupply || '-',
      fmt(row.taxable),
      fmt(row.tax),
      fmt(row.total),
      row.email || row.phone || '-',
    ],
  },
  reverseCharge: {
    title: 'Reverse Charge Report',
    endpoint: 'gst/reverse-charge',
    empty: 'No reverse-charge vouchers found',
    columns: ['Date', 'Voucher', 'Type', 'Party', 'GSTIN', 'Taxable', 'CGST', 'SGST', 'UTGST', 'IGST', 'Total'],
    renderRow: (row, fmt) => [
      fmtDate(row.date),
      row.voucherNo,
      row.voucherType,
      row.party || '-',
      row.gstin || '-',
      fmt(row.taxable),
      fmt(row.cgst),
      fmt(row.sgst),
      fmt(row.utgst),
      fmt(row.igst),
      fmt(row.total),
    ],
  },
};

export default function GSTCompliance({ report }) {
  const view = config[report] || config.mismatch;

  return (
    <ReportShell
      title={view.title}
      endpoint={view.endpoint}
      serverExport
      renderContent={(res, fmt) => {
        const rows = res.data || [];
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {view.columns.map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, index) => (
                <tr key={`${row.voucherNo}-${index}`} className="hover:bg-gray-50">
                  {view.renderRow(row, fmt).map((cell, cellIndex) => (
                    <td key={`${row.voucherNo}-${cellIndex}`} className={`px-5 py-3 ${cellIndex >= 5 ? 'text-right font-mono' : 'text-gray-700'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={view.columns.length} className="px-5 py-10 text-center text-gray-400">{view.empty}</td></tr>}
            </tbody>
          </table>
        );
      }}
    />
  );
}
