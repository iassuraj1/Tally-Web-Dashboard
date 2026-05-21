import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getApiError } from '../../utils/api';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiHash,
  FiHome,
  FiLock,
  FiMail,
  FiMapPin,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { GST_STATES, getGstStateFromGstin } from '../../data/gstStates';

const defaultFinancialYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    financialYearStartDate: `${startYear}-04-01`,
    financialYearEndDate: `${startYear + 1}-03-31`,
  };
};

const initialForm = () => ({
  name: '',
  email: '',
  password: '',
  confirm: '',
  companyName: '',
  legalName: '',
  gstin: '',
  state: '',
  address: '',
  city: '',
  pincode: '',
  ...defaultFinancialYear(),
});

export default function Register() {
  const [form, setForm]       = useState(initialForm);
  const [step, setStep]       = useState('account');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();

  const validateAccountStep = () => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return '';
  };

  const goToCompanyStep = () => {
    const accountError = validateAccountStep();
    if (accountError) {
      setError(accountError);
      return;
    }
    setError('');
    setStep('company');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevVerificationUrl('');
    if (step !== 'company') {
      goToCompanyStep();
      return;
    }
    const accountError = validateAccountStep();
    if (accountError) { setError(accountError); setStep('account'); return; }
    if (form.financialYearEndDate < form.financialYearStartDate) {
      setError('Financial year end date must be after start date');
      return;
    }
    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password, {
        name: form.companyName,
        legalName: form.legalName,
        gstin: form.gstin,
        state: form.state,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        financialYearStartDate: form.financialYearStartDate,
        financialYearEndDate: form.financialYearEndDate,
      });
      setSuccess(data.message || 'Registration successful. Please verify your email before signing in.');
      if (data.emailDelivery?.devVerificationUrl) setDevVerificationUrl(data.emailDelivery.devVerificationUrl);
      setForm({ ...initialForm(), email: form.email });
      setStep('account');
    } catch (err) {
      setError(getApiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name',     label: 'Full Name',        type: 'text',     Icon: FiUser },
    { key: 'email',    label: 'Email Address',    type: 'email',    Icon: FiMail },
    { key: 'password', label: 'Password',         type: 'password', Icon: FiLock, toggle: true },
    { key: 'confirm',  label: 'Confirm Password', type: 'password', Icon: FiLock, toggle: true },
  ];

  const companyFields = [
    { key: 'companyName', label: 'Company Name', type: 'text', Icon: FiBriefcase, required: true },
    { key: 'legalName', label: 'Legal Name', type: 'text', Icon: FiBriefcase },
    { key: 'gstin', label: 'GST No / GSTIN', type: 'text', Icon: FiHash, placeholder: '22AAAAA0000A1Z5', maxLength: 15 },
    { key: 'city', label: 'City', type: 'text', Icon: FiMapPin, required: true },
    { key: 'pincode', label: 'Pincode', type: 'text', Icon: FiMapPin, required: true },
    { key: 'financialYearStartDate', label: 'Financial Year From', type: 'date', Icon: FiCalendar, required: true },
    { key: 'financialYearEndDate', label: 'Financial Year To', type: 'date', Icon: FiCalendar, required: true },
  ];

  const setField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'gstin') {
        const state = getGstStateFromGstin(value);
        if (state) next.state = state.name;
      }
      return next;
    });
  };

  const direction = [
    { Icon: FiZap, title: 'Fast accounting core', text: 'Company-wise books, GST, inventory, payroll, banking, and reports.' },
    { Icon: FiUsers, title: 'Cloud collaboration', text: 'Multi-user access, approvals, attachments, reminders, and audit trails.' },
    { Icon: FiBarChart2, title: 'Phased growth', text: 'Build stable books first, then add workflows, dashboards, and automation.' },
  ];

  const isCompanyStep = step === 'company';
  const stepTitle = isCompanyStep ? 'Set up your company' : 'Create your account';
  const stepSubtitle = isCompanyStep
    ? 'Add GST, address, and financial year details.'
    : 'Start with your sign-in details.';
  const inputClass = 'w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/15';
  const compactInputClass = 'w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/15';

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-[0.9fr_1.1fr] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <section className="bg-[#003087] text-white p-8 sm:p-10 flex flex-col justify-start gap-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-7">
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

          <div className="grid gap-3 max-w-xl">
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
            <h2 className="text-2xl font-bold text-gray-900">{stepTitle}</h2>
            <p className="text-gray-500 text-sm mt-1">{stepSubtitle}</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{stepTitle}</h2>
            <p className="text-gray-500 text-sm mt-1">{stepSubtitle}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 text-xs font-semibold">
            {[
              ['account', '1', 'Account'],
              ['company', '2', 'Company'],
            ].map(([id, number, label]) => {
              const active = step === id;
              const done = id === 'account' && isCompanyStep;
              return (
                <div key={id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${active || done ? 'border-[#003087] bg-blue-50 text-[#003087]' : 'border-gray-200 text-gray-400'}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${active || done ? 'bg-[#003087] text-white' : 'bg-gray-100 text-gray-400'}`}>{number}</span>
                  {label}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl mb-5 text-sm">
              <FiCheckCircle className="mt-0.5 shrink-0" size={16} />
              <div>
                <div>{success}</div>
                <div className="mt-1 text-green-700/80">After verification, use the sign in page to open your account.</div>
                {devVerificationUrl && (
                  <a href={devVerificationUrl} className="mt-2 inline-block font-semibold text-[#003087] hover:underline">
                    Open development verification link
                  </a>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isCompanyStep && (
              <div className="mx-auto max-w-xl space-y-4">
                {fields.map(({ key, label, type, Icon, toggle }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                      <input
                        type={toggle ? (showPwd ? 'text' : 'password') : type}
                        value={form[key]}
                        required
                        onChange={(e) => setField(key, e.target.value)}
                        className={inputClass}
                      />
                      {toggle && (
                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPwd ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isCompanyStep && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {companyFields.map(({ key, label, type, Icon, required, placeholder, maxLength }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <div className="relative">
                        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                        <input
                          type={type}
                          value={form[key]}
                          required={required}
                          maxLength={maxLength}
                          onChange={(e) => setField(key, key === 'gstin' ? e.target.value.toUpperCase() : e.target.value)}
                          placeholder={placeholder}
                          className={compactInputClass}
                        />
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State / UT for GST</label>
                    <select
                      value={form.state}
                      required
                      onChange={(e) => setField('state', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/15"
                    >
                      <option value="">Select state / UT</option>
                      {GST_STATES.map((state) => (
                        <option key={state.code} value={state.name}>{state.code} - {state.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Address</label>
                    <div className="relative">
                      <FiHome className="absolute left-3.5 top-3.5 text-gray-400" size={17} />
                      <textarea
                        rows={2}
                        required
                        value={form.address}
                        onChange={(e) => setField('address', e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 resize-none focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/15"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isCompanyStep ? (
              <button
                type="button"
                onClick={goToCompanyStep}
                className="flex w-full items-center justify-center gap-2 py-3.5 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors mt-2"
              >
                Next <FiArrowRight size={17} />
              </button>
            ) : (
              <div className="grid sm:grid-cols-[auto_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep('account'); }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-60"
                >
                  <FiArrowLeft size={17} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#003087] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create Account'}
                </button>
              </div>
            )}
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
