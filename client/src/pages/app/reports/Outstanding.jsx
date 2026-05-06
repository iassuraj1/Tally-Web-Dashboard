import ReportShell from './ReportShell';

export default function Outstanding({ type = 'receivable' }) {
  const title = type === 'receivable' ? 'Sundry Receivables (Debtors)' : 'Sundry Payables (Creditors)';
  return (
    <ReportShell title={title} endpoint={`reports/outstanding?type=${type}`} showDateRange={false} serverExport
      renderContent={(res, fmt) => {
        const rows = res.data || [];
        return (
          <>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Party Name</th><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Phone</th><th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Email</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Balance</th><th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Dr/Cr</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.ledger}</td>
                    <td className="px-5 py-3 text-gray-500">{r.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{r.email || '—'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-gray-900">{fmt(r.balance)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.type === 'Dr' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.type}</span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No outstanding amounts</td></tr>}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 font-bold">
                  <td colSpan={3} className="px-5 py-3">Total Outstanding</td>
                  <td className="px-5 py-3 text-right font-mono">{fmt(res.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </>
        );
      }}
    />
  );
}
