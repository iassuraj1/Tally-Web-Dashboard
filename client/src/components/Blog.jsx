import { Link } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiUser } from 'react-icons/fi';

const posts = [
  {
    id: 1,
    title: 'Understanding GST Changes for FY 2024-25',
    excerpt: 'Key updates to GST rules that every business owner must know, including new e-invoicing thresholds and GSTR filing deadlines.',
    category: 'GST & Compliance',
    categoryColor: 'bg-orange-100 text-orange-700',
    date: 'April 15, 2025',
    author: 'Tally Editorial',
    readTime: '5 min read',
    image: null,
    gradient: 'from-orange-400 to-red-500',
    icon: '📋',
  },
  {
    id: 2,
    title: 'Top 10 Features of TallyPrime You Must Use',
    excerpt: 'Discover the hidden gems in TallyPrime that can save you hours of work every week, from smart vouchers to auto-reconciliation.',
    category: 'Product Tips',
    categoryColor: 'bg-blue-100 text-blue-700',
    date: 'April 10, 2025',
    author: 'Product Team',
    readTime: '7 min read',
    image: null,
    gradient: 'from-blue-400 to-indigo-500',
    icon: '💡',
  },
  {
    id: 3,
    title: 'How to Automate Bank Reconciliation in Tally',
    excerpt: "Step-by-step guide to setting up automatic bank reconciliation in TallyPrime — saving hours of manual matching every month.",
    category: 'How-To Guide',
    categoryColor: 'bg-green-100 text-green-700',
    date: 'April 5, 2025',
    author: 'Support Team',
    readTime: '4 min read',
    image: null,
    gradient: 'from-green-400 to-teal-500',
    icon: '🏦',
  },
  {
    id: 4,
    title: 'Managing Multi-Branch Business with TallyPrime',
    excerpt: 'Best practices for businesses with multiple locations — consolidation, branch-wise reporting, and centralised control.',
    category: 'Business Growth',
    categoryColor: 'bg-purple-100 text-purple-700',
    date: 'March 28, 2025',
    author: 'Business Team',
    readTime: '6 min read',
    image: null,
    gradient: 'from-purple-400 to-pink-500',
    icon: '🏢',
  },
];

export default function Blog() {
  return (
    <section className="py-20 bg-gray-50" id="blog">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="inline-block bg-blue-50 text-[#003087] text-sm font-semibold px-4 py-1.5 rounded-full mb-3">
              Resources
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Latest News & Insights
            </h2>
          </div>
          <Link
            to="/resources"
            className="hidden sm:flex items-center gap-2 text-[#003087] font-semibold hover:text-[#ff6600] transition-colors"
          >
            View All <FiArrowRight size={16} />
          </Link>
        </div>

        {/* Posts grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Image placeholder */}
              <div className={`h-40 bg-gradient-to-br ${post.gradient} flex items-center justify-center`}>
                <span className="text-5xl">{post.icon}</span>
              </div>

              <div className="p-5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>
                  {post.category}
                </span>

                <h3 className="mt-3 text-sm font-bold text-gray-900 leading-snug group-hover:text-[#003087] transition-colors line-clamp-2">
                  {post.title}
                </h3>

                <p className="mt-2 text-xs text-gray-500 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <FiCalendar size={11} /> {post.date}
                  </div>
                  <span>{post.readTime}</span>
                </div>

                <Link
                  to={`/blog/${post.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#003087] hover:text-[#ff6600] transition-colors"
                >
                  Read more <FiArrowRight size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link to="/resources" className="inline-flex items-center gap-2 text-[#003087] font-semibold">
            View All Articles <FiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
