import Hero         from '../components/Hero';
import Products     from '../components/Products';
import Features     from '../components/Features';
import Stats        from '../components/Stats';
import Testimonials from '../components/Testimonials';
import Blog         from '../components/Blog';
import Newsletter   from '../components/Newsletter';
import { Link }     from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

function WhyTally() {
  const reasons = [
    { title: 'India\'s Most Trusted',  desc: 'Used by over 2 million businesses for 40+ years.' },
    { title: 'Always Compliant',       desc: 'GST, e-Invoicing, TDS, and payroll compliance built in.' },
    { title: 'Simple to Use',          desc: 'Designed for business owners, not just accountants.' },
    { title: 'Grows With You',         desc: 'From a single user to enterprise — Tally scales with your business.' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-blue-50 text-[#003087] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Why Tally?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-snug">
              The Smart Choice for<br />
              <span className="text-[#003087]">Indian Businesses</span>
            </h2>
            <p className="text-gray-500 mb-8 text-lg leading-relaxed">
              Built specifically for the Indian business environment, TallyPrime understands every compliance need,
              every regulation, and every business challenge you face — so you can focus on growth.
            </p>
            <div className="space-y-4">
              {reasons.map((r) => (
                <div key={r.title} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiCheck className="text-green-600" size={13} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{r.title} — </span>
                    <span className="text-gray-500 text-sm">{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors"
            >
              Learn More About Us <FiArrowRight size={16} />
            </Link>
          </div>

          {/* Right side — product awards / logos mock */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'CII Award', sub: 'Best Business Software', icon: '🏆', bg: 'bg-yellow-50 border-yellow-200' },
              { label: 'ISO Certified', sub: 'Quality Management', icon: '✅', bg: 'bg-green-50 border-green-200' },
              { label: 'NASSCOM', sub: 'Deloitte Fast 500', icon: '🚀', bg: 'bg-blue-50 border-blue-200' },
              { label: '40+ Years', sub: 'Of Innovation', icon: '⭐', bg: 'bg-orange-50 border-orange-200' },
            ].map((a) => (
              <div key={a.label} className={`${a.bg} border-2 rounded-2xl p-6 text-center`}>
                <div className="text-4xl mb-2">{a.icon}</div>
                <div className="font-bold text-gray-900 text-sm">{a.label}</div>
                <div className="text-xs text-gray-500 mt-1">{a.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-16 bg-[#ff6600]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Transform Your Business?
        </h2>
        <p className="text-orange-100 text-lg mb-8">
          Start your free 30-day trial today. No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/download"
            className="px-8 py-3.5 bg-white text-[#ff6600] font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
          >
            Download Free Trial
          </Link>
          <Link
            to="/contact"
            className="px-8 py-3.5 bg-transparent text-white font-bold rounded-xl border-2 border-white hover:bg-white/10 transition-colors"
          >
            Talk to Sales
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Products />
      <Features />
      <Stats />
      <WhyTally />
      <Testimonials />
      <CTABanner />
      <Blog />
      <Newsletter />
    </>
  );
}
