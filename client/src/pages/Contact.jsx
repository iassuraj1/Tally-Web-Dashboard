import ContactForm from '../components/ContactForm';
import { FiPhone, FiMail, FiMapPin, FiClock } from 'react-icons/fi';

const offices = [
  { city: 'Bengaluru (HQ)', address: 'Tally Solutions Pvt. Ltd., 23 Vittal Mallya Road, Bengaluru – 560001', phone: '+91-80-6726-2323' },
  { city: 'Mumbai',         address: 'Unit No. 701, 7th Floor, Lotus Corporate Park, Goregaon East, Mumbai – 400063', phone: '+91-22-6663-8282' },
  { city: 'Delhi (NCR)',    address: '4th Floor, Rectangle 1, Commercial Complex, D-4, Saket District Centre, New Delhi – 110017', phone: '+91-11-4715-0450' },
  { city: 'Chennai',        address: 'New No. 8, Old No. 3B, 2nd Floor, Ceebros Buildings, Montieth Road, Egmore, Chennai – 600008', phone: '+91-44-4285-4844' },
];

export default function Contact() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003087] to-[#0051cc] text-white py-20 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
        <p className="text-blue-200 text-lg max-w-xl mx-auto">
          Have questions about Tally? Our team is here to help you find the right solution.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left — contact info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
              <div className="space-y-4">
                {[
                  { Icon: FiPhone,   label: 'Toll Free',    value: '1800-309-8859',            href: 'tel:18003098859' },
                  { Icon: FiMail,    label: 'Email',         value: 'support@tallysolutions.com', href: 'mailto:support@tallysolutions.com' },
                  { Icon: FiClock,   label: 'Support Hours', value: 'Mon–Sat, 9AM – 6PM IST',   href: null },
                ].map(({ Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="text-[#003087]" size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium">{label}</div>
                      {href ? (
                        <a href={href} className="text-sm font-semibold text-gray-800 hover:text-[#003087]">{value}</a>
                      ) : (
                        <div className="text-sm font-semibold text-gray-800">{value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-blue-50 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">Quick Support</h3>
              <div className="space-y-2">
                {['Download TallyPrime', 'Find a Tally Partner', 'Knowledge Base', 'Video Tutorials'].map((l) => (
                  <a key={l} href="#" className="block text-sm text-[#003087] hover:text-[#ff6600] transition-colors font-medium">
                    → {l}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
            <ContactForm />
          </div>
        </div>

        {/* Office locations */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Offices</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {offices.map((o) => (
              <div key={o.city} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                  <FiMapPin className="text-[#ff6600]" size={18} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{o.city}</h3>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{o.address}</p>
                <a href={`tel:${o.phone.replace(/\D/g, '')}`} className="text-xs text-[#003087] font-medium hover:text-[#ff6600]">
                  {o.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
