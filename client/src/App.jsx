import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Marketing site
import Navbar       from './components/Navbar';
import Footer       from './components/Footer';
import Home         from './pages/Home';
import ProductsPage from './pages/ProductsPage';
import About        from './pages/About';
import Contact      from './pages/Contact';
import BlogPage     from './pages/BlogPage';

// Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';

// App shell
import AppLayout from './components/app/AppLayout';

// App pages
import Dashboard   from './pages/app/Dashboard';
import Companies   from './pages/app/Companies';

// Masters
import Groups      from './pages/app/masters/Groups';
import Ledgers     from './pages/app/masters/Ledgers';
import StockItems  from './pages/app/masters/StockItems';
import SimpleMaster from './pages/app/masters/SimpleMaster';
import Parties from './pages/app/masters/Parties';
import useMaster   from './hooks/useMaster';

// Vouchers
import VoucherList  from './pages/app/vouchers/VoucherList';
import VoucherEntry from './pages/app/vouchers/VoucherEntry';
import InvoicePrint from './pages/app/vouchers/InvoicePrint';
import ApprovalQueue from './pages/app/vouchers/ApprovalQueue';

// Workflows
import WorkflowDocuments from './pages/app/workflows/WorkflowDocuments';

// Reports
import TrialBalance from './pages/app/reports/TrialBalance';
import BalanceSheet from './pages/app/reports/BalanceSheet';
import ProfitLoss   from './pages/app/reports/ProfitLoss';
import DayBook      from './pages/app/reports/DayBook';
import LedgerReport from './pages/app/reports/LedgerReport';
import Outstanding  from './pages/app/reports/Outstanding';
import CashFlow     from './pages/app/reports/CashFlow';

// Inventory
import StockSummary from './pages/app/inventory/StockSummary';
import InventoryValuation from './pages/app/inventory/InventoryValuation';
import BatchExpiryReport from './pages/app/inventory/BatchExpiryReport';
import ReorderReport from './pages/app/inventory/ReorderReport';

// GST
import GSTR1       from './pages/app/gst/GSTR1';
import GSTR3B      from './pages/app/gst/GSTR3B';
import HSNSummary  from './pages/app/gst/HSNSummary';
import GSTCompliance from './pages/app/gst/GSTCompliance';

// Payroll
import Employees      from './pages/app/payroll/Employees';
import PayHeads       from './pages/app/payroll/PayHeads';
import ProcessPayroll from './pages/app/payroll/ProcessPayroll';
import Payslips       from './pages/app/payroll/Payslips';

// Banking
import BankReconciliation from './pages/app/banking/BankReconciliation';
import BankImport from './pages/app/banking/BankImport';
import PaymentReminders from './pages/app/banking/PaymentReminders';

// Data tools
import MasterImport from './pages/app/tools/MasterImport';
import BackupRestore from './pages/app/tools/BackupRestore';
import AdvancedFeatures from './pages/app/tools/AdvancedFeatures';
import TallyShortcuts from './pages/app/tools/TallyShortcuts';
import Settings from './pages/app/settings/Settings';
import AccountingControls from './pages/app/settings/AccountingControls';

// Simple master wrappers (Units, Godowns, StockGroups, CostCentres)
function Units() {
  return (
    <SimpleMaster
      title="Units of Measure"
      path="inventory/units"
      addLabel="New Unit"
      emptyForm={{ name: '', symbol: '', decimalPlaces: 2 }}
      columns={[
        { key: 'name',          label: 'Name',             render: v => <span className="font-medium">{v}</span> },
        { key: 'symbol',        label: 'Symbol'            },
        { key: 'decimalPlaces', label: 'Decimal Places'    },
        { key: 'isDefault',     label: 'Type', render: v => v ? <span className="text-xs text-gray-400">Default</span> : <span className="text-xs text-blue-600">Custom</span> },
      ]}
      formFields={[
        { key: 'name',          label: 'Unit Name',     required: true },
        { key: 'symbol',        label: 'Symbol',        required: true },
        { key: 'decimalPlaces', label: 'Decimal Places', type: 'number', step: 1 },
      ]}
    />
  );
}

function Godowns() {
  const { data: godownData } = useMaster('inventory/godowns');
  return (
    <SimpleMaster
      title="Godowns / Warehouses"
      path="inventory/godowns"
      addLabel="New Godown"
      emptyForm={{ name: '', address: '', parent: '' }}
      columns={[
        { key: 'name',    label: 'Godown Name', render: v => <span className="font-medium">{v}</span> },
        { key: 'parent',  label: 'Parent',      render: v => v?.name || 'Main' },
        { key: 'address', label: 'Address',     render: v => v || '—' },
      ]}
      formFields={[
        { key: 'name',    label: 'Godown Name', required: true },
        { key: 'parent',  label: 'Parent Godown', type: 'select', optional: true, refData: godownData },
        { key: 'address', label: 'Address' },
      ]}
    />
  );
}

