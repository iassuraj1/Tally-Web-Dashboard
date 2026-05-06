import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiPlay,
  FiStar,
} from 'react-icons/fi';

const metrics = [
  { label: 'Cash in bank', value: 'Rs. 7.8L', tone: 'text-[#0b57d0]' },
  { label: 'Receivables', value: 'Rs. 3.4L', tone: 'text-[#108043]' },
  { label: 'GST payable', value: 'Rs. 82K', tone: 'text-[#0b57d0]' },
];

const bars = [52, 68, 48, 74, 86, 62, 92];

const ratings = [
  { platform: 'GetApp', rating: '4.9' },
  { platform: 'Capterra', rating: '4.8' },
  { platform: 'G2', rating: '4.8' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

function DashboardScene() {
  const reduceMotion = useReducedMotion();
  const floatY = (distance = 12) => reduceMotion ? 0 : [0, -distance, 0];

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-3xl lg:h-[560px]">
      <motion.div
        className="absolute right-0 top-8 w-[84%] rounded-xl border border-slate-200 bg-white shadow-2xl"
        initial={{ opacity: 0, x: 60, rotate: 1 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Live dashboard</div>
            <div className="text-lg font-bold text-slate-950">Zylker Trading Co.</div>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            Books closed
          </span>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">{metric.label}</div>
                <div className={`mt-1 text-xl font-black ${metric.tone}`}>{metric.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-950">Revenue trend</div>
                <div className="text-xs text-slate-500">April to October</div>
              </div>
              <FiBarChart2 className="text-[#0b57d0]" size={20} />
            </div>
            <div className="flex h-32 items-end gap-3">
              {bars.map((bar, index) => (
                <motion.div
                  key={bar}
                  className={`flex-1 rounded-t-md ${index === 4 ? 'bg-[#0b57d0]' : 'bg-blue-100'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${bar}%` }}
                  transition={{ duration: 0.75, delay: 0.5 + index * 0.05, ease: 'easeOut' }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-100 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                <FiFileText className="text-[#0b57d0]" />
                GST filing
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 w-4/5 rounded-full bg-[#0b57d0]" />
              </div>
              <div className="mt-3 text-xs text-slate-500">GSTR-3B ready for review</div>
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                <FiCreditCard className="text-[#f5a400]" />
                Bank feeds
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Matched</span>
                  <span className="font-bold text-green-700">42</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Needs review</span>
                  <span className="font-bold text-[#0b57d0]">6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-0 top-28 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        initial={{ opacity: 0, x: -40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: floatY(10) }}
        transition={{
          opacity: { duration: 0.7, delay: 0.25, ease: 'easeOut' },
          x: { duration: 0.7, delay: 0.25, ease: 'easeOut' },
          y: reduceMotion
            ? { duration: 0.7, delay: 0.25, ease: 'easeOut' }
            : { duration: 5.5, repeat: Infinity, delay: 0.75, ease: 'easeInOut' },
        }}
      >
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Invoice</div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-bold text-slate-950">INV-1048</span>
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">Paid</span>
        </div>
        <div className="space-y-2">
          {['Consulting', 'Implementation', 'Support'].map((item, index) => (
            <div key={item} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs last:border-0">
              <span className="text-slate-500">{item}</span>
              <span className="font-bold text-slate-900">Rs. {['42,000', '18,500', '8,000'][index]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-10 w-72 rounded-xl border border-slate-200 bg-[#111827] p-4 text-white shadow-2xl"
        initial={{ opacity: 0, y: 44 }}
        animate={{ opacity: 1, y: floatY(8) }}
        transition={{
          opacity: { duration: 0.7, delay: 0.45, ease: 'easeOut' },
          y: reduceMotion
            ? { duration: 0.7, delay: 0.45, ease: 'easeOut' }
            : { duration: 5.8, repeat: Infinity, delay: 1, ease: 'easeInOut' },
        }}
      >
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Automation</div>
        <div className="text-sm font-bold">Payment reminder sent</div>
        <p className="mt-1 text-xs text-slate-300">Follow-up email scheduled for overdue invoice #1032.</p>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f0f5ff] to-white pt-32">
      <div className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:min-h-[720px]">
        <div className="grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            className="relative z-10 max-w-2xl py-10 lg:py-20"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0b57d0] shadow-sm"
            >
              <FiCheckCircle size={14} />
              GST compliant accounting platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Comprehensive accounting platform for growing businesses
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Manage end-to-end accounting â€” from banking and e-invoicing to inventory and payroll â€” all from one fast, cloud-ready workspace.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/app/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b57d0] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#0848ad]"
              >
                Start my free trial
                <FiArrowRight size={17} />
              </Link>
              <Link
                to="/app/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-[#0b57d0] hover:text-[#0b57d0]"
              >
                <FiPlay size={16} />
                Explore demo account
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {['No credit card required', 'Role-based access', 'Works across devices'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <FiCheckCircle className="shrink-0 text-green-600" size={15} />
                  {item}
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rated on</span>
              {ratings.map(({ platform, rating }) => (
                <div
                  key={platform}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FiStar key={i} size={10} className="fill-[#f5a400] text-[#f5a400]" />
                    ))}
                  </div>
                  <span className="text-sm font-black text-slate-950">{rating}</span>
                  <span className="text-xs text-slate-500">{platform}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <div className="relative z-0">
            <DashboardScene />
          </div>
        </div>
      </div>
    </section>
  );
}
