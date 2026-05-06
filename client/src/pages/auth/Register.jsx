import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getApiError } from '../../utils/api';
import {
  FiAlertCircle,
  FiBarChart2,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/app');
    } catch (err) {
      setError(getApiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name',     label: 'Full Name',        type: 'text',     Icon: FiUser, placeholder: 'Rajesh Sharma' },
    { key: 'email',    label: 'Email Address',    type: 'email',    Icon: FiMail, placeholder: 'you@company.com' },
    { key: 'password', label: 'Password',         type: 'password', Icon: FiLock, placeholder: '********', toggle: true },
    { key: 'confirm',  label: 'Confirm Password', type: 'password', Icon: FiLock, placeholder: '********', toggle: true },
  ];

  const direction = [
    { Icon: FiZap, title: 'Fast accounting core', text: 'Company-wise books, GST, inventory, payroll, banking, and reports.' },
    { Icon: FiUsers, title: 'Cloud collaboration', text: 'Multi-user access, approvals, attachments, reminders, and audit trails.' },
    { Icon: FiBarChart2, title: 'Phased growth', text: 'Build stable books first, then add workflows, dashboards, and automation.' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <section className="bg-[#003087] text-white p-8 sm:p-10 flex flex-col justify-between gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-[#003087] font-bold text-2xl">T</span>
              </div>
              <span className="font-semibold">Suraj Prime Web</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
              Reliable accounting first. Modern business workflows next.
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mt-4 max-w-xl">
              Combine Tally Prime style speed with Zoho Books style collaboration, without trying to build every feature at once.
            </p>
          </div>

          <div className="grid gap-3">
            {direction.map(({ Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl bg-white/10 border border-white/15 p-4">
                <div className="w-9 h-9 rounded-lg bg-[#ff6600] flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-blue-100 text-xs mt-1 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="text-center mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">Start with reliable books and grow into automation</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">Set up your workspace for accounting, teams, and reports.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, type, Icon, placeholder, toggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type={toggle ? (showPwd ? 'text' : 'password') : type}
                    value={form[key]} required
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                  {toggle && (
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/app/login" className="text-[#003087] font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-gray-400 text-xs mt-6">
            <Link to="/" className="hover:text-[#003087]">Back to website</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