function StockGroups() {
  const { data: sgData } = useMaster('inventory/stock-groups');
  return (
    <SimpleMaster
      title="Stock Groups"
      path="inventory/stock-groups"
      addLabel="New Stock Group"
      emptyForm={{ name: '', parent: '' }}
      columns={[
        { key: 'name',   label: 'Group Name', render: v => <span className="font-medium">{v}</span> },
        { key: 'parent', label: 'Under',      render: v => v?.name || 'Primary' },
      ]}
      formFields={[
        { key: 'name',   label: 'Group Name', required: true },
        { key: 'parent', label: 'Parent Group', type: 'select', optional: true, refData: sgData },
      ]}
    />
  );
}

function CostCentres() {
  const { data: ccData } = useMaster('cost-centres');
  return (
    <SimpleMaster
      title="Cost Centres"
      path="cost-centres"
      addLabel="New Cost Centre"
      emptyForm={{ name: '', parent: '', category: '' }}
      columns={[
        { key: 'name',     label: 'Cost Centre', render: v => <span className="font-medium">{v}</span> },
        { key: 'parent',   label: 'Under',       render: v => v?.name || 'Primary' },
        { key: 'category', label: 'Category',    render: v => v || '—' },
      ]}
      formFields={[
        { key: 'name',     label: 'Name',     required: true },
        { key: 'parent',   label: 'Parent',   type: 'select', optional: true, refData: ccData },
        { key: 'category', label: 'Category' },
      ]}
    />
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 pt-24">
      <div>
        <div className="text-8xl font-extrabold text-[#003087] mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <a href="/" className="px-6 py-3 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors">Go Home</a>
      </div>
    </div>
  );
}

// Marketing layout wrapper
function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="min-h-screen pt-24 flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">This page is coming soon.</p>
        <a href="/" className="px-6 py-3 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800">Back to Home</a>
      </div>
    </div>
  );
}

