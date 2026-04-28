import ReportShell from '../reports/ReportShell';

export default function HSNSummary() {
  return (
    <ReportShell title="HSN-wise Summary" endpoint="gst/hsn-summary"
      renderContent={(res, fmt) => {
        const rows = res.data || [];
        return (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{['HSN Code','Qty','Taxable Value','CGST','SGST','IGST','Total Tax','Grand Total'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.hsnCode}</td>
                  <td className="px-5 py-3 text-gray-600">{r.qty}</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(r.taxable)}</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(r.cgst)}</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(r.sgst)}</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(r.igst)}</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(r.cgst + r.sgst + r.igst)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">{fmt(r.total)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        );
      }}
    />
  );
}
