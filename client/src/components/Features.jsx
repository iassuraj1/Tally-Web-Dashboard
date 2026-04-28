import { FiCpu, FiShield, FiCloud, FiTrendingUp, FiFileText, FiUsers, FiPackage, FiDollarSign } from 'react-icons/fi';

const features = [
  {
    icon: FiFileText,
    title: 'GST Compliance',
    description: 'Automated GST calculations, e-invoicing, GSTR filing, and reconciliation — all built in.',
    color: 'bg-orange-50 text-[#ff6600]',
  },
  {
    icon: FiPackage,
    title: 'Inventory Management',
    description: 'Track stock movements, manage warehouses, set reorder levels, and prevent stockouts.',
    color: 'bg-blue-50 text-[#003087]',
  },
  {
    icon: FiTrendingUp,
    title: 'Financial Reports',
    description: 'Balance sheet, P&L, cash flow, and 400+ business reports available instantly.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: FiUsers,
    title: 'Payroll & HR',
    description: 'Manage salaries, TDS, PF, ESI, and generate payslips with one click.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: FiDollarSign,
    title: 'Banking & Payments',
    description: 'Bank reconciliation, payment vouchers, e-payments, and cheque printing.',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    icon: FiCloud,
    title: 'Remote Access',
    description: 'Access your business data securely from anywhere, on any device, anytime.',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: FiShield,
    title: 'Data Security',
    description: 'Role-based access, password protection, audit logs, and encrypted backups.',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: FiCpu,
    title: 'Automation & AI',
    description: 'Smart auto-fill, exception alerts, and AI-driven insights to grow your business.',
    color: 'bg-indigo-50 text-indigo-600',
  },
];

export default function Features() {
  return (
    <section className="py-20 bg-gray-50" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-orange-50 text-[#ff6600] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            TallyPrime comes packed with powerful features that simplify your day-to-day operations.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 group"
            >
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
