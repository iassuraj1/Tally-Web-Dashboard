import { useState, useEffect, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';

const testimonials = [
  {
    id: 1,
    name: 'Rajesh Sharma',
    role: 'MD, Sharma Enterprises',
    location: 'Mumbai, Maharashtra',
    text: 'TallyPrime has completely transformed how we manage our business. GST filing that used to take 3 days now takes just a few hours. The reports are incredibly detailed and insightful.',
    rating: 5,
    avatar: 'RS',
    color: 'bg-blue-600',
  },
  {
    id: 2,
    name: 'Priya Nair',
    role: 'CFO, Nair Distributors',
    location: 'Kochi, Kerala',
    text: 'We switched from manual accounting to TallyPrime 5 years ago. The inventory management module alone saved us lakhs every year by eliminating errors and optimising stock levels.',
    rating: 5,
    avatar: 'PN',
    color: 'bg-purple-600',
  },
  {
    id: 3,
    name: 'Amit Gupta',
    role: 'Owner, Gupta Textile Mills',
    location: 'Surat, Gujarat',
    text: "The payroll module is exceptional. Managing salary of 200+ employees including PF, ESI, and TDS is now completely hassle-free. I can't imagine running my business without Tally.",
    rating: 5,
    avatar: 'AG',
    color: 'bg-green-600',
  },
  {
    id: 4,
    name: 'Sunita Reddy',
    role: 'Director, Reddy Constructions',
    location: 'Hyderabad, Telangana',
    text: 'The remote access feature is a game-changer. I can check cash flow and approve payments from anywhere. The customer support team is also very responsive and helpful.',
    rating: 5,
    avatar: 'SR',
    color: 'bg-orange-600',
  },
  {
    id: 5,
    name: 'Vikram Patel',
    role: 'Proprietor, Patel Auto Parts',
    location: 'Ahmedabad, Gujarat',
    text: 'As a small business owner, TallyPrime gives me the same power as large companies. The pricing is very reasonable and the ROI has been phenomenal from day one.',
    rating: 5,
    avatar: 'VP',
    color: 'bg-red-600',
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % testimonials.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const visible = [
    testimonials[(current) % testimonials.length],
    testimonials[(current + 1) % testimonials.length],
    testimonials[(current + 2) % testimonials.length],
  ];

  return (
    <section className="py-20 bg-white" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 text-[#003087] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Loved by Businesses Across India
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Join 2 million+ businesses who've simplified their operations with Tally.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {visible.map((t, i) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl p-6 border-2 shadow-sm transition-all duration-500 ${
                i === 0 ? 'border-[#003087] shadow-lg' : 'border-gray-100'
              }`}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <FiStar key={si} className="text-yellow-400 fill-yellow-400" size={16} />
                ))}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                  <div className="text-xs text-gray-400">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#003087] hover:text-[#003087] transition-colors"
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'w-6 bg-[#003087]' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#003087] hover:text-[#003087] transition-colors"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
