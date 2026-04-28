import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import {
  FiGrid, FiUsers, FiPackage, FiFileText, FiBarChart2,
  FiDollarSign, FiShield, FiCreditCard, FiLogOut,
  FiChevronDown, FiChevronRight, FiSettings, FiBriefcase,
  FiBookOpen, FiRepeat, FiHash,
} from 'react-icons/fi';

const nav = [
  { label: 'Dashboard', icon: FiGrid, href: '/app' },
  {
    label: 'Masters', icon: FiBookOpen,
    children: [
      { label: 'Account Groups',  href: '/app/masters/groups' },
      { label: 'Ledgers',         href: '/app/masters/ledgers' },
      { label: 'Stock Groups',    href: '/app/masters/stock-groups' },
      { label: 'Stock Items',     href: '/app/masters/stock-items' },
      { label: 'Units',           href: '/app/masters/units' },
      { label: 'Godowns',         href: '/app/masters/godowns' },
      { label: 'Cost Centres',    href: '/app/masters/cost-centres' },
    ],
  },
  {
    label: 'Transactions', icon: FiFileText,
    children: [
      { label: 'Sales Invoice',    href: '/app/vouchers/sales' },
      { label: 'Purchase Invoice', href: '/app/vouchers/purchase' },
      { label: 'Payment',          href: '/app/vouchers/payment' },
      { label: 'Receipt',          href: '/app/vouchers/receipt' },
      { label: 'Journal',          href: '/app/vouchers/journal' },
      { label: 'Contra',           href: '/app/vouchers/contra' },
      { label: 'Credit Note',      href: '/app/vouchers/credit-note' },
      { label: 'Debit Note',       href: '/app/vouchers/debit-note' },
      { label: 'Stock Journal',    href: '/app/vouchers/stock-journal' },
    ],
  },
  {
    label: 'Reports', icon: FiBarChart2,
    children: [
      { label: 'Day Book',         href: '/app/reports/daybook' },
      { label: 'Trial Balance',    href: '/app/reports/trial-balance' },
      { label: 'Balance Sheet',    href: '/app/reports/balance-sheet' },
      { label: 'Profit & Loss',    href: '/app/reports/profit-loss' },
      { label: 'Ledger Report',    href: '/app/reports/ledger' },
      { label: 'Receivables',      href: '/app/reports/receivables' },
      { label: 'Payables',         href: '/app/reports/payables' },
      { label: 'Cash Flow',        href: '/app/reports/cash-flow' },
    ],
  },
  {
    label: 'Inventory', icon: FiPackage,
    children: [
      { label: 'Stock Summary',    href: '/app/inventory/stock-summary' },
      { label: 'Stock Items',      href: '/app/masters/stock-items' },
      { label: 'Godowns',          href: '/app/masters/godowns' },
    ],
  },
  {
    label: 'GST', icon: FiShield,
    children: [
      { label: 'GSTR-1',           href: '/app/gst/gstr1' },
      { label: 'GSTR-3B',          href: '/app/gst/gstr3b' },
      { label: 'HSN Summary',      href: '/app/gst/hsn-summary' },
    ],
  },
  {
    label: 'Payroll', icon: FiUsers,
    children: [
      { label: 'Employees',        href: '/app/payroll/employees' },
      { label: 'Pay Heads',        href: '/app/payroll/pay-heads' },
      { label: 'Process Payroll',  href: '/app/payroll/process' },
      { label: 'Payslips',         href: '/app/payroll/payslips' },
    ],
  },
  {
    label: 'Banking', icon: FiCreditCard,
    children: [
      { label: 'Reconciliation',   href: '/app/banking/reconciliation' },
    ],
  },
  { label: 'Voucher List',    icon: FiHash,     href: '/app/vouchers' },
  { label: 'Company Settings', icon: FiSettings, href: '/app/settings' },
];

function NavItem({ item, depth = 0 }) {
  const location  = useLocation();
  const isActive  = item.href && location.pathname === item.href;
  const hasChildren = item.children?.length > 0;
  const anyChildActive = item.children?.some((c) => location.pathname.startsWith(c.href));
  const [open, setOpen] = useState(anyChildActive);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            anyChildActive ? 'text-[#003087] bg-blue-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {item.icon && <item.icon size={16} />}
            {item.label}
          </div>
          {open ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
        </button>
        {open && (
          <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
            {item.children.map((child) => (
              <NavItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-[#003087] text-white font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {item.icon && <item.icon size={16} />}
      {item.label}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { company }  = useCompany();
  const { user, logout } = useAuth();
  const navigate     = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full z-40 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#003087] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div>
              <div className="text-[#003087] font-bold text-base leading-none">TallyPrime</div>
              <div className="text-[#ff6600] text-xs">Web Edition</div>
            </div>
          </Link>

          {/* Company selector */}
          <Link to="/app/companies" className="block bg-blue-50 rounded-xl px-3 py-2.5 hover:bg-blue-100 transition-colors">
            <div className="text-xs text-gray-400 mb-0.5">Active Company</div>
            <div className="text-sm font-semibold text-[#003087] truncate">
              {company?.name || 'Select Company…'}
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {nav.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#003087] rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <FiLogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
