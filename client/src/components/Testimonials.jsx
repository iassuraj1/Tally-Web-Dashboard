import { motion } from 'framer-motion';
import { FiArrowRight, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const testimonials = [
  {
    name: 'Satyan Mehta',
    role: 'CEO, Caple Works',
    quote: 'Our finance and operations teams finally work from one source of truth. Approvals, bank matching, and GST reports are much faster now.',
  },
  {
    name: 'Vishwadha Rao',
    role: 'Founder, Mivi Traders',
    quote: 'The dashboard gives us the pulse of receivables, payables, inventory, and tax before the weekly review even starts.',
  },
  {
    name: 'Tarun Jain',
    role: 'Director, Carrier Wheels',
    quote: 'It feels built for Indian compliance but simple enough for every branch user. That combination matters a lot to us.',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#fffaf2] py-20" id="testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={{ hidden: { opacity: 0, x: -28 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.55, ease: 'easeOut' }}>
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Customer voices
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              Finance teams trust it for everyday control
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              From owner-led businesses to multi-branch teams, the product keeps operational accounting clear, reviewable, and ready for compliance.
            </p>
            <Link
              to="/resources"
              className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0b57d0] hover:text-[#0848ad]"
            >
              Visit customer stories
              <FiArrowRight size={15} />
            </Link>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <motion.article
                key={item.name}
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                whileHover={{ y: -6, boxShadow: '0 18px 36px rgba(15, 23, 42, 0.12)' }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex gap-1 text-[#f5a400]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FiStar key={index} className="fill-current" size={15} />
                  ))}
                </div>
                <p className="text-sm leading-6 text-slate-700">"{item.quote}"</p>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="font-black text-slate-950">{item.name}</div>
                  <div className="text-sm text-slate-500">{item.role}</div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
