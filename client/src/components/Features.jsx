import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity,
  FiBriefcase,
  FiCheckCircle,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from 'react-icons/fi';

const spotlight = [
  {
    icon: FiShield,
    title: 'GST compliance',
    description: 'Prepare GSTR summaries, e-invoice-ready data, HSN reports, mismatch checks, and tax validations before records are posted.',
    accent: 'bg-[#0b57d0]',
  },
  {
    icon: FiCreditCard,
    title: 'Connected banking',
    description: 'Import statements, auto-match entries by date and amount, and reconcile uncertain lines with a clean review queue.',
    accent: 'bg-[#0b57d0]',
  },
  {
    icon: FiUsers,
    title: 'Collaboration controls',
    description: 'Use role permissions, approval workflows, comments, and attachments to keep the accounting process traceable.',
    accent: 'bg-[#108043]',
  },
  {
    icon: FiRefreshCw,
    title: 'Automation',
    description: 'Schedule payment reminders, generate recurring entries, and reduce repeated work with import/export tools.',
    accent: 'bg-[#7c3aed]',
  },
  {
    icon: FiLayers,
    title: 'Inventory clarity',
    description: 'Track stock movements, low-stock signals, batch details, valuation, and purchase-to-sales flow from the same ledger system.',
    accent: 'bg-[#f5a400]',
  },
  {
    icon: FiActivity,
    title: 'Live business health',
    description: 'See cash, bank balances, receivables, payables, profit estimates, GST payable, and pending approvals together.',
    accent: 'bg-[#0891b2]',
  },
  {
    icon: FiFileText,
    title: 'Professional documents',
    description: 'Create polished GST invoices, export reports, attach supporting documents, and prepare records for audit review.',
    accent: 'bg-[#334155]',
  },
  {
    icon: FiBriefcase,
    title: 'Master data tools',
    description: 'Import ledgers, customers, vendors, stock items, and opening balances with validation and failed-row feedback.',
    accent: 'bg-[#db2777]',
  },
];

const tabModules = [
  {
    id: 'receivables',
    label: 'Receivables',
    icon: FiFileText,
    title: 'Send invoices. Track payments. Stay in control.',
    description: 'Create GST-compliant invoices in seconds, track outstanding dues, and automate payment reminders before cash flow takes a hit.',
    bullets: ['GST-ready tax invoices', 'Customer payment aging', 'Automated follow-ups', 'Receipt recording'],
    preview: {
      tag: 'INV-1048',
      statusLabel: 'Due in 4 days',
      statusColor: 'bg-amber-50 text-amber-700',
      amount: 'Rs. 68,500',
      rows: [
        { label: 'Consulting', value: 'Rs. 42,000' },
        { label: 'Implementation', value: 'Rs. 18,500' },
        { label: 'Support', value: 'Rs. 8,000' },
      ],
    },
  },
  {
    id: 'payables',
    label: 'Payables',
    icon: FiCreditCard,
    title: 'Record vendor bills. Manage approvals. Stay visible.',
    description: 'Capture purchase bills, attach invoices, run approval workflows, and keep upcoming payments organized for easy sign-off.',
    bullets: ['Vendor bill recording', 'Document attachments', 'Approval workflows', 'Purchase reports'],
    preview: {
      tag: 'BILL-204',
      statusLabel: 'Pending approval',
      statusColor: 'bg-blue-50 text-[#0b57d0]',
      amount: 'Rs. 24,300',
      rows: [
        { label: 'Raw material', value: 'Rs. 18,000' },
        { label: 'Freight', value: 'Rs. 3,800' },
        { label: 'GST paid', value: 'Rs. 2,500' },
      ],
    },
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: FiLayers,
    title: 'Track stock. Spot reorder points. Value accurately.',
    description: 'Maintain stock ledgers, track batch and expiry details, identify low-stock items, and generate inventory valuation reports.',
    bullets: ['Stock movement ledger', 'Batch & expiry tracking', 'Low-stock alerts', 'Inventory valuation'],
    preview: {
      tag: 'SKU-A103',
      statusLabel: '14 units in stock',
      statusColor: 'bg-green-50 text-green-700',
      amount: 'Rs. 12,600',
      rows: [
        { label: 'Opening stock', value: '20 units' },
        { label: 'Sold this month', value: '6 units' },
        { label: 'Reorder level', value: '10 units' },
      ],
    },
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FiBriefcase,
    title: 'Bill by time or milestone. Track project health.',
    description: 'Log time entries, assign expenses to projects, track profitability per engagement, and bill clients at the right stage.',
    bullets: ['Time & expense logging', 'Project profitability', 'Milestone billing', 'Client reports'],
    preview: {
      tag: 'PRJ-017',
      statusLabel: '68% complete',
      statusColor: 'bg-purple-50 text-purple-700',
      amount: 'Rs. 1,20,000',
      rows: [
        { label: 'Hours billed', value: '84 hrs' },
        { label: 'Expenses', value: 'Rs. 8,200' },
        { label: 'Profit margin', value: '22.4%' },
      ],
    },
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FiActivity,
    title: 'Review financials. Export data. Stay audit-ready.',
    description: 'Access trial balance, P&L, balance sheet, GST summaries, and outstanding reports without touching a spreadsheet.',
    bullets: ['Trial balance & P&L', 'GST summary reports', 'Outstanding balances', 'Export-ready formats'],
    preview: {
      tag: 'P&L — This Month',
      statusLabel: '+18.4% growth',
      statusColor: 'bg-green-50 text-green-700',
      amount: 'Rs. 99,000',
      rows: [
        { label: 'Revenue', value: 'Rs. 5,40,000' },
        { label: 'Expenses', value: 'Rs. 4,41,000' },
        { label: 'Net profit', value: 'Rs. 99,000' },
      ],
    },
  },
];

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0 },
};

