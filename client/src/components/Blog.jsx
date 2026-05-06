import { Link } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiFileText } from 'react-icons/fi';

const posts = [
  {
    id: 1,
    title: 'GST report checklist before month-end filing',
    excerpt: 'A practical review list for sales, purchases, HSN summaries, reverse charge, and missing GSTIN entries.',
    category: 'Compliance',
    date: 'April 15, 2026',
    accent: 'bg-[#0b57d0]',
  },
  {
    id: 2,
    title: 'How connected banking reduces reconciliation time',
    excerpt: 'Use statement imports, matching rules, and exception queues to keep bank balances clean through the month.',
    category: 'Banking',
    date: 'April 8, 2026',
    accent: 'bg-[#0b57d0]',
  },
  {
    id: 3,
    title: 'Building approval controls without slowing teams down',
    excerpt: 'Set up draft, submitted, approved, and rejected voucher flows with clear ownership and audit history.',
    category: 'Controls',
    date: 'March 27, 2026',
    accent: 'bg-[#108043]',
  },
];

export default function Blog() {
  return (
    <section className="bg-white py-20" id="resources">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Resources
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              Practical guidance for better books
            </h2>
          </div>
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-sm font-black text-[#0b57d0] hover:text-[#0848ad]"
          >
            View all resources
            <FiArrowRight size={15} />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`mb-6 grid h-12 w-12 place-items-center rounded-md ${post.accent} text-white`}>
                <FiFileText size={22} />
              </div>
              <div className="mb-3 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {post.category}
              </div>
              <h3 className="text-lg font-black leading-snug text-slate-950">{post.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={13} />
                  {post.date}
                </span>
                <Link to={`/blog/${post.id}`} className="font-black text-[#0b57d0] hover:text-[#0848ad]">
                  Read
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
