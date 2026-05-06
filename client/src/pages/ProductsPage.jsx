import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiPackage,
  FiShield,
  FiUsers,
} from 'react-icons/fi';

const suites = [
  {
    icon: FiFileText,
    title: 'Receivables and sales',
    description: 'Create invoices, track customer balances, send reminders, and export professional GST documents.',
    features: ['Sales invoices', 'Payment reminders', 'Customer ledgers', 'GST invoice print'],
  },
  {
    icon: FiCreditCard,
    title: 'Banking and payments',
    description: 'Upload bank statements, auto-match entries, reconcile manually, and keep payment history visible.',
    features: ['CSV and Excel import', 'Auto matching', 'Manual reconciliation', 'Reminder history'],
  },
  {
    icon: FiPackage,
    title: 'Inventory and purchasing',
    description: 'Manage stock items, vendors, purchase workflows, low stock, valuation, batch, and expiry views.',
    features: ['Stock items', 'Purchase bills', 'Valuation reports', 'Reorder alerts'],
  },
  {
    icon: FiShield,
    title: 'Compliance and controls',
    description: 'Prepare GST reports, e-invoice-ready fields, role permissions, approvals, comments, and attachments.',
    features: ['GSTR summaries', 'Audit trail', 'Approval queue', 'Role permissions'],
  },
];

export default function ProductsPage() {
  return (
    <div className="bg-white pt-28">
      <section className="border-b border-slate-200 bg-[#fffaf2] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Solutions
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              One accounting platform for sales, banking, inventory, and compliance
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Suraj Books brings daily operations and statutory reporting into the same workflow, so teams can move from entry to review to export without switching tools.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/app/register"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b57d0] px-5 py-3 text-sm font-black text-white hover:bg-[#0848ad]"
              >
                Start free trial
                <FiArrowRight size={15} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-[#0b57d0] hover:text-[#0b57d0]"
              >
                Request demo
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Workspace</div>
                <div className="text-lg font-black text-slate-950">Business health</div>
              </div>
              <span className="rounded-md bg-green-50 px-3 py-1 text-xs font-black text-green-700">Live</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Cash and bank', 'Receivables', 'GST payable', 'Pending approvals'].map((label, index) => (
                <div key={label} className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {['Rs. 7.8L', 'Rs. 3.4L', 'Rs. 82K', '6'][index]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Product modules
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              Choose the workflows your business needs
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {suites.map((suite) => (
              <div key={suite.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-md bg-blue-50 text-[#0b57d0]">
                  <suite.icon size={22} />
                </div>
                <h3 className="text-xl font-black text-slate-950">{suite.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{suite.description}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {suite.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FiCheckCircle className="text-green-600" size={15} />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#f6f8fb] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <FiUsers className="mx-auto mb-5 text-[#0b57d0]" size={36} />
          <h2 className="text-3xl font-black text-slate-950">
            Built for owners, accountants, and operators
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Give every user the right permission level, keep approval queues clean, and maintain an audit-friendly history of comments, documents, and status changes.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#0b57d0] px-5 py-3 text-sm font-black text-white hover:bg-[#0848ad]"
          >
            Plan your setup
            <FiArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
