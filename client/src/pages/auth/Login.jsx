import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getApiError } from '../../utils/api';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiRepeat,
  FiShield,
} from 'react-icons/fi';

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login }           = useAuth();
  const navigate            = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/app');
    } catch (err) {
      setError(getApiError(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const principles = [
    { Icon: FiShield, text: 'Stable accounting core before automation' },
    { Icon: FiRepeat, text: 'Fast voucher entry with cloud workflows' },
    { Icon: FiCheckCircle, text: 'Dashboards, approvals, audit trails, and reports' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_1fr] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <section className="bg-[#003087] text-white p-8 sm:p-10 flex flex-col justify-between gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-[#003087] font-bold text-2xl">T</span>
              </div>
              <span className="font-semibold">Suraj Prime Web</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Built for correct books and modern teams.</h1>
            <p className="text-blue-100 text-sm sm:text-base mt-4 max-w-xl">
              Keep the Tally Prime speed your accounting team expects, then layer in Zoho Books style collaboration as the business grows.
            </p>
          </div>

          <div className="grid gap-3">
            {principles.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/15 p-4">
                <div className="w-9 h-9 rounded-lg bg-[#ff6600] flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <p className="text-sm text-blue-50">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="text-center mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to Suraj Prime Web</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Open your company books, workflows, and reports.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="email" value={form.email} required
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} required
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="********"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/app/register" className="text-[#003087] font-semibold hover:underline">Create one free</Link>
          </p>

          <p className="text-center text-gray-400 text-xs mt-6">
            <Link to="/" className="hover:text-[#003087]">Back to website</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
