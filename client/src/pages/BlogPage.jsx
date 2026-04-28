import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiSearch } from 'react-icons/fi';
import Newsletter from '../components/Newsletter';

const categories = ['All', 'GST & Compliance', 'Product Tips', 'How-To Guide', 'Business Growth', 'Announcements'];

const allPosts = [
  { id: 1, title: 'Understanding GST Changes for FY 2024-25',                    excerpt: 'Key updates to GST rules that every business owner must know, including new e-invoicing thresholds.', category: 'GST & Compliance',  date: 'April 15, 2025', readTime: '5 min', icon: '📋', gradient: 'from-orange-400 to-red-500'  },
  { id: 2, title: 'Top 10 Features of TallyPrime You Must Use',                  excerpt: 'Discover the hidden gems in TallyPrime that can save you hours of work every week.',              category: 'Product Tips',       date: 'April 10, 2025', readTime: '7 min', icon: '💡', gradient: 'from-blue-400 to-indigo-500' },
  { id: 3, title: 'How to Automate Bank Reconciliation in Tally',                excerpt: 'Step-by-step guide to setting up automatic bank reconciliation in TallyPrime.',                   category: 'How-To Guide',       date: 'April 5, 2025',  readTime: '4 min', icon: '🏦', gradient: 'from-green-400 to-teal-500'  },
  { id: 4, title: 'Managing Multi-Branch Business with TallyPrime',              excerpt: 'Best practices for businesses with multiple locations — consolidation and branch-wise reporting.', category: 'Business Growth',    date: 'March 28, 2025', readTime: '6 min', icon: '🏢', gradient: 'from-purple-400 to-pink-500'  },
  { id: 5, title: 'e-Invoicing Mandatory for All Businesses Above 5 Crore',     excerpt: 'The government has expanded e-invoicing to all businesses with turnover above ₹5 crore.',         category: 'GST & Compliance',  date: 'March 20, 2025', readTime: '3 min', icon: '📄', gradient: 'from-red-400 to-orange-500'   },
  { id: 6, title: 'TallyPrime 5.0 — What\'s New',                               excerpt: "A detailed look at all the new features, improvements, and bug fixes in TallyPrime 5.0.",          category: 'Announcements',      date: 'March 15, 2025', readTime: '8 min', icon: '🚀', gradient: 'from-cyan-400 to-blue-500'    },
  { id: 7, title: 'Setting Up Payroll in TallyPrime — Complete Guide',           excerpt: 'Everything you need to know about configuring salaries, PF, ESI, and generating payslips.',       category: 'How-To Guide',       date: 'March 10, 2025', readTime: '9 min', icon: '💼', gradient: 'from-green-400 to-emerald-500' },
  { id: 8, title: '5 Ways to Use Tally for Better Cash Flow Management',         excerpt: 'Learn how to use TallyPrime\'s built-in features to monitor and improve your cash flow.',         category: 'Business Growth',    date: 'March 5, 2025',  readTime: '5 min', icon: '💰', gradient: 'from-yellow-400 to-orange-500' },
];

export default function BlogPage() {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');

  const filtered = allPosts.filter((p) => {
    const matchCat  = category === 'All' || p.category === category;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003087] to-[#0051cc] text-white py-20 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Resources & Insights</h1>
        <p className="text-blue-200 text-lg max-w-xl mx-auto">
          Tips, guides, and updates to help you get the most out of Tally and run a better business.
        </p>

        {/* Search */}
        <div className="mt-8 max-w-lg mx-auto relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6600] text-sm"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === c
                  ? 'bg-[#003087] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Post grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <article key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className={`h-40 bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                  <span className="text-5xl">{p.icon}</span>
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold bg-blue-50 text-[#003087] px-2.5 py-1 rounded-full">{p.category}</span>
                  <h3 className="mt-3 text-sm font-bold text-gray-900 leading-snug group-hover:text-[#003087] transition-colors line-clamp-2">{p.title}</h3>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{p.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1"><FiCalendar size={11} /> {p.date}</div>
                    <span>{p.readTime} read</span>
                  </div>
                  <Link to={`/blog/${p.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#003087] hover:text-[#ff6600] transition-colors">
                    Read more <FiArrowRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">No articles found</p>
            <p className="text-sm mt-1">Try a different search or category.</p>
          </div>
        )}
      </div>

      <Newsletter />
    </div>
  );
}
