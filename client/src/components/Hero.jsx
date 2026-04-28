import { Link } from 'react-router-dom';
import { FiArrowRight, FiPlay, FiCheckCircle } from 'react-icons/fi';

const highlights = [
  'GST & e-Invoice Ready',
  'Real-time Reports',
  'Multi-user Access',
  'Cloud Enabled',
];

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#003087] via-[#00409c] to-[#0051cc] min-h-screen flex items-center overflow-hidden pt-24">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-[#ff6600]/10 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-white animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Trusted by 2 Million+ Businesses Worldwide
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Simplify Your{' '}
              <span className="text-[#ff6600]">Business</span>
              <br />
              with TallyPrime
            </h1>

            <p className="text-blue-100 text-lg mb-8 leading-relaxed max-w-xl">
              India's most trusted business management software. Manage accounting,
              inventory, payroll, GST compliance and banking — all in one place.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-blue-100">
                  <FiCheckCircle className="text-green-400 flex-shrink-0" size={16} />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/download"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#ff6600] text-white font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
              >
                Start Free Trial <FiArrowRight size={18} />
              </Link>
              <button className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FiPlay size={14} className="ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-blue-200">
              <span>No credit card required</span>
              <span>·</span>
              <span>30-day free trial</span>
              <span>·</span>
              <span>Cancel anytime</span>
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Mockup header */}
              <div className="bg-[#003087] px-5 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-white/60 text-xs">TallyPrime — Dashboard</div>
              </div>

              {/* Mockup body */}
              <div className="p-6 bg-gray-50">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total Sales', value: '₹24.5L', color: 'blue' },
                    { label: 'Receivables', value: '₹8.2L', color: 'green' },
                    { label: 'Payables', value: '₹3.1L', color: 'orange' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                      <div
                        className={`text-lg font-bold ${
                          s.color === 'blue'
                            ? 'text-[#003087]'
                            : s.color === 'green'
                            ? 'text-green-600'
                            : 'text-[#ff6600]'
                        }`}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bar chart mock */}
                <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                  <div className="text-xs font-semibold text-gray-600 mb-3">Monthly Revenue</div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 50, 80, 70, 90, 75, 95, 60, 85, 70, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          background:
                            i === 11
                              ? '#ff6600'
                              : `rgba(0, 48, 135, ${0.3 + i * 0.06})`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m) => (
                      <span key={m} className="text-xs text-gray-400">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Recent entries */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-600 mb-3">Recent Vouchers</div>
                  {[
                    { name: 'Sales Invoice #1042', amount: '+₹45,000', type: 'Sales' },
                    { name: 'Purchase #504', amount: '-₹12,500', type: 'Purchase' },
                    { name: 'Payment #210', amount: '-₹8,000', type: 'Payment' },
                  ].map((e) => (
                    <div key={e.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-xs font-medium text-gray-700">{e.name}</div>
                        <div className="text-xs text-gray-400">{e.type}</div>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          e.amount.startsWith('+') ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {e.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg">
                ✓
              </div>
              <div>
                <div className="text-xs text-gray-500">GST Return Filed</div>
                <div className="text-sm font-bold text-gray-800">GSTR-3B Submitted</div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-[#ff6600] text-white rounded-xl shadow-xl px-4 py-3">
              <div className="text-xs opacity-80">Net Profit</div>
              <div className="text-xl font-bold">↑ 23%</div>
            </div>
          </div>
        </div>

        {/* Trusted by logos */}
        <div className="mt-20 text-center">
          <p className="text-blue-200 text-sm mb-6">Trusted by leading businesses across India</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-50">
            {['Reliance', 'Infosys', 'HDFC Bank', 'Wipro', 'Asian Paints', 'Bajaj'].map((co) => (
              <span key={co} className="text-white font-semibold text-sm tracking-wide">{co}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
