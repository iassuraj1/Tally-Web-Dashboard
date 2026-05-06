import ReportShell from './ReportShell';

export default function ProfitLoss() {
  return (
    <ReportShell title="Profit & Loss Statement" endpoint="reports/profit-loss" serverExport
      renderContent={(res, fmt) => {
        const d = res.data;
        return (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-3 divide-x border-b border-gray-100">
              {[
                { label: 'Gross Profit', val: d.grossProfit, color: d.grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'Net Profit',   val: d.netProfit,   color: d.netProfit   >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'Net Margin',   val: d.totalIncome ? `${((d.netProfit / d.totalIncome) * 100).toFixed(1)}%` : '—', color: 'text-[#003087]' },
              ].map(s => (
                <div key={s.label} className="px-6 py-5 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{typeof s.val === 'number' ? fmt(s.val) : s.val}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="md:flex divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {[['Income', d.income, d.totalIncome, 'text-green-800 bg-green-50'], ['Expenses', d.expenses, d.totalExpenses, 'text-red-800 bg-red-50']].map(([title, rows, total, cls]) => (
                <div key={title} className="flex-1">
                  <div className={`px-5 py-2.5 font-bold text-sm uppercase tracking-wide ${cls}`}>{title}</div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Account</th><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Group</th><th className="text-right px-5 py-2 text-xs font-semibold text-gray-500">Amount</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {(rows || []).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium text-gray-800">{r.name}</td>
                          <td className="px-5 py-2.5 text-gray-500">{r.group}</td>
                          <td className="px-5 py-2.5 text-right font-mono">{fmt(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-50 border-t-2 font-bold"><td colSpan={2} className="px-5 py-3">Total</td><td className="px-5 py-3 text-right font-mono">{fmt(total)}</td></tr></tfoot>
                  </table>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
