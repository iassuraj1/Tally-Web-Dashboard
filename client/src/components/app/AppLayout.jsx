import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import Sidebar from './Sidebar';
import { FiMenu, FiBell, FiKey, FiSearch, FiPlus, FiSettings } from 'react-icons/fi';
import { useCompany } from '../../context/useCompany';
import CommandPalette from './CommandPalette';
import { APP_TALLY_SHORTCUTS } from '../../data/tallyShortcuts';

const QUICK_CREATE = [
  {
    category: 'GENERAL',
    items: [
      { label: 'Ledger',         href: '/app/masters/ledgers' },
      { label: 'Account Group',  href: '/app/masters/groups' },
      { label: 'Journal Entry',  href: '/app/vouchers/journal' },
      { label: 'Contra Entry',   href: '/app/vouchers/contra' },
      { label: 'Cost Centre',    href: '/app/masters/cost-centres' },
    ],
  },
  {
    category: 'INVENTORY',
    items: [
      { label: 'Stock Item',     href: '/app/masters/stock-items' },
      { label: 'Stock Group',    href: '/app/masters/stock-groups' },
      { label: 'Godown',         href: '/app/masters/godowns' },
      { label: 'Unit',           href: '/app/masters/units' },
      { label: 'Stock Journal',  href: '/app/vouchers/stock-journal' },
    ],
  },
  {
    category: 'SALES',
    items: [
      { label: 'Customer',          href: '/app/masters/customers' },
      { label: 'Sales Invoice',     href: '/app/vouchers/sales' },
      { label: 'Receipt',           href: '/app/vouchers/receipt' },
      { label: 'Credit Note',       href: '/app/vouchers/credit-note' },
      { label: 'Sales Workflow',    href: '/app/sales-workflow' },
    ],
  },
  {
    category: 'PURCHASES',
    items: [
      { label: 'Vendor',            href: '/app/masters/vendors' },
      { label: 'Purchase Invoice',  href: '/app/vouchers/purchase' },
      { label: 'Payment',           href: '/app/vouchers/payment' },
      { label: 'Debit Note',        href: '/app/vouchers/debit-note' },
      { label: 'Purchase Workflow', href: '/app/purchase-workflow' },
    ],
  },
  {
    category: 'BANKING',
    items: [
      { label: 'Bank Import',       href: '/app/banking/import' },
      { label: 'Reconciliation',    href: '/app/banking/reconciliation' },
      { label: 'Pay Reminder',      href: '/app/banking/reminders' },
    ],
  },
];

const pageTitles = {
  '/app': 'Dashboard',
  '/app/masters/groups':      'Account Groups',
  '/app/masters/ledgers':     'Ledgers',
  '/app/masters/stock-items': 'Stock Items',
  '/app/masters/stock-groups':'Stock Groups',
  '/app/masters/units':       'Units of Measure',
  '/app/masters/godowns':     'Godowns / Warehouses',
  '/app/masters/cost-centres':'Cost Centres',
  '/app/vouchers':            'All Vouchers',
  '/app/vouchers/approvals':  'Approval Queue',
  '/app/vouchers/sales':      'Sales Invoice',
  '/app/vouchers/purchase':   'Purchase Invoice',
  '/app/vouchers/payment':    'Payment Voucher',
  '/app/vouchers/receipt':    'Receipt Voucher',
  '/app/vouchers/journal':    'Journal Entry',
  '/app/vouchers/contra':     'Contra Entry',
  '/app/vouchers/credit-note':'Credit Note',
  '/app/vouchers/debit-note': 'Debit Note',
  '/app/vouchers/stock-journal':'Stock Journal',
  '/app/reports/daybook':     'Day Book',
  '/app/reports/trial-balance':'Trial Balance',
  '/app/reports/balance-sheet':'Balance Sheet',
  '/app/reports/profit-loss': 'Profit & Loss',
  '/app/reports/ledger':      'Ledger Report',
  '/app/reports/receivables': 'Sundry Receivables',
  '/app/reports/payables':    'Sundry Payables',
  '/app/reports/cash-flow':   'Cash Flow Statement',
  '/app/inventory/stock-summary':'Stock Summary',
  '/app/gst/gstr1':           'GSTR-1 Report',
  '/app/gst/gstr3b':          'GSTR-3B Summary',
  '/app/gst/hsn-summary':     'HSN-wise Summary',
  '/app/gst/mismatch-checks':  'GST Mismatch Checks',
  '/app/gst/missing-gstin':    'Missing GSTIN Report',
  '/app/gst/reverse-charge':   'Reverse Charge Report',
  '/app/payroll/employees':   'Employees',
  '/app/payroll/pay-heads':   'Pay Heads',
  '/app/payroll/process':     'Process Payroll',
  '/app/payroll/payslips':    'Payslips',
  '/app/banking/import':       'Bank Import',
  '/app/banking/reconciliation':'Bank Reconciliation',
  '/app/banking/reminders':    'Payment Reminders',
  '/app/tools/import-masters':  'Import Masters',
  '/app/tools/backup':          'Backup & Restore',
  '/app/tools/advanced':         'Advanced Features',
  '/app/tools/tally-shortcuts':   'Tally Shortcut Keys',
  '/app/settings/accounting-controls': 'Accounting Controls',
  '/app/companies':           'My Companies',
  '/app/settings':            'Company Settings',
};

const editableTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isEditableTarget = (target) => (
  editableTags.has(target?.tagName) || target?.isContentEditable
);

