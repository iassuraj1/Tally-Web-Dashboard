import ReportShell from './ReportShell';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
const typeColor = {
  Sales: 'bg-green-100 text-green-700',
  Purchase: 'bg-blue-100 text-blue-700',
  Payment: 'bg-red-100 text-red-700',
  Receipt: 'bg-yellow-100 text-yellow-700',
  Journal: 'bg-gray-100 text-gray-600',
  Contra: 'bg-purple-100 text-purple-700',
};

export default function DayBook() {
  return (
    <ReportShell
      title="Day Book"
      endpoint="reports/daybook"
      serverExport
      renderContent={(res, fmt) => {
        const rows = res.data || [];
        if (!rows.length) return <div className="text-center py-16 text-gray-400">No vouchers for selected period</div>;
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Date', 'Type', 'Voucher No', 'Party / Narration', 'Entries', 'Total'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((voucher) => (
                  <tr key={voucher._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDate(voucher.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor[voucher.voucherType] || 'bg-gray-100 text-gray-600'}`}>
                        {voucher.voucherType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{voucher.voucherNo}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{voucher.party?.name || voucher.narration || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {voucher.entries?.map((entry) => `${entry.ledger?.name} ${entry.type} ${fmt(entry.amount)}`).join('; ')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmt(voucher.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }}
    />
  );
}
