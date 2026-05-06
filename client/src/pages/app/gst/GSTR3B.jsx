import ReportShell from '../reports/ReportShell';

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Row = ({ label, data = {} }) => (
  <tr className="border-b border-gray-50 hover:bg-gray-50">
    <td className="px-5 py-3 text-gray-700">{label}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(data.taxable)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(data.cgst)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(data.sgst)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(data.igst)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(data.cess)}</td>
    <td className="px-5 py-3 text-right font-mono font-semibold">{fmt((data.cgst || 0) + (data.sgst || 0) + (data.igst || 0) + (data.cess || 0))}</td>
  </tr>
);

export default function GSTR3B() {
  return (
    <ReportShell
      title="GSTR-3B - Monthly Summary Return"
      endpoint="gst/gstr3b"
      serverExport
      renderContent={(res) => {
        const d = res.data || {};
        return (
          <div className="p-5 space-y-8">
            <div>
              <div className="font-bold text-sm text-[#003087] bg-blue-50 px-4 py-2 rounded-t-xl">3.1 - Outward and reverse-charge supplies</div>
              <table className="w-full text-sm border border-gray-100 rounded-b-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    {['Description', 'Taxable', 'CGST', 'SGST', 'IGST', 'Cess', 'Tax Total'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-500 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Outward taxable supplies" data={d['3.1']?.outward} />
                  <Row label="Inward supplies liable to reverse charge" data={d['3.1']?.reverseCharge} />
                  <Row label="Nil rated, exempt, and non-GST outward supplies" data={d['3.1']?.nilExempt} />
                </tbody>
              </table>
            </div>
            <div>
              <div className="font-bold text-sm text-[#003087] bg-blue-50 px-4 py-2 rounded-t-xl">3.2 / 4 / 6.1 - Summary</div>
              <table className="w-full text-sm border border-gray-100 rounded-b-xl overflow-hidden">
                <tbody>
                  <Row label="Inter-state supplies to unregistered persons" data={d['3.2']?.interStateUnregistered} />
                  <Row label="Eligible input tax credit" data={d['4']?.inward} />
                  <Row label="Net tax payable" data={d['6.1']?.taxPayable} />
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    />
  );
}
