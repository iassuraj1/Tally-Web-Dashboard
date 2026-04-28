import ReportShell from '../reports/ReportShell';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Row = ({ label, cgst, sgst, igst }) => (
  <tr className="border-b border-gray-50 hover:bg-gray-50">
    <td className="px-5 py-3 text-gray-700">{label}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(cgst)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(sgst)}</td>
    <td className="px-5 py-3 text-right font-mono">{fmt(igst)}</td>
    <td className="px-5 py-3 text-right font-mono font-semibold">{fmt((cgst||0)+(sgst||0)+(igst||0))}</td>
  </tr>
);

export default function GSTR3B() {
  return (
    <ReportShell title="GSTR-3B — Monthly Summary Return" endpoint="gst/gstr3b"
      renderContent={(res) => {
        const d = res.data || {};
        const out = d['3.1']?.outward || {};
        const inp = d['4']?.inward   || {};
        const pay = d['6.1']?.taxPayable || {};
        return (
          <div className="p-5 space-y-8">
            {[
              { title: '3.1 — Outward Taxable Supplies', data: out },
              { title: '4 — Eligible Input Tax Credit', data: inp },
              { title: '6.1 — Tax Payable', data: pay },
            ].map(({ title, data }) => (
              <div key={title}>
                <div className="font-bold text-sm text-[#003087] bg-blue-50 px-4 py-2 rounded-t-xl">{title}</div>
                <table className="w-full text-sm border border-gray-100 rounded-b-xl overflow-hidden">
                  <thead><tr className="bg-gray-50"><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Description</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">CGST</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">SGST</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">IGST</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Total</th></tr></thead>
                  <tbody>
                    <Row label={title.split('—')[1]?.trim()} cgst={data.cgst} sgst={data.sgst} igst={data.igst} />
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
}
