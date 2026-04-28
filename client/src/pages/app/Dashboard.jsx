import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import api from '../../utils/api';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, FiPackage, FiFileText, FiArrowRight } from 'react-icons/fi';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const { company } = useCompany();
  const [data, setData]       = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    const cid = company._id;
    Promise.all([
      api.get(`/companies/${cid}/reports/profit-loss?from=${new Date().getFullYear() + '-04-01'}&to=${new Date().toISOString().split('T')[0]}`),
      api.get(`/companies/${cid}/reports/outstanding?type=receivable`),
      api.get(`/companies/${cid}/reports/outstanding?type=payable`),
      api.get(`/companies/${cid}/vouchers?limit=10`),
    ]).then(([pl, recv, pay, vch]) => {
      setData({ pl: pl.data.data, recv: recv.data.total || 0, pay: pay.data.total || 0 });
      setVouchers(vch.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [company]);

  const quickLinks = [
    { label: 'New Sales Invoice',  href: '/app/vouchers/sales',    color: 'bg-green-50 text-green-700',  icon: FiTrendingUp },
    { label: 'New Purchase',       href: '/app/vouchers/purchase', color: 'bg-blue-50 text-blue-700',   icon: FiTrendingDown },
    { label: 'New Payment',        href: '/app/vouchers/payment',  color: 'bg-orange-50 text-orange-700', icon: FiDollarSign },
    { label: 'Add Ledger',         href: '/app/masters/ledgers',   color: 'bg-purple-50 text-purple-700', icon: FiUsers },
    { label: 'Add Stock Item',     href: '/app/masters/stock-items', color: 'bg-cyan-50 text-cyan-700', icon: FiPackage },
    { label: 'Day Book',           href: '/app/reports/daybook',   color: 'bg-yellow-50 text-yellow-700', icon: FiFileText },
  ];

  const statCards = [
    { label: 'Net Profit',      value: fmt(data?.pl?.netProfit),  sub: 'Current FY',  color: 'border-l-4 border-green-400',  icon: FiTrendingUp,   iconColor: 'text-green-500' },
    { label: 'Total Income',    value: fmt(data?.pl?.totalIncome), sub: 'Current FY', color: 'border-l-4 border-blue-400',   icon: FiDollarSign,   iconColor: 'text-blue-500' },
    { label: 'Total Expenses',  value: fmt(data?.pl?.totalExpenses), sub: 'Current FY', color: 'border-l-4 border-red-400', icon: FiTrendingDown, iconColor: 'text-red-500' },
    { label: 'Receivables',     value: fmt(data?.recv),           sub: 'Outstanding', color: 'border-l-4 border-orange-400', icon: FiUsers,        iconColor: 'text-orange-500' },
    { label: 'Payables',        value: fmt(data?.pay),            sub: 'Outstanding', color: 'border-l-4 border-purple-400', icon: FiPackage,      iconColor: 'text-purple-500' },
  ];

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl ${s.color} p-4 shadow-sm`}>
            <div className="flex items-start justify-between mb-2">
              <div className={`${s.iconColor}`}><s.icon size={18} /></div>
            </div>
            <div className="text-lg font-bold text-gray-900">{loading ? '—' : s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-xs text-gray-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((ql) => (
              <Link
                key={ql.label}
                to={ql.href}
                className={`flex items-center gap-2 p-3 ${ql.color} rounded-xl text-xs font-medium hover:opacity-80 transition-opacity`}
              >
                <ql.icon size={15} />
                {ql.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent vouchers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Recent Vouchers</h3>
            <Link to="/app/vouchers" className="text-xs text-[#003087] hover:text-[#ff6600] flex items-center gap-1 font-medium">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
            ) : vouchers.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No vouchers yet</div>
            ) : (
              vouchers.slice(0, 8).map((v) => {
                const typeColors = {
                  Sales: 'bg-green-100 text-green-700', Purchase: 'bg-blue-100 text-blue-700',
                  Payment: 'bg-red-100 text-red-700', Receipt: 'bg-yellow-100 text-yellow-700',
                  Journal: 'bg-gray-100 text-gray-700', Contra: 'bg-purple-100 text-purple-700',
                };
                return (
                  <div key={v._id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[v.voucherType] || 'bg-gray-100 text-gray-600'}`}>
                        {v.voucherType}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{v.voucherNo}</div>
                        <div className="text-xs text-gray-400">{v.party?.name || v.narration || '—'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{fmt(v.total)}</div>
                      <div className="text-xs text-gray-400">{fmtDate(v.date)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Report shortcuts */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Trial Balance',  href: '/app/reports/trial-balance', icon: '⚖️',  desc: 'Check debit/credit balance' },
          { label: 'Balance Sheet',  href: '/app/reports/balance-sheet', icon: '📊',  desc: 'Assets & liabilities' },
          { label: 'Profit & Loss',  href: '/app/reports/profit-loss',   icon: '📈',  desc: 'Income vs expenses' },
          { label: 'GST Returns',    href: '/app/gst/gstr3b',            icon: '🧾',  desc: 'GSTR-1 & GSTR-3B' },
        ].map((r) => (
          <Link
            key={r.label}
            to={r.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="text-3xl mb-3">{r.icon}</div>
            <div className="font-bold text-gray-900 text-sm group-hover:text-[#003087] transition-colors">{r.label}</div>
            <div className="text-xs text-gray-400 mt-1">{r.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