function NumberInputZeroGuard() {
  useEffect(() => {
    const isNumberInput = (target) => target instanceof HTMLInputElement && target.type === 'number';
    const isZeroValue = (value) => /^-?0(?:\.0+)?$/.test(String(value || '').trim());

    const selectDefaultZero = (input) => {
      if (input.disabled || input.readOnly || !isZeroValue(input.value)) return;
      input.dataset.selectDefaultZero = 'true';
      window.requestAnimationFrame(() => {
        if (document.activeElement !== input || !isZeroValue(input.value)) return;
        try {
          input.select();
        } catch {
          input.value = '';
        }
      });
    };

    const onFocusIn = (event) => {
      if (isNumberInput(event.target)) selectDefaultZero(event.target);
    };

    const onMouseUp = (event) => {
      if (!isNumberInput(event.target) || event.target.dataset.selectDefaultZero !== 'true') return;
      event.preventDefault();
      delete event.target.dataset.selectDefaultZero;
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('mouseup', onMouseUp, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('mouseup', onMouseUp, true);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <NumberInputZeroGuard />
      <Routes>
        {/* ─── Marketing site ─── */}
        <Route path="/" element={<MarketingLayout><Home /></MarketingLayout>} />
        <Route path="/products"  element={<MarketingLayout><ProductsPage /></MarketingLayout>} />
        <Route path="/about"     element={<MarketingLayout><About /></MarketingLayout>} />
        <Route path="/contact"   element={<MarketingLayout><Contact /></MarketingLayout>} />
        <Route path="/resources" element={<MarketingLayout><BlogPage /></MarketingLayout>} />
        <Route path="/products/*"   element={<MarketingLayout><PlaceholderPage title="Product" /></MarketingLayout>} />
        <Route path="/solutions/*"  element={<MarketingLayout><PlaceholderPage title="Solutions" /></MarketingLayout>} />
        <Route path="/partners"     element={<MarketingLayout><PlaceholderPage title="Partners" /></MarketingLayout>} />
        <Route path="/download"     element={<MarketingLayout><PlaceholderPage title="Download" /></MarketingLayout>} />
        <Route path="/buy"          element={<MarketingLayout><PlaceholderPage title="Buy Now" /></MarketingLayout>} />
        <Route path="/blog/:id"     element={<MarketingLayout><PlaceholderPage title="Article" /></MarketingLayout>} />

        {/* ─── Auth (no nav) ─── */}
        <Route path="/app/login"    element={<Login />} />
        <Route path="/app/register" element={<Register />} />
        <Route path="/app/verify-email" element={<VerifyEmail />} />

        {/* ─── Protected app ─── */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="settings"  element={<Settings />} />

          {/* Masters */}
          <Route path="masters/groups"       element={<Groups />} />
          <Route path="masters/ledgers"      element={<Ledgers />} />
          <Route path="masters/customers"    element={<Parties type="customer" />} />
          <Route path="masters/vendors"      element={<Parties type="vendor" />} />
          <Route path="masters/stock-items"  element={<StockItems />} />
          <Route path="masters/stock-groups" element={<StockGroups />} />
          <Route path="masters/units"        element={<Units />} />
          <Route path="masters/godowns"      element={<Godowns />} />
          <Route path="masters/cost-centres" element={<CostCentres />} />

          {/* Vouchers */}
          <Route path="vouchers"             element={<VoucherList />} />
          <Route path="vouchers/approvals"   element={<ApprovalQueue />} />
          <Route path="vouchers/sales"       element={<VoucherEntry voucherType="Sales" />} />
          <Route path="vouchers/purchase"    element={<VoucherEntry voucherType="Purchase" />} />
          <Route path="vouchers/payment"     element={<VoucherEntry voucherType="Payment" />} />
          <Route path="vouchers/receipt"     element={<VoucherEntry voucherType="Receipt" />} />
          <Route path="vouchers/journal"     element={<VoucherEntry voucherType="Journal" />} />
          <Route path="vouchers/contra"      element={<VoucherEntry voucherType="Contra" />} />
          <Route path="vouchers/credit-note" element={<VoucherEntry voucherType="CreditNote" />} />
          <Route path="vouchers/debit-note"  element={<VoucherEntry voucherType="DebitNote" />} />
          <Route path="vouchers/stock-journal" element={<VoucherEntry voucherType="StockJournal" />} />
          <Route path="invoice-print/:id"    element={<InvoicePrint />} />

          {/* Sales and purchase workflows */}
          <Route path="sales-workflow"        element={<WorkflowDocuments flow="sales" />} />
          <Route path="purchase-workflow"     element={<WorkflowDocuments flow="purchase" />} />

          {/* Reports */}
          <Route path="reports/daybook"       element={<DayBook />} />
          <Route path="reports/trial-balance" element={<TrialBalance />} />
          <Route path="reports/balance-sheet" element={<BalanceSheet />} />
          <Route path="reports/profit-loss"   element={<ProfitLoss />} />
          <Route path="reports/ledger"        element={<LedgerReport />} />
          <Route path="reports/receivables"   element={<Outstanding type="receivable" />} />
          <Route path="reports/payables"      element={<Outstanding type="payable" />} />
          <Route path="reports/cash-flow"     element={<CashFlow />} />

          {/* Inventory */}
          <Route path="inventory/stock-summary" element={<StockSummary />} />
          <Route path="inventory/valuation"     element={<InventoryValuation />} />
          <Route path="inventory/batches"       element={<BatchExpiryReport mode="batch" />} />
          <Route path="inventory/expiry"        element={<BatchExpiryReport mode="expiry" />} />
          <Route path="inventory/reorder"       element={<ReorderReport />} />

          {/* GST */}
          <Route path="gst/gstr1"       element={<GSTR1 />} />
          <Route path="gst/gstr3b"      element={<GSTR3B />} />
          <Route path="gst/hsn-summary" element={<HSNSummary />} />
          <Route path="gst/mismatch-checks" element={<GSTCompliance report="mismatch" />} />
          <Route path="gst/missing-gstin"   element={<GSTCompliance report="missingGstin" />} />
          <Route path="gst/reverse-charge"  element={<GSTCompliance report="reverseCharge" />} />

          {/* Payroll */}
          <Route path="payroll/employees" element={<Employees />} />
          <Route path="payroll/pay-heads" element={<PayHeads />} />
          <Route path="payroll/process"   element={<ProcessPayroll />} />
          <Route path="payroll/payslips"  element={<Payslips />} />

          {/* Banking */}
          <Route path="banking/reconciliation" element={<BankReconciliation />} />
          <Route path="banking/import"         element={<BankImport />} />
          <Route path="banking/reminders"      element={<PaymentReminders />} />

          {/* Data tools */}
          <Route path="tools/import-masters" element={<MasterImport />} />
          <Route path="tools/backup"         element={<BackupRestore />} />
          <Route path="tools/advanced"       element={<AdvancedFeatures />} />
          <Route path="tools/tally-shortcuts" element={<TallyShortcuts />} />
          <Route path="settings/accounting-controls" element={<AccountingControls />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
