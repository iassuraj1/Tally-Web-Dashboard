import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiFileText, FiSearch } from 'react-icons/fi';
import Newsletter from '../components/Newsletter';

const categories = ['All', 'Compliance', 'Banking', 'Controls', 'Inventory', 'Reporting'];

const allPosts = [
  {
    id: 1,
    title: 'GST report checklist before month-end filing',
    excerpt: 'Review GSTR summaries, HSN, reverse charge, missing GSTIN, and mismatch checks before filing.',
    category: 'Compliance',
    date: 'April 15, 2026',
    accent: 'bg-[#0b57d0]',
  },
  {
    id: 2,
    title: 'How connected banking reduces reconciliation time',
    excerpt: 'Use statement imports, matching rules, and exception queues to keep bank balances clean.',
    category: 'Banking',
    date: 'April 8, 2026',
    accent: 'bg-[#0b57d0]',
  },
  {
    id: 3,
    title: 'Approval workflows that finance teams actually use',
    excerpt: 'Set statuses, reviewer ownership, comments, attachments, and audit history without slowing entry.',
    category: 'Controls',
    date: 'March 27, 2026',
    accent: 'bg-[#108043]',
  },
  {
    id: 4,
    title: 'Low-stock dashboards for practical inventory control',
    excerpt: 'Combine reorder levels, stock movements, batch tracking, and purchase visibility.',
    category: 'Inventory',
    date: 'March 18, 2026',
    accent: 'bg-[#f5a400]',
  },
  {
    id: 5,
    title: 'What business owners should see on the main dashboard',
    excerpt: 'Cash, bank, receivables, payables, sales, purchases, profit estimate, and approvals in one view.',
    category: 'Reporting',
    date: 'March 9, 2026',
    accent: 'bg-[#7c3aed]',
  },
  {
    id: 6,
    title: 'Importing masters without corrupting accounting data',
    excerpt: 'Preview, validate, map, and reject failed rows before final import into ledgers and inventory.',
    category: 'Controls',
    date: 'February 26, 2026',
    accent: 'bg-[#334155]',
  },
];

export default function BlogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = allPosts.filter((post) => {
    const byCategory = category === 'All' || post.category === category;
    const term = search.trim().toLowerCase();
    const bySearch = !term || `${post.title} ${post.excerpt}`.toLowerCase().includes(term);
    return byCategory && bySearch;
  });

  return (
    <div className="bg-white pt-28">
      <section className="border-b border-slate-200 bg-[#fffaf2] py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            Resources
          </div>
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Guides for cleaner books and smarter operations
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Practical articles for accounting controls, GST compliance, banking, inventory, exports, and business dashboards.
          </p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resources"
              className="w-full rounded-md border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-950 outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-md px-4 py-2 text-sm font-black transition ${
                  category === item
                    ? 'bg-[#0b57d0] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#0b57d0] hover:text-[#0b57d0]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post) => (
                <article key={post.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className={`mb-6 grid h-12 w-12 place-items-center rounded-md ${post.accent} text-white`}>
                    <FiFileText size={22} />
                  </div>
                  <div className="mb-3 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    {post.category}
                  </div>
                  <h2 className="text-xl font-black leading-snug text-slate-950">{post.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar size={13} />
                      {post.date}
                    </span>
                    <Link to={`/blog/${post.id}`} className="inline-flex items-center gap-1 font-black text-[#0b57d0] hover:text-[#0848ad]">
                      Read
                      <FiArrowRight size={12} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 py-16 text-center">
              <p className="text-lg font-black text-slate-950">No resources found</p>
              <p className="mt-2 text-sm text-slate-500">Try another category or search term.</p>
            </div>
          )}
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
