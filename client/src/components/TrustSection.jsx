import { motion } from 'framer-motion';
import { FiLock, FiShield, FiCheckCircle, FiGlobe } from 'react-icons/fi';

const certifications = [
  {
    icon: FiShield,
    label: 'GDPR',
    sublabel: 'Compliant',
    bg: 'bg-blue-50',
    color: 'text-[#0b57d0]',
  },
  {
    icon: FiLock,
    label: 'ISO 27001',
    sublabel: 'Certified',
    bg: 'bg-green-50',
    color: 'text-green-700',
  },
  {
    icon: FiCheckCircle,
    label: 'SOC 2',
    sublabel: 'Type II',
    bg: 'bg-purple-50',
    color: 'text-purple-700',
  },
  {
    icon: FiGlobe,
    label: '256-bit',
    sublabel: 'SSL Encryption',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
  },
];

const trustPoints = [
  {
    title: 'Your data stays yours',
    body: 'We never sell, share, or use your financial data for advertising. Your books are private by default.',
  },
  {
    title: 'Full audit trail',
    body: 'Every record change, login, and approval is logged with a timestamp and user ID — always reviewable.',
  },
  {
    title: 'Role-based access',
    body: 'Grant read-only, data-entry, or admin permissions per user and company, keeping sensitive data controlled.',
  },
  {
    title: 'Daily backups',
    body: 'Your data is backed up every 24 hours across geographically separated data centres with instant restore.',
  },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export default function TrustSection() {
  return (
    <section className="border-y border-slate-200 bg-[#f6f8fb] py-20">
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
            Security & privacy
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Choose privacy. Choose trust.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Your financial data deserves enterprise-grade protection. We are built on security-first principles from day one.
          </p>
        </motion.div>

        <motion.div
          className="mb-10 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
        >
          {certifications.map(({ icon: Icon, label, sublabel, bg, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm"
            >
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${bg} ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950">{label}</div>
                <div className="text-xs text-slate-500">{sublabel}</div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        >
          {trustPoints.map((point) => (
            <motion.div
              key={point.title}
              variants={fadeUp}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[#0b57d0]/10">
                <FiShield size={16} className="text-[#0b57d0]" />
              </div>
              <h4 className="mb-2 font-black text-slate-950">{point.title}</h4>
              <p className="text-sm leading-6 text-slate-600">{point.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
