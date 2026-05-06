import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiMonitor,
  FiPlay,
  FiSmartphone,
  FiTag,
  FiUsers,
} from 'react-icons/fi';
import Hero from '../components/Hero';
import Products from '../components/Products';
import Features from '../components/Features';
import Stats from '../components/Stats';
import Testimonials from '../components/Testimonials';
import Blog from '../components/Blog';
import Newsletter from '../components/Newsletter';
import FAQ from '../components/FAQ';
import TrustSection from '../components/TrustSection';

const solutions = [
  {
    icon: FiBriefcase,
    title: 'Small-scale business',
    text: 'Invoice customers, collect payments, record expenses, and stay ready for GST filing from day one.',
  },
  {
    icon: FiUsers,
    title: 'Mid-market teams',
    text: 'Add approvals, permissions, imports, attachments, and better reports as departments expand.',
  },
  {
    icon: FiMonitor,
    title: 'Accounting firms',
    text: 'Review books, collaborate with clients, and keep audit history visible across multiple companies.',
  },
  {
    icon: FiTag,
    title: 'For students',
    text: 'Learn real-world double-entry bookkeeping and GST compliance with sample data and guided workflows.',
  },
];

const ctaCards = [
  {
    icon: FiCheckCircle,
    title: '14-day free trial',
    body: 'Try every feature without restrictions. No credit card required to get started.',
    cta: 'Start free trial',
    href: '/app/register',
    accent: 'bg-blue-50 text-[#0b57d0]',
    ctaStyle: 'bg-[#0b57d0] text-white hover:bg-[#0848ad]',
  },
  {
    icon: FiPlay,
    title: 'Explore demo account',
    body: 'Browse a pre-filled company with real-looking invoices, reports, and bank data.',
    cta: 'Open demo',
    href: '/app/login',
    accent: 'bg-green-50 text-green-700',
    ctaStyle: 'border border-slate-300 text-slate-800 hover:border-[#0b57d0] hover:text-[#0b57d0]',
  },
  {
    icon: FiTag,
    title: 'Plans & pricing',
    body: 'Compare plan tiers from free to enterprise with a clear feature-by-feature breakdown.',
    cta: 'View pricing',
    href: '/#pricing',
    accent: 'bg-purple-50 text-purple-700',
    ctaStyle: 'border border-slate-300 text-slate-800 hover:border-[#0b57d0] hover:text-[#0b57d0]',
    isAnchor: true,
  },
  {
    icon: FiCalendar,
    title: 'Live webinar',
    body: 'Join a free guided tour of the platform with a product specialist and live Q&A.',
    cta: 'Book a session',
    href: '/contact',
    accent: 'bg-amber-50 text-amber-700',
    ctaStyle: 'border border-slate-300 text-slate-800 hover:border-[#0b57d0] hover:text-[#0b57d0]',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

function CTACards() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            Get started
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Ready to take control of your books?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Start with invoicing and reports, then add banking, compliance, inventory, reminders, and approvals as your workflow matures.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {ctaCards.map((card) => (
            <motion.div
              key={card.title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              whileHover={{ y: -6, boxShadow: '0 18px 38px rgba(15, 23, 42, 0.1)' }}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${card.accent}`}>
                <card.icon size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-950">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{card.body}</p>
              {card.isAnchor ? (
                <a
                  href={card.href}
                  className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${card.ctaStyle}`}
                >
                  {card.cta}
                  <FiArrowRight size={14} />
                </a>
              ) : (
                <Link
                  to={card.href}
                  className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${card.ctaStyle}`}
                >
                  {card.cta}
                  <FiArrowRight size={14} />
                </Link>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function MigrationBanner() {
  return (
    <section className="bg-[#111827] py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#f5a400]">
            Migrate with confidence
          </div>
          <h2 className="text-3xl font-black sm:text-4xl">
            Make the switch to the future of business accounting
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Bring customers, vendors, ledgers, stock items, opening balances, and vouchers into a controlled workflow with validation before final import.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
          >
            Talk to migration specialist
            <FiArrowRight size={15} />
          </Link>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-white/10 bg-white/5 p-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {['Preview rows', 'Validate GSTIN', 'Map ledgers', 'Import safely'].map((step, index) => (
              <motion.div
                key={step}
                variants={fadeUp}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -5, backgroundColor: 'rgba(255, 255, 255, 0.09)' }}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-[#0b57d0] text-sm font-black">
                  {index + 1}
                </div>
                <div className="font-black">{step}</div>
                <div className="mt-1 text-sm text-slate-300">Step {index + 1} in the import workflow</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SolutionsSection() {
  return (
    <section className="bg-white py-20" id="solutions">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-12 max-w-3xl text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            Tailored for you
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            An accounting solution for every need and every business
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Keep the interface simple for daily entry, then unlock deeper controls when your business needs them.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {solutions.map((solution) => (
            <motion.div
              key={solution.title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              whileHover={{ y: -6, boxShadow: '0 18px 38px rgba(15, 23, 42, 0.12)' }}
              className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6"
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-white text-[#0b57d0] shadow-sm">
                <solution.icon size={22} />
              </div>
              <h3 className="text-xl font-black text-slate-950">{solution.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{solution.text}</p>
              <Link
                to="/products"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0b57d0] hover:gap-2 transition-all"
              >
                Learn more <FiArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function DeviceSection() {
  return (
    <section className="border-y border-slate-200 bg-[#f6f8fb] py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            Across devices
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Carry your accounts wherever work happens
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The web app is designed for quick review on tablets and phones, while full voucher entry and report exports stay comfortable on desktop.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {['Responsive dashboards', 'Keyboard-first entry', 'Export-ready reports', 'Fast search menu'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FiCheckCircle className="shrink-0 text-green-600" size={15} />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#0b57d0] hover:text-[#0b57d0]"
            >
              <FiSmartphone size={16} />
              iOS & Android
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#0b57d0] hover:text-[#0b57d0]"
            >
              <FiMonitor size={16} />
              Desktop app
            </a>
          </div>
        </motion.div>

        <div className="relative h-[380px]">
          <motion.div
            className="absolute left-0 top-8 w-[72%] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            initial={{ opacity: 0, x: -36 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
              <FiMonitor className="text-[#0b57d0]" />
              Desktop report
            </div>
            <div className="space-y-3">
              {[78, 54, 88, 64].map((width) => (
                <div key={width} className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-[#0b57d0]" style={{ width: `${width}%` }} />
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            className="absolute bottom-4 right-4 w-44 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: [0, -8, 0] }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              opacity: { duration: 0.5 },
              y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
              <FiSmartphone className="text-[#0b57d0]" />
              Mobile view
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Cash balance</div>
                <div className="text-lg font-black text-slate-950">Rs. 7.8L</div>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-xs font-bold text-green-700">
                6 approvals pending
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <MigrationBanner />
      <Products />
      <Testimonials />
      <SolutionsSection />
      <DeviceSection />
      <FAQ />
      <TrustSection />
      <CTACards />
      <Blog />
      <Newsletter />
    </>
  );
}
