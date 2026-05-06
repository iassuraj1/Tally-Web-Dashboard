import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiBriefcase,
  FiCopy,
  FiKey,
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSave,
  FiSend,
  FiSettings,
  FiShare2,
  FiZap,
} from 'react-icons/fi';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};
const monthEnd = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
};
const nextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};
const fmt = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const tabs = [
  { id: 'share', label: 'Share', icon: FiShare2 },
  { id: 'recurring', label: 'Recurring', icon: FiRepeat },
  { id: 'budget', label: 'Budgets', icon: FiActivity },
  { id: 'integrations', label: 'Integrations', icon: FiKey },
  { id: 'settings', label: 'Settings', icon: FiSettings },
  { id: 'assistant', label: 'Ask Reports', icon: FiZap },
];

const emptyRecurring = () => ({
  sourceVoucher: '',
  name: '',
  kind: 'recurring_invoice',
  frequency: 'monthly',
  nextRunDate: nextMonth(),
  endDate: '',
  autoSubmit: false,
});

const emptyBudget = () => ({
  name: '',
  ledger: '',
  periodStart: monthStart(),
  periodEnd: monthEnd(),
  amount: 0,
});

const emptyProject = () => ({
  code: '',
  name: '',
  customer: '',
  manager: '',
  startDate: today(),
  endDate: '',
  budgetAmount: 0,
  status: 'Active',
});

const emptyWebhook = () => ({
  name: '',
  url: '',
  events: 'voucher.created,voucher.approve,voucher.updated',
  secret: '',
  isActive: true,
});

