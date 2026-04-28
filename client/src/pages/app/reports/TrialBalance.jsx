import ReportShell from './ReportShell';

export default function TrialBalance() {
  return (
    <ReportShell title="Trial Balance" endpoint="reports/trial-balance"
      renderContent={(res, fmt) => {
        const rows = res.data || [];
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Ledger</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Group</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Nature</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Debit</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{r.ledger}</td>
                  <td className="px-5 py-2.5 text-gray-500">{r.group}</td>
                  <td className="px-5 py-2.5 text-gray-500">{r.nature}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-gray-800">{r.debit ? fmt(r.debit) : ''}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-gray-800">{r.credit ? fmt(r.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td colSpan={3} className="px-5 py-3 text-sm">Total</td>
                <td className="px-5 py-3 text-right text-sm font-mono">{fmt(res.totals?.debit)}</td>
                <td className="px-5 py-3 text-right text-sm font-mono">{fmt(res.totals?.credit)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }}
    />
  );
}
