import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

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
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name',     label: 'Full Name',       type: 'text',     Icon: FiUser,  placeholder: 'Rajesh Sharma' },
    { key: 'email',    label: 'Email Address',   type: 'email',    Icon: FiMail,  placeholder: 'you@company.com' },
    { key: 'password', label: 'Password',        type: 'password', Icon: FiLock,  placeholder: '••••••••', toggle: true },
    { key: 'confirm',  label: 'Confirm Password',type: 'password', Icon: FiLock,  placeholder: '••••••••', toggle: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] to-[#0051cc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-[#003087] font-bold text-2xl">T</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-blue-200 text-sm mt-1">Start managing your business today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
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
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
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
        </div>
        <p className="text-center text-blue-200 text-xs mt-6">
          <Link to="/" className="hover:text-white">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