export default function AdvancedFeatures() {
  const { company, setCompany } = useCompany();
  const cid = company?._id;
  const [activeTab, setActiveTab] = useState('share');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState(null);
  const [invoiceCandidates, setInvoiceCandidates] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetReport, setBudgetReport] = useState({ rows: [], totals: {} });
  const [projectReport, setProjectReport] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);

  const [recurringForm, setRecurringForm] = useState(emptyRecurring);
  const [budgetForm, setBudgetForm] = useState(emptyBudget);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [webhookForm, setWebhookForm] = useState(emptyWebhook);
  const [apiKeyName, setApiKeyName] = useState('Integration key');
  const [generatedKey, setGeneratedKey] = useState('');
  const [share, setShare] = useState(null);
  const [emailForm, setEmailForm] = useState({ voucherId: '', to: '', note: '' });
  const [question, setQuestion] = useState('What should I look at this month?');
  const [answer, setAnswer] = useState(null);

  const salesInvoices = useMemo(
    () => invoiceCandidates.filter((voucher) => voucher.voucherType === 'Sales'),
    [invoiceCandidates]
  );
  const customerLedgers = useMemo(
    () => ledgers.filter((ledger) => ['customer', 'both'].includes(ledger.partyType)),
    [ledgers]
  );

  const load = useCallback(async () => {
    if (!cid) return;
    setLoading(true);
    setMessage('');
    try {
      const [
        settingsRes,
        invoiceRes,
        recurringRes,
        budgetsRes,
        budgetReportRes,
        projectReportRes,
        apiKeysRes,
        webhooksRes,
        ledgersRes,
      ] = await Promise.all([
        api.get(`/companies/${cid}/advanced/settings`),
        api.get(`/companies/${cid}/advanced/invoice-candidates`),
        api.get(`/companies/${cid}/advanced/recurring`),
        api.get(`/companies/${cid}/advanced/budgets`),
        api.get(`/companies/${cid}/advanced/budgets/report`),
        api.get(`/companies/${cid}/advanced/projects/profitability`),
        api.get(`/companies/${cid}/advanced/api-keys`),
        api.get(`/companies/${cid}/advanced/webhooks`),
        api.get(`/companies/${cid}/ledgers`),
      ]);
      setSettings(settingsRes.data.data || {});
      setInvoiceCandidates(invoiceRes.data.data || []);
      setRecurring(recurringRes.data.data || []);
      setBudgets(budgetsRes.data.data || []);
      setBudgetReport(budgetReportRes.data.data || { rows: [], totals: {} });
      setProjectReport(projectReportRes.data.data || []);
      setApiKeys(apiKeysRes.data.data || []);
      setWebhooks(webhooksRes.data.data || []);
      setLedgers(ledgersRes.data.data || []);
    } catch (err) {
      setMessage(getApiError(err, 'Could not load advanced tools'));
    } finally {
      setLoading(false);
    }
  }, [cid]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      const res = await api.put(`/companies/${cid}/advanced/settings`, settings);
      setSettings(res.data.data || {});
      setCompany({ ...(company || {}), ...(res.data.data || {}) });
      setMessage('Advanced settings saved.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not save settings'));
    }
  };

  const updateSettingArray = (key, index, field, value) => {
    setSettings((current) => {
      const rows = [...(current?.[key] || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...(current || {}), [key]: rows };
    });
  };

  const addSettingRow = (key, row) => {
    setSettings((current) => ({ ...(current || {}), [key]: [...(current?.[key] || []), row] }));
  };

  const getShare = async (voucherId) => {
    if (!voucherId) return;
    try {
      const res = await api.get(`/companies/${cid}/advanced/invoices/${voucherId}/share`);
      setShare(res.data.data);
      setEmailForm((form) => ({
        ...form,
        voucherId,
        to: res.data.data?.voucher?.partyEmail || form.to,
      }));
      setMessage('Share links ready.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not prepare share links'));
    }
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
    setMessage('Copied.');
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/companies/${cid}/advanced/invoices/${emailForm.voucherId}/email`, {
        to: emailForm.to,
        note: emailForm.note,
      });
      setMessage(res.data.data?.sent ? 'Invoice email sent.' : 'SMTP is not configured. Email preview was generated.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not send invoice email'));
    }
  };

  const createRecurring = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/companies/${cid}/advanced/recurring/from-voucher`, recurringForm);
      setRecurringForm(emptyRecurring());
      await load();
      setMessage('Recurring template created.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not create recurring template'));
    }
  };

  const generateRecurring = async (id) => {
    try {
      await api.post(`/companies/${cid}/advanced/recurring/${id}/generate`);
      await load();
      setMessage('Voucher generated.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not generate voucher'));
    }
  };

  const createBudget = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/companies/${cid}/advanced/budgets`, { ...budgetForm, amount: Number(budgetForm.amount || 0) });
      setBudgetForm(emptyBudget());
      await load();
      setMessage('Budget saved.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not save budget'));
    }
  };

  const deactivateBudget = async (id) => {
    await api.delete(`/companies/${cid}/advanced/budgets/${id}`);
    await load();
  };

  const createProject = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/companies/${cid}/advanced/projects`, { ...projectForm, budgetAmount: Number(projectForm.budgetAmount || 0) });
      setProjectForm(emptyProject());
      await load();
      setMessage('Project saved.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not save project'));
    }
  };

  const createApiKey = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/companies/${cid}/advanced/api-keys`, { name: apiKeyName, scopes: ['read', 'write'] });
      setGeneratedKey(res.data.data?.key || '');
      await load();
      setMessage('API key created.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not create API key'));
    }
  };

  const revokeApiKey = async (id) => {
    await api.patch(`/companies/${cid}/advanced/api-keys/${id}/revoke`);
    await load();
  };

  const createWebhook = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/companies/${cid}/advanced/webhooks`, {
        ...webhookForm,
        events: webhookForm.events.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setWebhookForm(emptyWebhook());
      await load();
      setMessage('Webhook saved.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not save webhook'));
    }
  };

  const testWebhook = async (id) => {
    try {
      const res = await api.post(`/companies/${cid}/advanced/webhooks/${id}/test`);
      await load();
      setMessage(res.data.data?.status === 'success' ? 'Webhook test delivered.' : 'Webhook test failed.');
    } catch (err) {
      setMessage(getApiError(err, 'Webhook test failed'));
    }
  };

  const askReports = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post(`/companies/${cid}/advanced/assistant/query`, { question });
      setAnswer(res.data.data);
    } catch (err) {
      setMessage(getApiError(err, 'Could not answer question'));
    }
  };

  if (!company) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
              activeTab === tab.id ? 'bg-[#003087] text-white border-[#003087]' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-2 rounded-lg border border-gray-100 bg-white text-gray-500 hover:bg-gray-50">
          <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {message && <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-600">{message}</div>}

      {activeTab === 'share' && (
        <div className="grid xl:grid-cols-[1fr_420px] gap-4">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Invoice Sharing</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Invoice', 'Date', 'Party', 'Amount', 'Action'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesInvoices.map((voucher) => (
                    <tr key={voucher._id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{voucher.voucherNo}</td>
                      <td className="px-4 py-3 text-gray-500">{dateOnly(voucher.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{voucher.party?.name || '-'}</td>
                      <td className="px-4 py-3 font-semibold">Rs {fmt(voucher.total)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => getShare(voucher._id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#003087] text-[#003087] hover:bg-blue-50">
                          Share
                        </button>
                      </td>
                    </tr>
                  ))}
                  {salesInvoices.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-gray-400">No sales invoices found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Send Invoice</h3>
            {share && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-900">{share.voucher?.voucherNo}</div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={share.whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-50 text-green-700 border border-green-100">
                    <FiShare2 size={14} /> WhatsApp
                  </a>
                  <button type="button" onClick={() => copyText(share.message)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600">
                    <FiCopy size={14} /> Copy
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={sendEmail} className="space-y-3">
              <select value={emailForm.voucherId} onChange={(e) => { setEmailForm((form) => ({ ...form, voucherId: e.target.value })); getShare(e.target.value); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select invoice</option>
                {salesInvoices.map((voucher) => <option key={voucher._id} value={voucher._id}>{voucher.voucherNo} - {voucher.party?.name || 'Party'}</option>)}
              </select>
              <input type="email" value={emailForm.to} onChange={(e) => setEmailForm((form) => ({ ...form, to: e.target.value }))} placeholder="Email" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <textarea rows={3} value={emailForm.note} onChange={(e) => setEmailForm((form) => ({ ...form, note: e.target.value }))} placeholder="Note" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
              <button type="submit" disabled={!emailForm.voucherId} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                <FiMail size={14} /> Email Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'recurring' && (
        <div className="grid xl:grid-cols-[420px_1fr] gap-4">
          <form onSubmit={createRecurring} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Recurring Template</h3>
            <input required value={recurringForm.name} onChange={(e) => setRecurringForm((form) => ({ ...form, name: e.target.value }))} placeholder="Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            <select required value={recurringForm.sourceVoucher} onChange={(e) => setRecurringForm((form) => ({ ...form, sourceVoucher: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="">Source voucher</option>
              {invoiceCandidates.map((voucher) => <option key={voucher._id} value={voucher._id}>{voucher.voucherType} {voucher.voucherNo} - Rs {fmt(voucher.total)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select value={recurringForm.kind} onChange={(e) => setRecurringForm((form) => ({ ...form, kind: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="recurring_invoice">Recurring</option>
                <option value="subscription">Subscription</option>
              </select>
              <select value={recurringForm.frequency} onChange={(e) => setRecurringForm((form) => ({ ...form, frequency: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={recurringForm.nextRunDate} onChange={(e) => setRecurringForm((form) => ({ ...form, nextRunDate: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input type="date" value={recurringForm.endDate} onChange={(e) => setRecurringForm((form) => ({ ...form, endDate: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={recurringForm.autoSubmit} onChange={(e) => setRecurringForm((form) => ({ ...form, autoSubmit: e.target.checked }))} />
              Auto-submit generated vouchers
            </label>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg">
              <FiPlus size={14} /> Create Template
            </button>
          </form>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Schedules</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">{['Name', 'Type', 'Next Run', 'Last Voucher', 'Status', 'Action'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {recurring.map((row) => (
                    <tr key={row._id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-500">{row.frequency}</td>
                      <td className="px-4 py-3 text-gray-500">{dateOnly(row.nextRunDate)}</td>
                      <td className="px-4 py-3 text-gray-500">{row.lastGeneratedVoucher?.voucherNo || '-'}</td>
                      <td className="px-4 py-3">{row.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3"><button type="button" onClick={() => generateRecurring(row._id)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#003087] text-[#003087]">Generate</button></td>
                    </tr>
                  ))}
                  {recurring.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No recurring templates</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-4">
          <div className="grid xl:grid-cols-2 gap-4">
            <form onSubmit={createBudget} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Budget</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <input required value={budgetForm.name} onChange={(e) => setBudgetForm((form) => ({ ...form, name: e.target.value }))} placeholder="Name" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <select required value={budgetForm.ledger} onChange={(e) => setBudgetForm((form) => ({ ...form, ledger: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">Ledger</option>
                  {ledgers.map((ledger) => <option key={ledger._id} value={ledger._id}>{ledger.name}</option>)}
                </select>
                <input type="date" value={budgetForm.periodStart} onChange={(e) => setBudgetForm((form) => ({ ...form, periodStart: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <input type="date" value={budgetForm.periodEnd} onChange={(e) => setBudgetForm((form) => ({ ...form, periodEnd: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <input type="number" min="0" step="0.01" value={budgetForm.amount} onChange={(e) => setBudgetForm((form) => ({ ...form, amount: e.target.value }))} placeholder="Amount" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiSave size={14} /> Save Budget</button>
            </form>
            <form onSubmit={createProject} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Project</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={projectForm.code} onChange={(e) => setProjectForm((form) => ({ ...form, code: e.target.value.toUpperCase() }))} placeholder="Code" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <input required value={projectForm.name} onChange={(e) => setProjectForm((form) => ({ ...form, name: e.target.value }))} placeholder="Name" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <select value={projectForm.customer} onChange={(e) => setProjectForm((form) => ({ ...form, customer: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">Customer</option>
                  {customerLedgers.map((ledger) => <option key={ledger._id} value={ledger._id}>{ledger.name}</option>)}
                </select>
                <select value={projectForm.status} onChange={(e) => setProjectForm((form) => ({ ...form, status: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                  {['Planned', 'Active', 'Completed', 'On Hold'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <input type="number" min="0" step="0.01" value={projectForm.budgetAmount} onChange={(e) => setProjectForm((form) => ({ ...form, budgetAmount: e.target.value }))} placeholder="Budget" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <input value={projectForm.manager} onChange={(e) => setProjectForm((form) => ({ ...form, manager: e.target.value }))} placeholder="Manager" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiBriefcase size={14} /> Save Project</button>
            </form>
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Budget Variance</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">{['Ledger', 'Budget', 'Actual', 'Variance', 'Used'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {budgetReport.rows?.map((row) => (
                      <tr key={row._id}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.ledger}</td>
                        <td className="px-4 py-3">Rs {fmt(row.budget)}</td>
                        <td className="px-4 py-3">Rs {fmt(row.actual)}</td>
                        <td className="px-4 py-3">Rs {fmt(row.variance)}</td>
                        <td className="px-4 py-3">{fmt(row.usedPct)}%</td>
                      </tr>
                    ))}
                    {budgetReport.rows?.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-gray-400">No budget rows</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Project Profitability</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">{['Project', 'Revenue', 'Cost', 'Profit', 'Budget Left'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {projectReport.map((row) => (
                      <tr key={row._id}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                        <td className="px-4 py-3">Rs {fmt(row.revenue)}</td>
                        <td className="px-4 py-3">Rs {fmt(row.cost)}</td>
                        <td className="px-4 py-3">Rs {fmt(row.profit)}</td>
                        <td className="px-4 py-3">Rs {fmt(row.budgetVariance)}</td>
                      </tr>
                    ))}
                    {projectReport.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-gray-400">No projects</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {budgets.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap gap-2">
                {budgets.filter((budget) => budget.isActive).map((budget) => (
                  <button key={budget._id} type="button" onClick={() => deactivateBudget(budget._id)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600">
                    Deactivate {budget.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="grid xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">API Keys</h3>
            <form onSubmit={createApiKey} className="flex gap-2">
              <input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} className="min-w-0 flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <button type="submit" className="px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg">Create</button>
            </form>
            {generatedKey && (
              <button type="button" onClick={() => copyText(generatedKey)} className="w-full text-left px-3 py-2.5 rounded-lg bg-blue-50 text-[#003087] text-xs font-mono break-all">
                {generatedKey}
              </button>
            )}
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key._id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-400">{key.prefix}...{key.last4} - {key.status}</div>
                  </div>
                  {key.status === 'active' && <button type="button" onClick={() => revokeApiKey(key._id)} className="text-xs text-red-600">Revoke</button>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Webhooks</h3>
            <form onSubmit={createWebhook} className="space-y-3">
              <input required value={webhookForm.name} onChange={(e) => setWebhookForm((form) => ({ ...form, name: e.target.value }))} placeholder="Name" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input required type="url" value={webhookForm.url} onChange={(e) => setWebhookForm((form) => ({ ...form, url: e.target.value }))} placeholder="https://example.com/webhook" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input value={webhookForm.events} onChange={(e) => setWebhookForm((form) => ({ ...form, events: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input value={webhookForm.secret} onChange={(e) => setWebhookForm((form) => ({ ...form, secret: e.target.value }))} placeholder="Secret" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiSend size={14} /> Save Webhook</button>
            </form>
            <div className="space-y-2">
              {webhooks.map((webhook) => (
                <div key={webhook._id} className="border border-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{webhook.name}</div>
                      <div className="text-xs text-gray-400 truncate">{webhook.url}</div>
                    </div>
                    <button type="button" onClick={() => testWebhook(webhook._id)} className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-600">Test</button>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{webhook.lastDeliveryStatus || 'Not delivered'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Branches</h3>
              {(settings.branches || []).map((branch, index) => (
                <div key={branch._id || index} className="grid sm:grid-cols-4 gap-2">
                  <input value={branch.name || ''} onChange={(e) => updateSettingArray('branches', index, 'name', e.target.value)} placeholder="Name" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={branch.code || ''} onChange={(e) => updateSettingArray('branches', index, 'code', e.target.value.toUpperCase())} placeholder="Code" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={branch.gstin || ''} onChange={(e) => updateSettingArray('branches', index, 'gstin', e.target.value.toUpperCase())} placeholder="GSTIN" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(branch.isDefault)} onChange={(e) => updateSettingArray('branches', index, 'isDefault', e.target.checked)} /> Default</label>
                </div>
              ))}
              <button type="button" onClick={() => addSettingRow('branches', { name: '', code: '', gstin: '', address: '', isDefault: false })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Add Branch</button>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Currencies</h3>
              {(settings.currencies || []).map((currency, index) => (
                <div key={currency._id || index} className="grid sm:grid-cols-4 gap-2">
                  <input value={currency.code || ''} onChange={(e) => updateSettingArray('currencies', index, 'code', e.target.value.toUpperCase())} placeholder="Code" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={currency.symbol || ''} onChange={(e) => updateSettingArray('currencies', index, 'symbol', e.target.value)} placeholder="Symbol" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input type="number" step="0.0001" value={currency.exchangeRate || 1} onChange={(e) => updateSettingArray('currencies', index, 'exchangeRate', +e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(currency.isBase)} onChange={(e) => updateSettingArray('currencies', index, 'isBase', e.target.checked)} /> Base</label>
                </div>
              ))}
              <button type="button" onClick={() => addSettingRow('currencies', { code: 'USD', symbol: '$', exchangeRate: 1, isBase: false })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Add Currency</button>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="grid sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(settings.tdsTcsEnabled)} onChange={(e) => setSettings((current) => ({ ...current, tdsTcsEnabled: e.target.checked }))} /> TDS/TCS</label>
              <input type="number" step="0.01" value={settings.defaultTdsRate || 0} onChange={(e) => setSettings((current) => ({ ...current, defaultTdsRate: +e.target.value }))} placeholder="TDS %" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input type="number" step="0.01" value={settings.defaultTcsRate || 0} onChange={(e) => setSettings((current) => ({ ...current, defaultTcsRate: +e.target.value }))} placeholder="TCS %" className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <select value={settings.cloudStorageProvider || ''} onChange={(e) => setSettings((current) => ({ ...current, cloudStorageProvider: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Local attachments</option>
                <option value="s3">Amazon S3</option>
                <option value="gcs">Google Cloud Storage</option>
                <option value="azure">Azure Blob</option>
              </select>
            </div>
            <div className="mt-3">
              <input value={settings.cloudStorageBucket || ''} onChange={(e) => setSettings((current) => ({ ...current, cloudStorageBucket: e.target.value }))} placeholder="Cloud bucket/container" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <button type="submit" className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiSave size={14} /> Save Settings</button>
          </div>
        </form>
      )}

      {activeTab === 'assistant' && (
        <div className="grid xl:grid-cols-[420px_1fr] gap-4">
          <form onSubmit={askReports} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Report Question</h3>
            <textarea rows={5} value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none" />
            <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiZap size={14} /> Ask</button>
          </form>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Answer</h3>
            {answer ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-6">{answer.answer}</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {Object.entries(answer.facts || {}).map(([key, value]) => (
                    <div key={key} className="border border-gray-100 rounded-lg px-3 py-2">
                      <div className="text-xs text-gray-400">{key}</div>
                      <div className="text-sm font-bold text-gray-900">{typeof value === 'number' ? fmt(value) : value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="py-16 text-center text-gray-400">No answer yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}
