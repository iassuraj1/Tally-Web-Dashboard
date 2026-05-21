import ReportShell from '../reports/ReportShell';

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const InvoiceTable = ({ rows, title }) => (
  <div className="mb-6">
    <div className="bg-blue-50 px-5 py-2.5 font-bold text-sm text-[#003087] border-b">{title} ({rows.length} records)</div>
    {rows.length === 0 ? (
      <div className="px-5 py-8 text-center text-gray-400 text-sm">No records</div>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            {['Date', 'Invoice No', 'Party', 'GSTIN', 'Place', 'Taxable', 'CGST', 'SGST', 'UTGST', 'IGST', 'Total'].map((h) => (
              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={`${r.voucherNo}-${i}`} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{r.voucherNo}</td>
              <td className="px-4 py-2.5 text-gray-700">{r.party || '-'}</td>
              <td className="px-4 py-2.5 text-gray-500">{r.gstin || '-'}</td>
              <td className="px-4 py-2.5 text-gray-500">{r.placeOfSupply || '-'}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmt(r.taxable)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmt(r.cgst)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmt(r.sgst)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmt(r.utgst)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmt(r.igst)}</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default function GSTR1() {
  return (
    <ReportShell
      title="GSTR-1 - Outward Supplies"
      endpoint="gst/gstr1"
      serverExport
      renderContent={(res) => {
        const { b2b = [], b2cl = [], b2cs = [], cdnr = [], cdnur = [], nil = [] } = res.data || {};
        const s = res.summary || {};
        return (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-6 divide-x border-b">
              {[
                ['Invoices', s.invoiceCount],
                ['Taxable Value', s.totalTaxable],
                ['Total CGST', s.totalCGST],
                ['Total SGST', s.totalSGST],
                ['Total UTGST', s.totalUTGST],
                ['Total IGST', s.totalIGST],
              ].map(([l, v]) => (
                <div key={l} className="px-5 py-4 text-center">
                  <div className="text-xl font-bold text-[#003087]">{l === 'Invoices' ? Number(v || 0) : fmt(v)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
            <div className="p-5">
              <InvoiceTable rows={b2b} title="B2B - Registered Persons" />
              <InvoiceTable rows={b2cl} title="B2CL - Large Inter-state Consumers" />
              <InvoiceTable rows={b2cs} title="B2CS - Small / Intra-state Consumers" />
              <InvoiceTable rows={cdnr} title="CDNR - Registered Credit / Debit Notes" />
              <InvoiceTable rows={cdnur} title="CDNUR - Unregistered Credit / Debit Notes" />
              <InvoiceTable rows={nil} title="Nil / Exempt / Non-GST Outward Supplies" />
            </div>
          </div>
        );
      }}
    />
  );
}