const gridReveal = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

function TabPreview({ module }) {
  return (
    <motion.div
      key={module.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0b57d0] text-white">
          <module.icon size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black leading-snug text-slate-950">{module.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{module.description}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {module.bullets.map((b) => (
          <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
            <FiCheckCircle className="shrink-0 text-green-600" size={14} />
            {b}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {module.preview.tag}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${module.preview.statusColor}`}>
            {module.preview.statusLabel}
          </span>
        </div>
        <div className="mb-4 text-2xl font-black text-slate-950">{module.preview.amount}</div>
        <div className="space-y-2">
          {module.preview.rows.map((row) => (
            <div key={row.label} className="flex justify-between border-b border-slate-200 pb-2 text-sm last:border-0">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-bold text-slate-950">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function UserFavorites() {
  const [activeTab, setActiveTab] = useState('receivables');
  const active = tabModules.find((t) => t.id === activeTab);

  return (
    <section className="border-y border-slate-200 bg-[#f6f8fb] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-12 max-w-3xl text-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            User favorites
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Do it all, and then some more!
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The most-used accounting tasks are designed as compact workspaces — so owners, accountants, and operators can move quickly without losing context.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-start">
          <motion.div
            className="space-y-2"
            variants={gridReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {tabModules.map((tab) => (
              <motion.button
                key={tab.id}
                type="button"
                variants={sectionReveal}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  activeTab === tab.id
                    ? 'border-[#0b57d0]/30 bg-white shadow-md'
                    : 'border-transparent bg-white/50 hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${
                        activeTab === tab.id ? 'bg-[#0b57d0] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <tab.icon size={18} />
                    </div>
                    <div>
                      <div
                        className={`font-black transition ${
                          activeTab === tab.id ? 'text-[#0b57d0]' : 'text-slate-950'
                        }`}
                      >
                        {tab.label}
                      </div>
                      {activeTab === tab.id && (
                        <div className="mt-0.5 text-xs leading-5 text-slate-500">
                          {tab.description.slice(0, 65)}…
                        </div>
                      )}
                    </div>
                  </div>
                  <FiChevronRight
                    size={16}
                    className={`shrink-0 transition ${activeTab === tab.id ? 'text-[#0b57d0]' : 'text-slate-300'}`}
                  />
                </div>
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {active && <TabPreview key={active.id} module={active} />}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default function Features() {
  return (
    <>
      <section className="bg-white py-20" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-12 max-w-3xl text-center"
            variants={sectionReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Spotlight
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              Engineered to unlock business growth
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              A complete accounting experience shaped around compliance, automation, collaboration, and fast reporting.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            variants={gridReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {spotlight.map((item) => (
              <motion.div
                key={item.title}
                variants={sectionReveal}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                whileHover={{ y: -7, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)' }}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition"
              >
                <div className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${item.accent} text-white`}>
                  <item.icon size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <UserFavorites />
    </>
  );
}
