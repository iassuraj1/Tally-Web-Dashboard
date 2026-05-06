import { useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiMail } from 'react-icons/fi';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        setMessage(data.message || 'You are subscribed.');
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
    <section className="bg-[#0b57d0] py-16">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-md bg-white/10 text-white">
          <FiMail size={24} />
        </div>
        <h2 className="text-3xl font-black text-white sm:text-4xl">
          Get accounting updates in your inbox
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100">
          Product news, GST reminders, reporting tips, and automation ideas for business owners and finance teams.
        </p>

        {status === 'success' ? (
          <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-md border border-green-300/40 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-100">
            <FiCheckCircle size={18} />
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              required
              className="min-w-0 flex-1 rounded-md border border-white/20 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-[#f5a400]"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black text-[#0b57d0] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              <FiArrowRight size={15} />
            </button>
          </form>
        )}

        {status === 'error' && <p className="mt-3 text-sm text-red-100">{message}</p>}
      </div>
    </section>
  );
}
