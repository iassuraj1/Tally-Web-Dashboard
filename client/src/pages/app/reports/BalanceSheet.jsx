import ReportShell from './ReportShell';

const Section = ({ title, rows, total, fmt, color }) => (
  <div className="flex-1">
    <div className={`px-5 py-2.5 font-bold text-sm uppercase tracking-wide ${color}`}>{title}</div>
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50 border-b"><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Ledger</th><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Group</th><th className="text-right px-5 py-2 text-xs font-semibold text-gray-500">Amount</th></tr></thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="px-5 py-2.5 font-medium text-gray-800">{r.name}</td>
            <td className="px-5 py-2.5 text-gray-500">{r.group}</td>
            <td className="px-5 py-2.5 text-right font-mono">{fmt(r.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200 font-bold"><td colSpan={2} className="px-5 py-3">Total</td><td className="px-5 py-3 text-right font-mono">{fmt(total)}</td></tr></tfoot>
    </table>
  </div>
);

export default function BalanceSheet() {
  return (
    <ReportShell title="Balance Sheet" endpoint="reports/balance-sheet" showDateRange={false} serverExport
      renderContent={(res, fmt) => {
        const d = res.data;
        return (
          <div className="divide-y divide-gray-100 md:flex md:divide-y-0 md:divide-x">
            <Section title="Liabilities" rows={d.liabilities} total={d.totalLiabilities} fmt={fmt} color="bg-red-50 text-red-800" />
            <Section title="Assets"      rows={d.assets}      total={d.totalAssets}      fmt={fmt} color="bg-green-50 text-green-800" />
          </div>
        );
      }}
    />
  );
}
