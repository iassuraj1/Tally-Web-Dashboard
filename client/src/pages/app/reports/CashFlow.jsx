import ReportShell from './ReportShell';

export default function CashFlow() {
  return (
    <ReportShell title="Cash Flow Statement" endpoint="reports/cash-flow"
      renderContent={(res, fmt) => {
        const d = res.data;
        const netFlow = (d.totalInflow || 0) - (d.totalOutflow || 0);
        return (
          <div>
            <div className="grid grid-cols-3 divide-x border-b">
              {[['Total Inflow', d.totalInflow, 'text-green-600'], ['Total Outflow', d.totalOutflow, 'text-red-600'], ['Net Cash Flow', netFlow, netFlow >= 0 ? 'text-[#003087]' : 'text-red-600']].map(([l, v, c]) => (
                <div key={l} className="px-6 py-5 text-center">
                  <div className={`text-2xl font-bold ${c}`}>{fmt(v)}</div>
                  <div className="text-xs text-gray-400 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <div className="md:flex divide-y md:divide-y-0 md:divide-x">
              {[['Cash Inflows', d.inflow, 'text-green-800 bg-green-50'], ['Cash Outflows', d.outflow, 'text-red-800 bg-red-50']].map(([title, rows, cls]) => (
                <div key={title} className="flex-1">
                  <div className={`px-5 py-2.5 font-bold text-sm uppercase tracking-wide ${cls}`}>{title}</div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Date</th><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Ledger</th><th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Narration</th><th className="text-right px-5 py-2 text-xs font-semibold text-gray-500">Amount</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {(rows || []).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 text-gray-500">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-5 py-2.5 font-medium text-gray-800">{r.ledger}</td>
                          <td className="px-5 py-2.5 text-gray-500 max-w-xs truncate">{r.narration || '—'}</td>
                          <td className="px-5 py-2.5 text-right font-mono">{fmt(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
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
