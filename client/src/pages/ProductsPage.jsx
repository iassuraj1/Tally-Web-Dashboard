import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

const allProducts = [
  {
    name: 'TallyPrime',
    tagline: 'Complete Business Management Software',
    description: 'TallyPrime is designed to be the simplest and most powerful business management software. It handles accounting, inventory, GST compliance, payroll, banking, and more — all from one platform.',
    features: ['Accounting & Finance', 'GST & e-Invoicing', 'Inventory Management', 'Payroll & HR', 'Banking & Reconciliation', 'MIS Reports & Analytics', 'Remote Access', 'Multi-company'],
    badge: 'Most Popular',
    badgeColor: 'bg-[#ff6600]',
    headerBg: 'from-[#003087] to-[#0051cc]',
    href: '/products/tallyprime',
    icon: '📊',
    price: 'Starting ₹18,000/year',
  },
  {
    name: 'TallyPrime Edit Log',
    tagline: 'Audit Trail & Compliance Solution',
    description: 'Maintain a complete history of every change made in your Tally data. Stay compliant with the audit trail requirements under GST and Income Tax laws.',
    features: ['Complete Edit History', 'Who Changed What & When', 'Regulatory Compliance', 'Tamper-proof Logs', 'User Activity Reports', 'Data Integrity Checks'],
    badge: 'New',
    badgeColor: 'bg-green-500',
    headerBg: 'from-gray-700 to-gray-900',
    href: '/products/edit-log',
    icon: '🔍',
    price: 'Add-on to TallyPrime',
  },
  {
    name: 'Shoper 9',
    tagline: 'Retail & POS Management Software',
    description: 'A complete retail management solution for single and multi-store businesses. Handles point-of-sale billing, inventory, customer loyalty programs, and staff management.',
    features: ['POS Billing', 'Multi-store Management', 'Customer Loyalty Programs', 'Inventory Control', 'Staff Management', 'Sales Analytics'],
    badge: null,
    headerBg: 'from-indigo-700 to-indigo-900',
    href: '/products/shoper',
    icon: '🏪',
    price: 'Contact for pricing',
  },
  {
    name: 'TallyPrime Server',
    tagline: 'Enterprise-Grade Multi-User Solution',
    description: 'Designed for large businesses that need concurrent multi-user access with maximum performance, security, and scalability. Central administration for all your Tally data.',
    features: ['Unlimited Concurrent Users', 'High-Performance Engine', 'Enhanced Data Security', 'Central Administration', 'Load Balancing', '24×7 Availability'],
    badge: 'Enterprise',
    badgeColor: 'bg-purple-600',
    headerBg: 'from-purple-700 to-purple-900',
    href: '/products/server',
    icon: '🖥️',
    price: 'Contact for pricing',
  },
];

export default function ProductsPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003087] to-[#0051cc] text-white py-20 px-4 text-center">
        <span className="inline-block bg-white/10 border border-white/20 text-sm px-4 py-1.5 rounded-full mb-4">
          Our Products
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Solutions Built for Indian Business
        </h1>
        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
          Whether you're a startup or a large enterprise, Tally has the right product for you.
        </p>
      </div>

      {/* Products list */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-10">
        {allProducts.map((p, i) => (
          <div
            key={p.name}
            className={`rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col ${
              i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
            }`}
          >
            {/* Color panel */}
            <div className={`bg-gradient-to-br ${p.headerBg} p-10 flex flex-col justify-center items-center text-white lg:w-64 flex-shrink-0`}>
              <span className="text-7xl mb-4">{p.icon}</span>
              <h2 className="text-2xl font-bold text-center">{p.name}</h2>
              <p className="text-white/70 text-sm text-center mt-1">{p.tagline}</p>
              {p.badge && (
                <span className={`mt-3 ${p.badgeColor} text-xs font-bold px-3 py-1 rounded-full`}>
                  {p.badge}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-gray-500 mb-6 leading-relaxed">{p.description}</p>
                <div className="grid sm:grid-cols-2 gap-2 mb-6">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <FiCheck className="text-green-500 flex-shrink-0" size={15} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <span className="text-sm font-semibold text-[#003087]">{p.price}</span>
                <div className="flex gap-3">
                  <Link
                    to="/contact"
                    className="px-4 py-2.5 text-sm font-semibold text-[#003087] border-2 border-[#003087] rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    Get Demo
                  </Link>
                  <Link
                    to={p.href}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 transition-colors flex items-center gap-1"
                  >
                    Learn More <FiArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
