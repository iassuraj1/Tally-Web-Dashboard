import { motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';

const stats = [
  { value: '25K+', label: 'Invoices processed monthly' },
  { value: '98%', label: 'Statement lines auto-matched' },
  { value: '7', label: 'Approval and control workflows' },
  { value: '15+', label: 'Accounting reports ready to export' },
];

const platformRatings = [
  { name: 'GetApp', rating: '4.9', reviews: '2,400+ reviews', color: '#ff4f00' },
  { name: 'Capterra', rating: '4.8', reviews: '3,100+ reviews', color: '#0052cc' },
  { name: 'G2', rating: '4.8', reviews: '1,900+ reviews', color: '#ff492c' },
  { name: 'Play Store', rating: '4.7', reviews: '50K+ ratings', color: '#01875f' },
];

export default function Stats() {
  return (
    <section className="border-y border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Trusted workflows
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Built for daily accounting speed and month-end discipline
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -5 }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-3xl font-black text-[#0b57d0]">{stat.value}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-10 border-t border-slate-100 pt-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="mb-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Recognized by leading software review platforms
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {platformRatings.map(({ name, rating, reviews, color }) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: color }}
                >
                  {name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-950">{name}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FiStar key={i} size={10} className="fill-[#f5a400] text-[#f5a400]" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{rating}</span>
                    <span className="text-xs text-slate-400">{reviews}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
