import { Link } from 'react-router-dom';
import { FiArrowRight, FiStar } from 'react-icons/fi';

const products = [
  {
    id: 1,
    name: 'TallyPrime',
    tagline: 'Complete Business Management',
    description:
      'The all-in-one business management software for accounting, inventory, GST, payroll, and more. Built for businesses of all sizes.',
    features: ['Accounting & Finance', 'GST Billing & Compliance', 'Inventory Management', 'Payroll & HR', 'Banking', 'MIS Reports'],
    badge: 'Most Popular',
    badgeColor: 'bg-[#ff6600]',
    color: 'border-[#003087]',
    headerBg: 'bg-[#003087]',
    href: '/products/tallyprime',
    icon: '📊',
  },
  {
    id: 2,
    name: 'TallyPrime Edit Log',
    tagline: 'Audit Trail & Compliance',
    description:
      'Track every modification to your financial data. Stay compliant with regulatory requirements with a complete edit history.',
    features: ['Complete Audit Trail', 'Edit History Tracking', 'Regulatory Compliance', 'User Activity Log', 'Data Integrity', 'Secure Reports'],
    badge: 'New',
    badgeColor: 'bg-green-500',
    color: 'border-gray-200',
    headerBg: 'bg-gray-700',
    href: '/products/edit-log',
    icon: '🔍',
  },
  {
    id: 3,
    name: 'Shoper 9',
    tagline: 'Retail Management Software',
    description:
      'Complete retail and point-of-sale management solution for single and multi-store businesses with customer loyalty programs.',
    features: ['POS Billing', 'Multi-store Management', 'Inventory Control', 'Customer Loyalty', 'Sales Analytics', 'Staff Management'],
    badge: null,
    color: 'border-gray-200',
    headerBg: 'bg-indigo-700',
    href: '/products/shoper',
    icon: '🏪',
  },
  {
    id: 4,
    name: 'TallyPrime Server',
    tagline: 'Enterprise-Grade Solution',
    description:
      'Designed for large enterprises needing high-performance concurrent multi-user access with enhanced data security and scalability.',
    features: ['Unlimited Users', 'High Performance', 'Enhanced Security', 'Load Balancing', 'Central Administration', '24×7 Availability'],
    badge: 'Enterprise',
    badgeColor: 'bg-purple-600',
    color: 'border-gray-200',
    headerBg: 'bg-purple-700',
    href: '/products/server',
    icon: '🖥️',
  },
];

export default function Products() {
  return (
    <section className="py-20 bg-white" id="products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 text-[#003087] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Our Products
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            The Right Tool for Every Business
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            From small businesses to large enterprises, Tally has a solution tailored to your needs.
          </p>
        </div>

        {/* Product cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border-2 ${p.color} overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
            >
              {/* Card header */}
              <div className={`${p.headerBg} p-6 text-white`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{p.icon}</span>
                  {p.badge && (
                    <span className={`${p.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                      <FiStar size={10} /> {p.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-white/70 text-sm">{p.tagline}</p>
              </div>

              {/* Card body */}
              <div className="p-6 flex flex-col flex-1">
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">{p.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-[#ff6600] rounded-full flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.href}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-[#003087] border-2 border-[#003087] rounded-xl hover:bg-[#003087] hover:text-white transition-all group-hover:bg-[#003087] group-hover:text-white"
                >
                  Learn More <FiArrowRight size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-[#003087] font-semibold hover:text-[#ff6600] transition-colors"
          >
            View all products <FiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
