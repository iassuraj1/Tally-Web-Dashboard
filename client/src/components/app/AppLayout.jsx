import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { FiMenu, FiBell, FiSearch } from 'react-icons/fi';
import { useCompany } from '../../context/CompanyContext';

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
  '/app/payroll/employees':   'Employees',
  '/app/payroll/pay-heads':   'Pay Heads',
  '/app/payroll/process':     'Process Payroll',
  '/app/payroll/payslips':    'Payslips',
  '/app/banking/reconciliation':'Bank Reconciliation',
  '/app/companies':           'My Companies',
  '/app/settings':            'Company Settings',
};

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { company }       = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#003087]/20 border-t-[#003087] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/app/login" replace />;

  const title = pageTitles[location.pathname] || 'TallyPrime';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{title}</h1>
            {company && (
              <p className="text-xs text-gray-400 leading-none mt-0.5">{company.name}</p>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-56">
            <FiSearch size={14} className="text-gray-400" />
            <input placeholder="Quick search…" className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-full" />
          </div>

          <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
            <FiBell size={18} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
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
    </div>
  );
}
