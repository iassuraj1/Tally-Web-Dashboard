import { useState } from 'react';
import { FiMail, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

export default function Newsletter() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-[#003087] to-[#0051cc]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FiMail className="text-white" size={28} />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Stay Updated with Tally
        </h2>
        <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
          Get the latest product updates, GST tips, and business insights delivered straight to your inbox.
        </p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-3 bg-green-500/20 border border-green-400/30 text-green-300 rounded-xl px-6 py-4 max-w-md mx-auto">
            <FiCheckCircle size={20} />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 px-5 py-3.5 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6600] text-sm"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3.5 bg-[#ff6600] text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Subscribe <FiArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-3 text-red-300 text-sm">{message}</p>
        )}

        <p className="mt-4 text-blue-300 text-xs">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
