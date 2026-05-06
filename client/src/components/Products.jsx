import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const plans = [
  {
    name: 'Free',
    intro: 'For solopreneurs and micro businesses getting started.',
    monthly: 0,
    yearly: 0,
    ctaLabel: 'Get started',
    href: '/app/register',
    features: ['1 user', 'Basic invoicing', 'Expense tracking', 'Simple reports'],
  },
  {
    name: 'Standard',
    intro: 'For teams that need organized books and faster compliance.',
    monthly: 899,
    yearly: 749,
    ctaLabel: 'Start free trial',
    href: '/app/register',
    features: ['3 users', 'Bank import', 'GST reports', 'Customer and vendor ledgers'],
  },
  {
    name: 'Professional',
    intro: 'For growing businesses with inventory and approval needs.',
    monthly: 1799,
    yearly: 1499,
    ctaLabel: 'Start free trial',
    href: '/app/register',
    popular: true,
    features: ['10 users', 'Inventory control', 'Approvals', 'Payment reminders'],
  },
  {
    name: 'Premium',
    intro: 'For companies that need deeper controls and data movement.',
    monthly: 3599,
    yearly: 2999,
    ctaLabel: 'Talk to sales',
    href: '/contact',
    features: ['Unlimited reports', 'Backup and restore', 'Role permissions', 'Priority support'],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function formatPrice(value) {
  if (value === 0) return 'Free';
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

export default function Products() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="bg-white py-20" id="pricing">
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
            Pricing
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            The right balance of features and affordability
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Pick a plan that matches your current workflow, then scale into banking, inventory, compliance, and collaboration as your business grows.
          </p>

          <div className="mt-8 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                !yearly ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                yearly ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Yearly
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-black text-green-700">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        >
          {plans.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            const showSavings = yearly && plan.monthly > 0;

            return (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                whileHover={{
                  y: -8,
                  boxShadow: plan.popular
                    ? '0 24px 48px rgba(11, 87, 208, 0.18)'
                    : '0 18px 38px rgba(15, 23, 42, 0.12)',
                }}
                className={`relative rounded-xl border bg-white p-6 shadow-sm ${
                  plan.popular ? 'border-[#0b57d0] shadow-lg' : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-[#0b57d0] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                    Most popular
                  </span>
                )}
                <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{plan.name}</div>
                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">{plan.intro}</p>
                <div className="mt-6">
                  <motion.span
                    key={`${plan.name}-${yearly}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-4xl font-black text-slate-950"
                  >
                    {formatPrice(price)}
                  </motion.span>
                  {price > 0 && (
                    <span className="ml-2 text-sm text-slate-500">/ month</span>
                  )}
                  {showSavings && (
                    <div className="mt-1 text-xs font-bold text-green-600">
                      Save Rs. {(plan.monthly - plan.yearly).toLocaleString('en-IN')}/mo vs monthly
                    </div>
                  )}
                </div>
                <Link
                  to={plan.href}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                    plan.popular
                      ? 'bg-[#0b57d0] text-white hover:bg-[#0848ad]'
                      : 'border border-slate-300 text-slate-800 hover:border-[#0b57d0] hover:text-[#0b57d0]'
                  }`}
                >
                  {plan.ctaLabel}
                  <FiArrowRight size={15} />
                </Link>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <FiCheckCircle className="shrink-0 text-green-600" size={15} />
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <p className="mt-8 text-center text-sm text-slate-500">
          All plans include a 14-day free trial. Prices are exclusive of applicable taxes.
        </p>
      </div>
    </section>
  );
}
