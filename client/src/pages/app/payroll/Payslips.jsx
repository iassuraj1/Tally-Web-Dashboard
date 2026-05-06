import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiPrinter } from 'react-icons/fi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function PayslipModal({ payslip, onClose }) {
  if (!payslip) return null;
  const emp = payslip.employee || {};
  const earnings   = (payslip.lines || []).filter(l => l.type === 'Earning');
  const deductions = (payslip.lines || []).filter(l => ['Deduction','Employee Contribution'].includes(l.type));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Payslip header */}
        <div className="bg-[#003087] text-white px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">Salary Slip</div>
              <div className="text-blue-200 text-sm">{MONTHS[(payslip.month || 1) - 1]} {payslip.year}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">{emp.name}</div>
              <div className="text-blue-200">{emp.empCode} · {emp.designation}</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Employee details */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6 pb-6 border-b border-gray-100">
            {[['Department', emp.department], ['Pay Days', payslip.payDays], ['LOP Days', payslip.lopDays], ['PAN', emp.pan]].map(([l, v]) => (
              <div key={l}><span className="text-gray-400">{l}:</span> <span className="font-medium text-gray-800">{v || '—'}</span></div>
            ))}
          </div>

          {/* Earnings vs Deductions */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Earnings</div>
              <div className="space-y-2">
                {earnings.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{l.payHead?.name || 'Earning'}</span>
                    <span className="font-medium text-gray-900">{fmt(l.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Gross Pay</span><span className="text-green-600">{fmt(payslip.grossPay)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Deductions</div>
              <div className="space-y-2">
                {deductions.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{l.payHead?.name || 'Deduction'}</span>
                    <span className="font-medium text-gray-900">{fmt(l.amount)}</span>
                  </div>
                ))}
                {payslip.pfEmployee > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">PF (Employee)</span><span>{fmt(payslip.pfEmployee)}</span></div>}
                {payslip.esicEmployee > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">ESIC (Employee)</span><span>{fmt(payslip.esicEmployee)}</span></div>}
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Total Deductions</span><span className="text-red-600">{fmt(payslip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="mt-6 bg-green-50 rounded-xl p-4 flex items-center justify-between">
            <span className="font-bold text-gray-900">Net Pay</span>
            <span className="text-2xl font-extrabold text-green-600">{fmt(payslip.netPay)}</span>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"><FiPrinter size={14} /> Print</button>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payslips() {
  const { company } = useCompany();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState('');
  const [year,  setYear]  = useState('');

  const load = useCallback(() => {
    if (!company) return;
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year)  params.set('year', year);
    setLoading(true);
    api.get(`/companies/${company._id}/payroll/payslips?${params}`)
      .then(r => setPayslips(r.data.data || []))
      .finally(() => setLoading(false));
  }, [company, month, year]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const openPayslip = async (id) => {
    const r = await api.get(`/companies/${company._id}/payroll/payslips/${id}`);
    setSelected(r.data.data);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <select value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]">
          <h3 className="font-bold text-white">Payslips</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">📄</div><p className="text-sm">No payslips found. Process payroll first.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{['Employee','Code','Period','Gross','Deductions','Net Pay','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.employee?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.employee?.empCode || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{MONTHS[(p.month||1)-1]} {p.year}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(p.grossPay)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(p.totalDeductions)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-green-700">{fmt(p.netPay)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.status === 'Paid' ? 'bg-green-100 text-green-700' : p.status === 'Processed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => openPayslip(p._id)} className="px-3 py-1 text-xs text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PayslipModal payslip={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
