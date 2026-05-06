import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiPlay } from 'react-icons/fi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ProcessPayroll() {
  const { company } = useCompany();
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadPayslips = useCallback(() => {
    if (!company) return;
    setLoading(true);
    api.get(`/companies/${company._id}/payroll/payslips?month=${month}&year=${year}`)
      .then(r => setResults(r.data.data || []))
      .finally(() => setLoading(false));
  }, [company, month, year]);

  useEffect(() => {
    if (!company) return undefined;
    const id = setTimeout(() => {
      api.get(`/companies/${company._id}/payroll/employees`).then(r => setEmployees(r.data.data || []));
      loadPayslips();
    }, 0);
    return () => clearTimeout(id);
  }, [company, loadPayslips]);

  const processAll = async () => {
    if (!employees.length) return;
    setProcessing(true);
    let failed = 0;
    try {
      for (const emp of employees) {
        try {
          await api.post(`/companies/${company._id}/payroll/process`, { employeeId: emp._id, month, year });
        } catch {
          failed += 1;
        }
      }
      await loadPayslips();
      if (failed) alert(`${failed} employee${failed === 1 ? '' : 's'} could not be processed.`);
    } finally {
      setProcessing(false);
    }
  };

  const processOne = async (empId) => {
    try {
      await api.post(`/companies/${company._id}/payroll/process`, { employeeId: empId, month, year });
      loadPayslips();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(+e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="w-28 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
        </div>
        <button
          onClick={processAll} disabled={processing}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-60 mt-4"
        >
          <FiPlay size={15} /> {processing ? 'Processing…' : `Process All (${employees.length})`}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-[#003087]">
          <h3 className="font-bold text-white">Payroll — {MONTHS[month-1]} {year}</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Employee','Gross Pay','Deductions','PF (Emp)','ESIC (Emp)','Net Pay','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => {
                  const payslip = results.find(r => r.employee?._id === emp._id || r.employee === emp._id);
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{emp.name}<div className="text-xs text-gray-400">{emp.empCode}</div></td>
                      <td className="px-4 py-3 text-right font-mono">{payslip ? fmt(payslip.grossPay) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{payslip ? fmt(payslip.totalDeductions) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{payslip ? fmt(payslip.pfEmployee) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{payslip ? fmt(payslip.esicEmployee) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-700">{payslip ? fmt(payslip.netPay) : '—'}</td>
                      <td className="px-4 py-3">
                        {payslip ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{payslip.status}</span> : <span className="text-xs text-gray-400">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => processOne(emp._id)} className="px-2 py-1 text-xs text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
                          {payslip ? 'Reprocess' : 'Process'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
