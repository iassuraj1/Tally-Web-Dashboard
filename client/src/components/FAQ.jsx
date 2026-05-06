import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

const faqs = [
  {
    q: 'Is cloud accounting safe for my business data?',
    a: 'Yes. All data is encrypted in transit using TLS and at rest using AES-256. Role-based access controls ensure only authorised team members can view or edit records, and every change is logged in a full audit trail.',
  },
  {
    q: 'Can I file GST returns directly from this platform?',
    a: 'The platform generates GSTR-1, GSTR-3B, and HSN summary reports ready for upload to the GST portal. You can review and validate all figures before export, making the filing process faster and less error-prone.',
  },
  {
    q: 'How does e-invoicing work?',
    a: 'For businesses above the e-invoicing threshold, the platform prepares the JSON payload as required by the GST system. You can review the data, generate IRN-ready output, and attach it to your invoice workflow before dispatch.',
  },
  {
    q: 'Is there a free plan available?',
    a: 'Yes. The Free plan supports one user with basic invoicing, expense tracking, and simple reports. It has no time limit so you can use it to evaluate whether the platform fits your workflow before upgrading.',
  },
  {
    q: 'Can I import my existing data from Tally or Excel?',
    a: 'Yes. The import module accepts Excel and CSV formats for ledgers, customers, vendors, stock items, and opening balances. Each import run runs a validation pass and highlights failed rows before any data is committed.',
  },
  {
    q: 'Which bank feeds are supported?',
    a: 'You can upload bank statements in Excel or CSV format from any Indian bank. The auto-matching engine reconciles entries by amount, date, and reference, then queues unmatched lines for manual review.',
  },
  {
    q: 'What happens to my data if I downgrade or cancel?',
    a: 'Your data remains accessible for 90 days after cancellation so you can export everything. The Backup & Restore feature on higher plans lets you download a full JSON backup of your books at any time.',
  },
  {
    q: 'Does it support multiple companies in one account?',
    a: 'Yes. You can create and manage multiple companies under a single login. Each company has its own books, ledgers, users, and financial years, and you can switch between them from the top navigation.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-white py-20" id="faq">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            FAQs
          </div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Everything you need to know before switching to a cloud accounting platform.
          </p>
        </motion.div>

        <motion.div
          className="divide-y divide-slate-200 rounded-2xl border border-slate-200"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
                >
                  <span className="text-base font-bold text-slate-950">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 text-[#0b57d0]"
                  >
                    <FiChevronDown size={20} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-7 text-slate-600">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