const normalizeShortcut = (event) => {
  let key = event.key;
  if (!key) return '';
  if (key === ' ') key = 'Spacebar';
  else if (key === 'Escape') key = 'Esc';
  else if (key.startsWith('Arrow')) key = `${key.replace('Arrow', '')} arrow`;
  else if (key.length === 1) key = key.toUpperCase();

  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
};

const focusDateField = () => {
  const dateField = document.querySelector('[data-shortcut-date], input[type="date"]');
  dateField?.focus();
};

const getEscapeFallbackPath = (pathname) => {
  if (pathname === '/app') return null;
  if (pathname.startsWith('/app/vouchers/') || pathname.startsWith('/app/invoice-print/')) return '/app/vouchers';
  if (pathname.startsWith('/app/settings/')) return '/app/settings';
  return '/app';
};

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { company }       = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const quickCreateRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target)) {
        setQuickCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;

      const combo = normalizeShortcut(event);
      const shortcut = APP_TALLY_SHORTCUTS.find((item) => item.combo === combo);
      if (!shortcut) return;

      if (isEditableTarget(event.target) && !shortcut.allowInEditable) return;

      if (shortcut.command === 'saveScreen') {
        const saveButton = document.querySelector('[data-shortcut-action="save"]');
        if (!saveButton) return;
        event.preventDefault();
        saveButton.click();
        return;
      }

      if (shortcut.command === 'printScreen') {
        event.preventDefault();
        const printButton = document.querySelector('[data-shortcut-action="print"]');
        if (printButton) printButton.click();
        else window.print();
        return;
      }

      if (shortcut.command === 'goBack') {
        if (commandOpen) {
          event.preventDefault();
          setCommandOpen(false);
          return;
        }

        if (quickCreateOpen) {
          event.preventDefault();
          setQuickCreateOpen(false);
          return;
        }

        if (sidebarOpen) {
          event.preventDefault();
          setSidebarOpen(false);
          return;
        }

        if (document.querySelector('[data-app-modal="true"]')) return;

        const fallbackPath = getEscapeFallbackPath(location.pathname);
        if (!fallbackPath) return;

        event.preventDefault();
        if ((window.history.state?.idx || 0) > 0) navigate(-1);
        else navigate(fallbackPath);
        return;
      }

      event.preventDefault();
      if (shortcut.command === 'commandPalette') {
        setCommandOpen(true);
        return;
      }

      if (shortcut.command === 'focusDate') {
        focusDateField();
        return;
      }

      if (shortcut.href) {
        navigate(shortcut.href);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandOpen, location.pathname, navigate, quickCreateOpen, sidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#003087]/20 border-t-[#003087] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/app/login" replace />;

  const title = pageTitles[location.pathname] || 'Suraj Prime';

  return (
    <div className="fixed inset-0 flex overflow-hidden overscroll-none bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex h-screen w-full min-w-0 max-w-full flex-col lg:ml-64 lg:w-[calc(100%-16rem)]">
        {/* Top bar */}
        <header className="z-20 flex h-14 shrink-0 min-w-0 items-center gap-4 border-b border-white/10 bg-gray-900 px-4 sm:px-6">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-300"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-white">{title}</h1>
            {company && (
              <p className="text-xs text-gray-400 leading-none mt-0.5">{company.name}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex min-w-0 items-center gap-2 bg-white/10 rounded-lg px-3 py-2 w-64 max-w-[35vw] text-left hover:bg-white/20"
          >
            <FiSearch size={14} className="text-gray-400" />
            <span className="flex-1 text-xs text-gray-400">Go To / search...</span>
            <span className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">Alt G</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/tools/tally-shortcuts')}
            title="Tally shortcut keys"
            className="p-2 rounded-xl hover:bg-white/10 text-gray-300"
          >
            <FiKey size={18} />
          </button>

          <button className="relative p-2 rounded-xl hover:bg-white/10 text-gray-300">
            <FiBell size={18} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            title="Settings"
            className="p-2 rounded-xl hover:bg-white/10 text-gray-300"
          >
            <FiSettings size={18} />
          </button>

          {/* Quick Create */}
          <div className="relative" ref={quickCreateRef}>
            <button
              onClick={() => setQuickCreateOpen((o) => !o)}
              title="Quick create"
              className="w-8 h-8 bg-[#003087] rounded-full flex items-center justify-center text-white hover:bg-blue-800 transition-colors"
            >
              <FiPlus size={18} />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 top-10 z-50 w-[min(700px,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  {QUICK_CREATE.map(({ category, items }) => (
                    <div key={category}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                        {category}
                      </p>
                      <div className="space-y-0.5">
                        {items.map(({ label, href }) => (
                          <Link
                            key={href}
                            to={href}
                            onClick={() => setQuickCreateOpen(false)}
                            className="flex items-center gap-1.5 px-1 py-1.5 text-xs text-gray-600 rounded-lg hover:bg-blue-50 hover:text-[#003087] transition-colors"
                          >
                            <FiPlus size={11} className="text-gray-400 flex-shrink-0" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-none p-4 sm:p-6">
          {!company && !location.pathname.includes('/companies') ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-6xl mb-4">🏢</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Company Selected</h2>
              <p className="text-gray-500 mb-6">Please select or create a company to get started.</p>
              <a href="/app/companies" className="px-6 py-3 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors">
                Go to Companies
              </a>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
