import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/useCompany';
import { useAuth } from '../../context/useAuth';
import {
  FiGrid, FiUsers, FiPackage, FiFileText, FiBarChart2,
  FiShield, FiCreditCard, FiLogOut,
  FiChevronDown, FiChevronRight, FiSettings,
  FiBookOpen, FiDatabase, FiHash, FiKey, FiPlusCircle, FiSearch,
} from 'react-icons/fi';

const nav = [
  { label: 'Dashboard', icon: FiGrid, href: '/app' },
  {
    label: 'Masters', icon: FiBookOpen,
    children: [
      { label: 'Account Groups',  href: '/app/masters/groups' },
      { label: 'Ledgers',         href: '/app/masters/ledgers' },
      { label: 'Customers',       href: '/app/masters/customers' },
      { label: 'Vendors',         href: '/app/masters/vendors' },
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
      { label: 'Sales Workflow',   href: '/app/sales-workflow' },
      { label: 'Purchase Workflow', href: '/app/purchase-workflow' },
      { label: 'Approval Queue',   href: '/app/vouchers/approvals' },
    ],
  },
  {
    label: 'Create Voucher', icon: FiPlusCircle,
    children: [
      { label: 'Sales Invoice',    href: '/app/vouchers/sales' },
      { label: 'Purchase Invoice', href: '/app/vouchers/purchase' },
      { label: 'Receipt',          href: '/app/vouchers/receipt' },
      { label: 'Payment',          href: '/app/vouchers/payment' },
      { label: 'Contra',           href: '/app/vouchers/contra' },
      { label: 'Journal',          href: '/app/vouchers/journal' },
      { label: 'Credit Note',      href: '/app/vouchers/credit-note' },
      { label: 'Debit Note',       href: '/app/vouchers/debit-note' },
      { label: 'Stock Journal',    href: '/app/vouchers/stock-journal' },
    ],
  },
  { label: 'Voucher List',    icon: FiHash,     href: '/app/vouchers' },
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
      { label: 'Valuation',        href: '/app/inventory/valuation' },
      { label: 'Batch Stock',      href: '/app/inventory/batches' },
      { label: 'Expiry Report',    href: '/app/inventory/expiry' },
      { label: 'Reorder Alerts',   href: '/app/inventory/reorder' },
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
      { label: 'Mismatch Checks',  href: '/app/gst/mismatch-checks' },
      { label: 'Missing GSTIN',    href: '/app/gst/missing-gstin' },
      { label: 'Reverse Charge',   href: '/app/gst/reverse-charge' },
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
      { label: 'Bank Import',      href: '/app/banking/import' },
      { label: 'Reconciliation',   href: '/app/banking/reconciliation' },
      { label: 'Payment Reminders', href: '/app/banking/reminders' },
    ],
  },
  {
    label: 'Data Tools', icon: FiDatabase,
    children: [
      { label: 'Tally Shortcuts', href: '/app/tools/tally-shortcuts', icon: FiKey },
      { label: 'Accounting Controls', href: '/app/settings/accounting-controls' },
      { label: 'Import Masters', href: '/app/tools/import-masters' },
      { label: 'Backup & Restore', href: '/app/tools/backup' },
      { label: 'Advanced Features', href: '/app/tools/advanced' },
    ],
  },
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
  const [search, setSearch] = useState('');

  const handleLogout = () => { logout(); navigate('/'); };

  const filteredNav = search.trim()
    ? nav
        .map((item) => {
          if (!item.children) {
            return item.label.toLowerCase().includes(search.toLowerCase()) ? item : null;
          }
          if (item.label.toLowerCase().includes(search.toLowerCase())) return item;
          const matched = item.children.filter((c) =>
            c.label.toLowerCase().includes(search.toLowerCase())
          );
          return matched.length ? { ...item, children: matched } : null;
        })
        .filter(Boolean)
    : nav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full z-40 w-64 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header — same bg as top bar, no right border so they merge */}
        <div className="h-14 px-4 bg-gray-900 border-b border-white/10 flex items-center shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div>
              <div className="text-white font-bold text-base leading-none">Suraj Prime</div>
              <div className="text-[#ff6600] text-xs">Web Edition</div>
            </div>
          </Link>
        </div>

        {/* Content area below header gets the right border and white bg */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-100">

        {/* Company selector */}
        <Link to="/app/companies" className="mx-3 mt-3 mb-1 block bg-gray-100 rounded-xl px-3 py-2.5 hover:bg-gray-200 transition-colors">
          <div className="text-xs text-gray-400 mb-0.5">Active Company</div>
          <div className="text-sm font-semibold text-gray-800 truncate">
            {company?.name || 'Select Company…'}
          </div>
        </Link>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] placeholder-gray-400"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {filteredNav.length ? (
            filteredNav.map((item) => (
              <NavItem key={item.label} item={item} />
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">No results</p>
          )}
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

        </div>{/* end content area */}
      </aside>
    </>
  );
}
