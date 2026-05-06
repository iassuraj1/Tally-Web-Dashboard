import { useState } from 'react';
import { FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const subjects = [
  'Product inquiry',
  'Request a Demo',
  'Pricing and licensing',
  'Technical support',
  'Partnership',
  'Other',
];

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
  const [status, setStatus]   = useState('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setForm({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
      } else {
        setStatus('error');
        setMessage(data.errors?.[0]?.msg || data.message || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-green-100">
          <FiCheckCircle className="text-green-500" size={40} />
        </div>
        <h3 className="mb-2 text-2xl font-black text-slate-950">Message sent</h3>
        <p className="mb-6 text-slate-500">{message}</p>
        <button
          onClick={() => setStatus('idle')}
          className="rounded-md bg-[#0b57d0] px-6 py-2.5 font-bold text-white transition hover:bg-[#0848ad]"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        {[
          { name: 'name',    label: 'Full Name *',    type: 'text',  placeholder: 'Rajesh Sharma'   },
          { name: 'email',   label: 'Email Address *', type: 'email', placeholder: 'rajesh@company.com' },
          { name: 'phone',   label: 'Phone Number',   type: 'tel',   placeholder: '+91 98765 43210'  },
          { name: 'company', label: 'Company Name',   type: 'text',  placeholder: 'Sharma Enterprises' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
            <input
              type={f.type}
              name={f.name}
              value={form[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              required={f.label.endsWith('*')}
              className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm transition focus:border-[#0b57d0] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-[#0b57d0] focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Select a subject</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Tell us how we can help you..."
          required
          rows={5}
          className="w-full resize-none rounded-md border border-slate-200 px-4 py-3 text-sm focus:border-[#0b57d0] focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          <FiAlertCircle size={16} /> {message}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0b57d0] py-3.5 font-bold text-white transition hover:bg-[#0848ad] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'loading' ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><FiSend size={16} /> Send Message</>
        )}
      </button>
    </form>
  );
}
