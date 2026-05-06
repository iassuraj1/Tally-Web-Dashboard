import ContactForm from '../components/ContactForm';
import { FiClock, FiMail, FiMapPin, FiMessageCircle, FiPhone } from 'react-icons/fi';

const channels = [
  { Icon: FiPhone, label: 'Sales', value: '1800-309-8859', href: 'tel:18003098859' },
  { Icon: FiMail, label: 'Support', value: 'support@surajbooks.com', href: 'mailto:support@surajbooks.com' },
  { Icon: FiClock, label: 'Hours', value: 'Mon-Sat, 9 AM-6 PM IST' },
];

const offices = [
  { city: 'Bengaluru', address: 'Product and engineering hub for Suraj Books.' },
  { city: 'Mumbai', address: 'Regional support for commerce, retail, and service teams.' },
  { city: 'Delhi NCR', address: 'Implementation support for growing businesses and firms.' },
  { city: 'Chennai', address: 'Customer success for finance and operations teams.' },
];

export default function Contact() {
  return (
    <div className="bg-white pt-28">
      <section className="border-b border-slate-200 bg-[#fffaf2] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Contact us
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Get help choosing the right accounting workflow
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Tell us about your sales, purchase, inventory, GST, banking, and reporting needs. We will help you plan the right setup.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-[#0b57d0]">
                <FiMessageCircle size={22} />
              </div>
              <div>
                <div className="text-lg font-black text-slate-950">Send us a message</div>
                <div className="text-sm text-slate-500">We usually respond within one business day.</div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {channels.map(({ Icon, label, value, href }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-slate-50 text-[#0b57d0]">
                  <Icon size={20} />
                </div>
                <div className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
                {href ? (
                  <a href={href} className="mt-2 block text-lg font-black text-slate-950 hover:text-[#0b57d0]">
                    {value}
                  </a>
                ) : (
                  <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#f6f8fb] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Regional support
            </div>
            <h2 className="text-3xl font-black text-slate-950">Teams close to your business</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {offices.map((office) => (
              <div key={office.city} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-[#0b57d0]">
                  <FiMapPin size={19} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{office.city}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{office.address}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
