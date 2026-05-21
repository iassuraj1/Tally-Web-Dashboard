import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../context/useCompany';
import api from '../../utils/api';
import {
  FiArrowRight,
  FiBarChart2,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiPackage,
  FiShield,
  FiShoppingCart,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';

const fmt = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(n || 0);

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const compact = (n) => new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(n || 0);

const chartMax = (rows, keys) => Math.max(
  1,
  ...rows.flatMap((row) => keys.map((key) => Math.abs(Number(row[key] || 0))))
);

const sumBy = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);

function EmptyChart({ loading, className = 'h-64' }) {
  return (
    <div className={`${className} flex items-center justify-center text-sm text-gray-400`}>
      {loading ? 'Loading chart...' : 'No chart data yet'}
    </div>
  );
}

function ChartCard({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`min-w-0 bg-white rounded-lg border border-gray-100 shadow-sm ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-500 sm:justify-end">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function MetricPill({ label, value, tone = 'gray' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone] || tones.gray}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

function SalesPurchaseChart({ data = [], loading }) {
  if (!data.length) return <EmptyChart loading={loading} className="h-80" />;

  const width = 780;
  const height = 300;
  const pad = { top: 24, right: 26, bottom: 42, left: 60 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const max = chartMax(data, ['sales', 'purchases']);
  const y = (value) => pad.top + chartHeight - (Number(value || 0) / max) * chartHeight;
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(28, groupWidth / 3.6);
  const baseY = pad.top + chartHeight;
  const xCenter = (index) => pad.left + index * groupWidth + groupWidth / 2;
  const netPoints = data.map((row, index) => {
    const net = Math.max(0, Number(row.sales || 0) - Number(row.purchases || 0));
    return `${xCenter(index)},${y(net)}`;
  }).join(' ');

  return (
    <div className="min-w-0">
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <MetricPill label="6M Sales" value={fmt(sumBy(data, 'sales'))} tone="emerald" />
        <MetricPill label="6M Purchases" value={fmt(sumBy(data, 'purchases'))} tone="blue" />
        <MetricPill label="Net Movement" value={fmt(sumBy(data, 'sales') - sumBy(data, 'purchases'))} tone="gray" />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-80" role="img" aria-label="Sales and purchase trend">
        <defs>
          <linearGradient id="salesBar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="purchaseBar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const yPos = pad.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={width - pad.right} y1={yPos} y2={yPos} stroke="#eef2f7" strokeWidth="1" />
              <text x={pad.left - 12} y={yPos + 4} textAnchor="end" className="fill-gray-400 text-[11px]">{compact(max * ratio)}</text>
            </g>
          );
        })}
        {data.map((row, index) => (
          <g key={row.key}>
            <rect x={xCenter(index) - barWidth - 3} y={y(row.sales)} width={barWidth} height={baseY - y(row.sales)} rx="6" fill="url(#salesBar)">
              <title>{`${row.label} sales: ${fmt(row.sales)}`}</title>
            </rect>
            <rect x={xCenter(index) + 3} y={y(row.purchases)} width={barWidth} height={baseY - y(row.purchases)} rx="6" fill="url(#purchaseBar)">
              <title>{`${row.label} purchases: ${fmt(row.purchases)}`}</title>
            </rect>
            <text x={xCenter(index)} y={height - 14} textAnchor="middle" className="fill-gray-500 text-[11px]">{row.label}</text>
          </g>
        ))}
        <polyline points={netPoints} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
        {data.map((row, index) => {
          const net = Math.max(0, Number(row.sales || 0) - Number(row.purchases || 0));
          return <circle key={`${row.key}-net`} cx={xCenter(index)} cy={y(net)} r="3.5" fill="#111827" />;
        })}
      </svg>
    </div>
  );
}

function CashFlowBars({ data = [], loading }) {
  if (!data.length) return <EmptyChart loading={loading} className="h-56" />;

  const width = 520;
  const height = 220;
  const pad = { top: 18, right: 18, bottom: 32, left: 50 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const max = chartMax(data, ['netCashFlow']);
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(34, groupWidth / 2.5);
  const midY = pad.top + chartHeight / 2;
  const y = (value) => midY - (Number(value || 0) / max) * (chartHeight / 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-56" role="img" aria-label="Net cash flow bars">
      <line x1={pad.left} x2={width - pad.right} y1={midY} y2={midY} stroke="#d1d5db" strokeWidth="1.2" />
      <line x1={pad.left} x2={width - pad.right} y1={pad.top} y2={pad.top} stroke="#eef2f7" />
      <line x1={pad.left} x2={width - pad.right} y1={pad.top + chartHeight} y2={pad.top + chartHeight} stroke="#eef2f7" />
      <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" className="fill-gray-400 text-[10px]">{compact(max)}</text>
      <text x={pad.left - 8} y={pad.top + chartHeight + 4} textAnchor="end" className="fill-gray-400 text-[10px]">-{compact(max)}</text>
      {data.map((row, index) => {
        const baseX = pad.left + index * groupWidth + groupWidth / 2;
        const value = Number(row.netCashFlow || 0);
        const top = value >= 0 ? y(value) : midY;
        const heightValue = Math.max(2, Math.abs(midY - y(value)));
        return (
          <g key={row.key}>
            <rect x={baseX - barWidth / 2} y={top} width={barWidth} height={heightValue} rx="7" fill={value >= 0 ? '#0ea5e9' : '#f97316'}>
              <title>{`${row.label} net cash: ${fmt(value)}`}</title>
            </rect>
            <text x={baseX} y={height - 10} textAnchor="middle" className="fill-gray-500 text-[10px]">{row.label.split(' ')[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PositionBars({ data = [], loading }) {
  if (!data.length) return <EmptyChart loading={loading} className="h-56" />;

  const max = chartMax(data, ['value']);
  const colors = ['bg-sky-600', 'bg-amber-500', 'bg-violet-600', 'bg-emerald-600'];
  return (
    <div className="h-56 flex flex-col justify-center gap-4">
      {data.map((row, index) => {
        const width = `${Math.max(4, Math.min(100, (Math.abs(Number(row.value || 0)) / max) * 100))}%`;
        const negative = Number(row.value || 0) < 0;
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-xs font-semibold text-gray-600">{row.label}</span>
              <span className={`text-xs font-bold ${negative ? 'text-red-600' : 'text-gray-900'}`}>{fmt(row.value)}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${negative ? 'bg-red-500' : colors[index % colors.length]} rounded-full`} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GstDonut({ data = [], loading }) {
  const rows = data.filter((row) => Number(row.value || 0) > 0);
  if (!rows.length) return <EmptyChart loading={loading} className="h-56" />;

  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const colors = ['#ef4444', '#f97316', '#8b5cf6', '#64748b'];
  const segments = rows.reduce((acc, row, index) => {
    const length = (Number(row.value || 0) / total) * circumference;
    return {
      offset: acc.offset + length,
      items: [...acc.items, { row, index, length, offset: acc.offset }],
    };
  }, { offset: 0, items: [] }).items;

  return (
    <div className="h-56 grid min-w-0 grid-cols-1 items-center gap-4 sm:grid-cols-[138px_minmax(0,1fr)]">
      <svg viewBox="0 0 120 120" className="w-32 h-32" role="img" aria-label="GST payable split">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="16" />
        {segments.map(({ row, index, length, offset }) => (
          <circle
            key={row.label}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth="16"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        ))}
        <text x="60" y="57" textAnchor="middle" className="fill-gray-900 text-[14px] font-bold">{compact(total)}</text>
        <text x="60" y="73" textAnchor="middle" className="fill-gray-400 text-[10px]">GST</text>
      </svg>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              {row.label}
            </div>
            <span className="font-semibold text-gray-900">{fmt(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { company } = useCompany();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      api.get(`/companies/${company._id}/dashboard/summary`)
        .then((res) => { if (!cancelled) setSummary(res.data.data); })
        .catch(() => { if (!cancelled) setSummary(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [company]);

  if (!company) return null;

  const quickLinks = [
    { label: 'New Sales Invoice', href: '/app/vouchers/sales', color: 'bg-emerald-50 text-emerald-700', icon: FiTrendingUp },
    { label: 'New Purchase', href: '/app/vouchers/purchase', color: 'bg-blue-50 text-blue-700', icon: FiTrendingDown },
    { label: 'New Payment', href: '/app/vouchers/payment', color: 'bg-amber-50 text-amber-700', icon: FiDollarSign },
    { label: 'Add Ledger', href: '/app/masters/ledgers', color: 'bg-violet-50 text-violet-700', icon: FiUsers },
    { label: 'Add Stock Item', href: '/app/masters/stock-items', color: 'bg-cyan-50 text-cyan-700', icon: FiPackage },
    { label: 'Approval Queue', href: '/app/vouchers/approvals', color: 'bg-rose-50 text-rose-700', icon: FiClock },
  ];

  const statCards = [
    { label: 'Cash and Bank', value: fmt(summary?.cashBankBalance), sub: 'Available balance', href: '/app/reports/cash-flow', color: 'border-sky-400', icon: FiCreditCard, iconColor: 'text-sky-500' },
    { label: 'Receivables', value: fmt(summary?.receivables), sub: 'Customer outstanding', href: '/app/reports/receivables', color: 'border-orange-400', icon: FiUsers, iconColor: 'text-orange-500' },
    { label: 'Payables', value: fmt(summary?.payables), sub: 'Vendor outstanding', href: '/app/reports/payables', color: 'border-violet-400', icon: FiFileText, iconColor: 'text-violet-500' },
    { label: 'Sales This Month', value: fmt(summary?.salesThisMonth), sub: 'Approved sales', href: '/app/vouchers?type=Sales', color: 'border-emerald-400', icon: FiTrendingUp, iconColor: 'text-emerald-500' },
    { label: 'Purchases This Month', value: fmt(summary?.purchasesThisMonth), sub: 'Approved purchases', href: '/app/vouchers?type=Purchase', color: 'border-blue-400', icon: FiShoppingCart, iconColor: 'text-blue-500' },
    { label: 'Profit Estimate', value: fmt(summary?.profitEstimate), sub: 'Current FY', href: '/app/reports/profit-loss', color: 'border-lime-400', icon: FiBarChart2, iconColor: 'text-lime-600' },
    { label: 'GST Payable', value: fmt(summary?.gstPayable), sub: 'This month', href: '/app/gst/gstr3b', color: 'border-red-400', icon: FiShield, iconColor: 'text-red-500' },
    { label: 'Pending Approvals', value: summary?.pendingApprovals || 0, sub: 'Submitted vouchers', href: '/app/vouchers/approvals', color: 'border-slate-400', icon: FiClock, iconColor: 'text-slate-500' },
  ];

  const recentVouchers = summary?.recentVouchers || [];
  const lowStock = summary?.lowStock || [];
  const trend = summary?.charts?.trend || [];
  const financialPosition = summary?.charts?.financialPosition || [];
  const gstBreakup = summary?.charts?.gst || [];

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            aria-label={`Open ${card.label}`}
            className={`group min-w-0 bg-white rounded-lg border border-gray-100 border-l-4 ${card.color} p-4 shadow-sm min-h-32 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#003087] focus:ring-offset-2`}
          >
            <div className={`${card.iconColor} mb-3`}>
              <card.icon size={18} />
            </div>
            <div className="text-lg font-bold text-gray-900 leading-tight break-words">
              {loading ? '-' : card.value}
            </div>
            <div className="text-xs text-gray-500 mt-2 group-hover:text-[#003087]">{card.label}</div>
            <div className="text-xs text-gray-400">{card.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <ChartCard
          title="Revenue Trend"
          subtitle="Sales, purchases, and net movement across the last six approved accounting months"
          action={(
            <Legend items={[
              { label: 'Sales', color: 'bg-emerald-600' },
              { label: 'Purchases', color: 'bg-blue-600' },
              { label: 'Net', color: 'bg-gray-900' },
            ]} />
          )}
        >
          <SalesPurchaseChart data={trend} loading={loading} />
        </ChartCard>

        <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <ChartCard title="Financial Position" subtitle="Key balances at a glance">
            <PositionBars data={financialPosition} loading={loading} />
          </ChartCard>

          <ChartCard
            title="Net Cash Flow"
            subtitle="Receipts less payments by month"
            action={<Legend items={[{ label: 'Positive', color: 'bg-sky-500' }, { label: 'Negative', color: 'bg-orange-500' }]} />}
          >
            <CashFlowBars data={trend} loading={loading} />
          </ChartCard>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <ChartCard title="Monthly Movement" subtitle="Net sales and cash movement by month">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trend.length === 0 && <div className="col-span-full py-10 text-center text-sm text-gray-400">{loading ? 'Loading...' : 'No movement yet'}</div>}
            {trend.map((row) => (
              <div key={row.key} className="border border-gray-100 rounded-lg px-3 py-3 bg-gray-50/50">
                <div className="text-xs font-bold text-gray-600">{row.label}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Net Sales</span>
                  <span className={`text-sm font-bold ${row.netSales >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(row.netSales)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">Net Cash</span>
                  <span className={`text-sm font-bold ${row.netCashFlow >= 0 ? 'text-sky-700' : 'text-orange-600'}`}>{fmt(row.netCashFlow)}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="GST Payable Split" subtitle="This month payable tax">
          <GstDonut data={gstBreakup} loading={loading} />
        </ChartCard>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`flex items-center gap-2 p-3 ${link.color} rounded-lg text-xs font-medium hover:opacity-80 transition-opacity min-h-12`}
              >
                <link.icon size={15} className="shrink-0" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Recent Vouchers</h3>
            <Link to="/app/vouchers" className="text-xs text-[#003087] hover:text-[#ff6600] flex items-center gap-1 font-medium">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : recentVouchers.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No vouchers yet</div>
            ) : (
              recentVouchers.map((voucher) => {
                const typeColors = {
                  Sales: 'bg-emerald-100 text-emerald-700',
                  Purchase: 'bg-blue-100 text-blue-700',
                  Payment: 'bg-red-100 text-red-700',
                  Receipt: 'bg-yellow-100 text-yellow-700',
                  Journal: 'bg-gray-100 text-gray-700',
                  Contra: 'bg-violet-100 text-violet-700',
                };
                return (
                  <div key={voucher._id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[voucher.voucherType] || 'bg-gray-100 text-gray-600'}`}>
                        {voucher.voucherType}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{voucher.voucherNo}</div>
                        <div className="text-xs text-gray-400 truncate">{voucher.party?.name || voucher.narration || voucher.status || '-'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-gray-900">{fmt(voucher.total)}</div>
                      <div className="text-xs text-gray-400">{fmtDate(voucher.date)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-red-700">Low Stock Alerts</h3>
            <Link to="/app/inventory/reorder" className="text-xs text-red-700 font-semibold">View report</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {lowStock.slice(0, 4).map((item) => (
              <div key={item._id} className="bg-white rounded-lg px-3 py-2 border border-red-100">
                <div className="text-sm font-semibold text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500">Closing {Number(item.closingQty || 0).toFixed(2)} / Alert {item.alertLevel}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Trial Balance', href: '/app/reports/trial-balance', icon: FiBarChart2, desc: 'Check debit and credit balance' },
          { label: 'Balance Sheet', href: '/app/reports/balance-sheet', icon: FiFileText, desc: 'Assets and liabilities' },
          { label: 'Profit & Loss', href: '/app/reports/profit-loss', icon: FiTrendingUp, desc: 'Income vs expenses' },
          { label: 'GST Returns', href: '/app/gst/gstr3b', icon: FiShield, desc: 'GSTR-1 and GSTR-3B' },
        ].map((report) => (
          <Link
            key={report.label}
            to={report.href}
            className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <report.icon size={24} className="text-[#003087] mb-3" />
            <div className="font-bold text-gray-900 text-sm group-hover:text-[#003087] transition-colors">{report.label}</div>
            <div className="text-xs text-gray-400 mt-1">{report.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
