import { FiTarget, FiHeart, FiUsers, FiAward } from 'react-icons/fi';
import Newsletter from '../components/Newsletter';

const timeline = [
  { year: '1986', event: 'Tally Solutions founded by Shyam Sunder Goenka and Bharat Goenka.' },
  { year: '1990', event: 'Tally 4.5 launched — India\'s first accounting software on MS-DOS.' },
  { year: '1999', event: 'Tally 6.3 released with full statutory compliance for India.' },
  { year: '2006', event: 'Tally 9 introduced — Payroll, multi-currency, and FBT support.' },
  { year: '2009', event: 'Tally ERP 9 launched — transforming SME business management.' },
  { year: '2021', event: 'TallyPrime launched — the most intuitive Tally yet.' },
  { year: '2023', event: 'TallyPrime 4.0 with e-Invoicing and enhanced cloud features.' },
];

const values = [
  { icon: FiTarget, title: 'Our Mission',  desc: 'To create technology that empowers every business person to operate with simplicity and confidence.', color: 'text-[#003087] bg-blue-50' },
  { icon: FiHeart,  title: 'Our Vision',   desc: 'To be the most trusted and user-friendly business management platform for businesses everywhere.', color: 'text-[#ff6600] bg-orange-50' },
  { icon: FiUsers,  title: 'Our People',   desc: '5000+ passionate employees across India and globally, committed to building the best software for you.', color: 'text-green-600 bg-green-50' },
  { icon: FiAward,  title: 'Our Legacy',   desc: '40+ years of innovation, trust, and consistent delivery — making us India\'s #1 accounting software.', color: 'text-purple-600 bg-purple-50' },
];

export default function About() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003087] to-[#0051cc] text-white py-24 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">About Tally Solutions</h1>
        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
          For over 40 years, we've been empowering businesses across India and the world with simple, powerful software.
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white py-12 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '40+',  label: 'Years of Innovation' },
            { num: '2M+',  label: 'Businesses Worldwide' },
            { num: '150+', label: 'Countries' },
            { num: '5000+',label: 'Team Members' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold text-[#003087]">{s.num}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">What Drives Us</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                <div className={`w-14 h-14 ${v.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <v.icon size={26} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our Journey</h2>
            <p className="text-gray-500 mt-2">Four decades of building trust, one release at a time.</p>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-8">
              {timeline.map((t, i) => (
                <div key={t.year} className="relative pl-16">
                  <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-xs font-bold ${i === timeline.length - 1 ? 'bg-[#ff6600]' : 'bg-[#003087]'}`}>
                    {t.year.slice(2)}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <span className="text-sm font-bold text-[#003087]">{t.year} — </span>
                    <span className="text-sm text-gray-600">{t.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
