import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import api from '../../../utils/api';
import Modal from '../../../components/app/Modal';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiCopy,
  FiToggleLeft, FiToggleRight, FiDownload, FiPrinter,
  FiFilter, FiX, FiTrendingUp, FiTrendingDown, FiAlertCircle,
  FiChevronRight, FiRefreshCw, FiBookOpen,
} from 'react-icons/fi';

/* ── helpers ─────────────────────────────────────── */
const fmt = (n) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const NATURE_COLORS = {
  Assets:      'bg-emerald-100 text-emerald-700',
  Liabilities: 'bg-red-100    text-red-700',
  Income:      'bg-blue-100   text-blue-700',
  Expenses:    'bg-amber-100  text-amber-700',
};
const NATURE_TABS = ['All', 'Assets', 'Liabilities', 'Income', 'Expenses'];
const GST_TYPES   = ['Regular', 'Composition', 'Unregistered', 'Consumer', 'Overseas', ''];

/* ── empty form ──────────────────────────────────── */
const EMPTY = {
  name: '', group: '', isActive: true,
  openingBalance: 0, openingBalanceType: 'Dr',
  // GST
  gstApplicable: false, gstin: '', gstType: '',
  // Contact
  address: '', city: '', state: '', pincode: '', country: 'India', phone: '', email: '', website: '',
  // Credit
  creditLimit: 0, creditDays: 0, billByBill: false,
  // Bank
  bankName: '', accountNo: '', ifscCode: '', branch: '', micrCode: '',
  // Statutory
  taxRate: 0, tdsApplicable: false, tdsSection: '',
  // Notes
  notes: '',
};

/* ═══════════════════════════════════════════════════
   FORM — 5 tabs: Basic | GST | Contact | Banking | Statutory
═══════════════════════════════════════════════════ */
function LedgerForm({ form, setForm, groups, err }) {
  const [tab, setTab] = useState('basic');
  const tabs = [
    { id: 'basic',     label: 'Basic Info'   },
    { id: 'gst',       label: 'GST'          },
    { id: 'contact',   label: 'Contact'      },
    { id: 'banking',   label: 'Banking'      },
    { id: 'statutory', label: 'Statutory'    },
  ];
  const natures = ['Assets', 'Liabilities', 'Income', 'Expenses'];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = (k, opts = {}) => (
    <input
      type={opts.type || 'text'}
      step={opts.step}
      value={form[k] ?? ''}
      onChange={e => set(k, opts.type === 'number' ? +e.target.value : e.target.value)}
      placeholder={opts.placeholder || ''}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
    />
  );
  const lbl = (text, required) => (
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  return (
    <div>
      {err && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          <FiAlertCircle size={15} /> {err}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-white text-[#003087] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BASIC ── */}
      {tab === 'basic' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {lbl('Ledger Name', true)}
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                placeholder="e.g. Axis Bank, Rent Expense, Customer A" />
            </div>

            <div>
              {lbl('Under (Group)', true)}
              <select required value={form.group} onChange={e => set('group', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">— Select group —</option>
                {natures.map(n => (
                  <optgroup key={n} label={n}>
                    {groups.filter(g => g.nature === n).map(g => (
                      <option key={g._id} value={g._id}>{g.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              {lbl('Opening Balance')}
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" value={form.openingBalance}
                  onChange={e => set('openingBalance', +e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                <select value={form.openingBalanceType} onChange={e => set('openingBalanceType', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="Dr">Dr (Debit)</option>
                  <option value="Cr">Cr (Credit)</option>
                </select>
              </div>
            </div>

            <div>
              {lbl('Credit Limit (₹)')}
              {inp('creditLimit', { type: 'number', step: '1' })}
            </div>
            <div>
              {lbl('Credit Days')}
              {inp('creditDays', { type: 'number', step: '1' })}
            </div>

            <div className="sm:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.billByBill} onChange={e => set('billByBill', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#003087] focus:ring-[#003087]" />
                <span className="font-medium text-gray-700">Maintain Bill-by-Bill</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#003087] focus:ring-[#003087]" />
                <span className="font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              {lbl('Internal Notes')}
              <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Optional internal notes…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          </div>
        </div>
      )}

      {/* ── GST ── */}
      {tab === 'gst' && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl cursor-pointer select-none">
            <input type="checkbox" checked={form.gstApplicable} onChange={e => set('gstApplicable', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
            <div>
              <div className="text-sm font-semibold text-gray-800">GST Applicable</div>
              <div className="text-xs text-gray-500">Enable for party / tax ledgers with GST registration</div>
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {lbl('GSTIN / UIN')}
              <input value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5" maxLength={15}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              {lbl('Registration Type')}
              <select value={form.gstType} onChange={e => set('gstType', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                {GST_TYPES.map(t => <option key={t} value={t}>{t || '— None —'}</option>)}
              </select>
            </div>
            <div>
              {lbl('Tax Rate %')}
              <input type="number" step="0.01" value={form.taxRate} onChange={e => set('taxRate', +e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              <p className="text-xs text-gray-400 mt-1">For tax ledgers (CGST, SGST, etc.) — set the rate here</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTACT ── */}
      {tab === 'contact' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">{lbl('Address')}<textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]" /></div>
          {[
            { k: 'city',    l: 'City'       },
            { k: 'state',   l: 'State'      },
            { k: 'pincode', l: 'Pincode'    },
            { k: 'country', l: 'Country'    },
            { k: 'phone',   l: 'Phone'      },
            { k: 'email',   l: 'Email',   t: 'email' },
            { k: 'website', l: 'Website'    },
          ].map(({ k, l, t }) => (
            <div key={k}>{lbl(l)}{inp(k, { type: t || 'text' })}</div>
          ))}
        </div>
      )}

      {/* ── BANKING ── */}
      {tab === 'banking' && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
            Fill bank details for bank ledgers (under <strong>Bank Accounts</strong> group) to enable cheque printing and reconciliation.
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { k: 'bankName',  l: 'Bank Name'      },
              { k: 'branch',    l: 'Branch'         },
              { k: 'accountNo', l: 'Account Number' },
              { k: 'ifscCode',  l: 'IFSC Code'      },
              { k: 'micrCode',  l: 'MICR Code'      },
            ].map(({ k, l }) => (
              <div key={k}>{lbl(l)}{inp(k)}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATUTORY ── */}
      {tab === 'statutory' && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl cursor-pointer select-none">
            <input type="checkbox" checked={form.tdsApplicable} onChange={e => set('tdsApplicable', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <div>
              <div className="text-sm font-semibold text-gray-800">TDS Applicable</div>
              <div className="text-xs text-gray-500">Enable TDS deduction when using this ledger in vouchers</div>
            </div>
          </label>
          {form.tdsApplicable && (
            <div>
              {lbl('TDS Section')}
              <input value={form.tdsSection} onChange={e => set('tdsSection', e.target.value)}
                placeholder="e.g. 194C, 194J"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
            More statutory settings (PF, ESI, Professional Tax) are configured in the Payroll module.
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   VIEW PANEL — full ledger details + mini statement
═══════════════════════════════════════════════════ */
function LedgerDetailPanel({ ledgerId, companyId, onEdit, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ledgerId || !companyId) return;
    setLoading(true);
    api.get(`/companies/${companyId}/ledgers/${ledgerId}`)
      .then(r => setDetail(r.data.data))
      .finally(() => setLoading(false));
  }, [ledgerId, companyId]);

  if (loading) return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#003087]/20 border-t-[#003087] rounded-full animate-spin" />
    </div>
  );
  if (!detail) return null;

  const typeColor = NATURE_COLORS[detail.group?.nature] || 'bg-gray-100 text-gray-700';
  const balColor  = detail.currentBalanceType === 'Dr' ? 'text-red-600' : 'text-green-600';

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  ) : null;

  const txnColor = { Sales:'bg-green-100 text-green-700', Purchase:'bg-blue-100 text-blue-700', Payment:'bg-red-100 text-red-700', Receipt:'bg-yellow-100 text-yellow-700', Journal:'bg-gray-100 text-gray-600', Contra:'bg-purple-100 text-purple-700' };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#003087] px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-blue-200 mb-1 flex items-center gap-1">
                <FiBookOpen size={11} /> {detail.group?.name}
              </div>
              <h2 className="text-xl font-bold">{detail.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor}`}>
                  {detail.group?.nature}
                </span>
                {!detail.isActive && (
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold">Inactive</span>
                )}
                {detail.isDefault && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Default</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-extrabold ${detail.currentBalance ? (detail.currentBalanceType === 'Dr' ? 'text-red-300' : 'text-green-300') : 'text-white'}`}>
                {fmt(detail.currentBalance)}
              </div>
              <div className="text-blue-200 text-xs mt-0.5">{detail.currentBalanceType} Balance</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Action bar */}
          <div className="flex gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003087] border border-[#003087] rounded-lg hover:bg-blue-50">
              <FiEdit2 size={12} /> Edit
            </button>
            <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <FiX size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-6">
            {/* Opening balance */}
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Balance</div>
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400">Opening Balance</div>
                  <div className="text-sm font-semibold text-gray-800">{fmt(detail.openingBalance)} {detail.openingBalanceType}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Current Balance</div>
                  <div className={`text-sm font-bold ${balColor}`}>{fmt(detail.currentBalance)} {detail.currentBalanceType}</div>
                </div>
              </div>
            </div>

            {/* GST */}
            {(detail.gstin || detail.gstApplicable) && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">GST Details</div>
                <InfoRow label="GSTIN"             value={detail.gstin} />
                <InfoRow label="GST Type"          value={detail.gstType} />
                <InfoRow label="Tax Rate"          value={detail.taxRate ? `${detail.taxRate}%` : null} />
                <InfoRow label="GST Applicable"    value={detail.gstApplicable ? 'Yes' : null} />
              </div>
            )}

            {/* Contact */}
            {(detail.phone || detail.email || detail.address) && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Contact</div>
                <InfoRow label="Address"  value={[detail.address, detail.city, detail.state, detail.pincode].filter(Boolean).join(', ')} />
                <InfoRow label="Phone"    value={detail.phone} />
                <InfoRow label="Email"    value={detail.email} />
                <InfoRow label="Website"  value={detail.website} />
              </div>
            )}

            {/* Credit terms */}
            {(detail.creditLimit > 0 || detail.creditDays > 0) && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Credit Terms</div>
                <InfoRow label="Credit Limit" value={detail.creditLimit ? fmt(detail.creditLimit) : null} />
                <InfoRow label="Credit Days"  value={detail.creditDays ? `${detail.creditDays} days` : null} />
                <InfoRow label="Bill-by-Bill" value={detail.billByBill ? 'Yes' : null} />
              </div>
            )}

            {/* Bank */}
            {detail.bankName && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Banking</div>
                <InfoRow label="Bank"       value={detail.bankName} />
                <InfoRow label="Branch"     value={detail.branch} />
                <InfoRow label="Account No" value={detail.accountNo} />
                <InfoRow label="IFSC"       value={detail.ifscCode} />
                <InfoRow label="MICR"       value={detail.micrCode} />
              </div>
            )}

            {/* Notes */}
            {detail.notes && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Notes</div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{detail.notes}</p>
              </div>
            )}

            {/* Mini statement */}
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Recent Transactions</div>
              {detail.transactions?.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No transactions yet</div>
              ) : (
                <div className="space-y-1">
                  {(detail.transactions || []).slice(0, 8).map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${txnColor[t.voucherType] || 'bg-gray-100 text-gray-600'}`}>
                          {t.voucherType?.slice(0, 3)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{t.voucherNo}</div>
                          <div className="text-xs text-gray-400">{fmtDate(t.date)}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className={`text-xs font-semibold ${t.debit ? 'text-red-600' : 'text-green-600'}`}>
                          {t.debit ? `Dr ${fmt(t.debit)}` : `Cr ${fmt(t.credit)}`}
                        </div>
                        <div className="text-xs text-gray-400">{fmt(t.balance)} {t.balanceType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN — Ledgers page
═══════════════════════════════════════════════════ */
export default function Ledgers() {
  const { company }  = useCompany();
  const [ledgers, setLedgers]     = useState([]);
  const [groups,  setGroups]      = useState([]);
  const [loading, setLoading]     = useState(true);
  const [withBal, setWithBal]     = useState(false);
  const [loadingBal, setLoadingBal] = useState(false);

  // Filters
  const [search,    setSearch]    = useState('');
  const [natureTab, setNatureTab] = useState('All');
  const [groupFilter, setGroupFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive

  // Modal state
  const [modal,   setModal]   = useState(false);          // create/edit
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  // View panel
  const [viewId, setViewId] = useState(null);

  const cid = company?._id;

  /* ── load ── */
  const load = useCallback((bal = withBal) => {
    if (!cid) return;
    setLoading(true);
    const q = bal ? '?withBalance=true' : '';
    Promise.all([
      api.get(`/companies/${cid}/ledgers${q}`),
      api.get(`/companies/${cid}/groups`),
    ]).then(([lr, gr]) => {
      setLedgers(lr.data.data || []);
      setGroups(gr.data.data  || []);
    }).finally(() => setLoading(false));
  }, [cid, withBal]);

  useEffect(() => { load(); }, [load]);

  const loadBalances = () => {
    if (!cid) return;
    setLoadingBal(true);
    api.get(`/companies/${cid}/ledgers?withBalance=true`)
      .then(r => { setLedgers(r.data.data || []); setWithBal(true); })
      .finally(() => setLoadingBal(false));
  };

  /* ── filter ── */
  const filtered = ledgers.filter(l => {
    if (natureTab !== 'All' && l.group?.nature !== natureTab) return false;
    if (groupFilter && l.group?._id !== groupFilter) return false;
    if (activeFilter === 'active'   && !l.isActive)  return false;
    if (activeFilter === 'inactive' &&  l.isActive)  return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) ||
             l.group?.name?.toLowerCase().includes(q) ||
             l.gstin?.toLowerCase().includes(q) ||
             l.phone?.includes(q) || l.email?.toLowerCase().includes(q);
    }
    return true;
  });

  /* ── CRUD ── */
  const openAdd = () => {
    setEditing(null); setForm(EMPTY); setErr(''); setModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name, group: r.group?._id || r.group, isActive: r.isActive,
      openingBalance: r.openingBalance, openingBalanceType: r.openingBalanceType,
      gstApplicable: r.gstApplicable, gstin: r.gstin || '', gstType: r.gstType || '',
      address: r.address || '', city: r.city || '', state: r.state || '',
      pincode: r.pincode || '', country: r.country || 'India',
      phone: r.phone || '', email: r.email || '', website: r.website || '',
      creditLimit: r.creditLimit || 0, creditDays: r.creditDays || 0, billByBill: r.billByBill || false,
      bankName: r.bankName || '', accountNo: r.accountNo || '', ifscCode: r.ifscCode || '',
      branch: r.branch || '', micrCode: r.micrCode || '',
      taxRate: r.taxRate || 0, tdsApplicable: r.tdsApplicable || false, tdsSection: r.tdsSection || '',
      notes: r.notes || '',
    });
    setErr(''); setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const url = editing
        ? `/companies/${cid}/ledgers/${editing._id}`
        : `/companies/${cid}/ledgers`;
      const res = await api[editing ? 'put' : 'post'](url, form);
      const saved = res.data.data;
      if (editing) setLedgers(ls => ls.map(l => l._id === saved._id ? saved : l));
      else         setLedgers(ls => [...ls, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setModal(false);
    } catch (e) { setErr(e.response?.data?.message || 'Error saving ledger'); }
    finally { setSaving(false); }
  };

  const del = async (r) => {
    if (!confirm(`Delete ledger "${r.name}"?`)) return;
    try {
      await api.delete(`/companies/${cid}/ledgers/${r._id}`);
      setLedgers(ls => ls.filter(l => l._id !== r._id));
    } catch (e) { alert(e.response?.data?.message || 'Cannot delete ledger'); }
  };

  const duplicate = async (r) => {
    const name = prompt('Name for duplicate ledger:', `${r.name} (Copy)`);
    if (!name) return;
    try {
      const { data } = await api.post(`/companies/${cid}/ledgers`, {
        ...form, name,
        group: r.group?._id || r.group,
        openingBalance: 0, openingBalanceType: 'Dr',
      });
      setLedgers(ls => [...ls, data.data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { alert(e.response?.data?.message || 'Error duplicating'); }
  };

  const toggleActive = async (r) => {
    try {
      const { data } = await api.patch(`/companies/${cid}/ledgers/${r._id}/toggle-active`);
      setLedgers(ls => ls.map(l => l._id === r._id ? { ...l, isActive: data.data.isActive } : l));
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  /* ── Export CSV ── */
  const exportCSV = () => {
    const headers = ['Name', 'Group', 'Nature', 'Opening Balance', 'Dr/Cr', 'GSTIN', 'Phone', 'Email', 'Current Balance', 'Balance Type', 'Active'];
    const rows    = filtered.map(l => [
      l.name, l.group?.name, l.group?.nature, l.openingBalance, l.openingBalanceType,
      l.gstin || '', l.phone || '', l.email || '',
      l.currentBalance ?? '', l.currentBalanceType ?? '', l.isActive ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `ledgers-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  /* ── computed stats ── */
  const stats = {
    total:    ledgers.length,
    active:   ledgers.filter(l => l.isActive).length,
    assets:   ledgers.filter(l => l.group?.nature === 'Assets').length,
    liab:     ledgers.filter(l => l.group?.nature === 'Liabilities').length,
    income:   ledgers.filter(l => l.group?.nature === 'Income').length,
    expenses: ledgers.filter(l => l.group?.nature === 'Expenses').length,
  };

  /* ── render ── */
  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total',       val: stats.total,    color: 'text-[#003087]' },
          { label: 'Active',      val: stats.active,   color: 'text-green-600' },
          { label: 'Assets',      val: stats.assets,   color: 'text-emerald-600' },
          { label: 'Liabilities', val: stats.liab,     color: 'text-red-600' },
          { label: 'Income',      val: stats.income,   color: 'text-blue-600' },
          { label: 'Expenses',    val: stats.expenses, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, group, GSTIN, phone, email…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX size={14} /></button>}
          </div>

          {/* Group filter */}
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="">All Groups</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>

          {/* Active filter */}
          <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={loadBalances} disabled={loadingBal}
              title="Load live balances"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              <FiRefreshCw size={13} className={loadingBal ? 'animate-spin' : ''} />
              {withBal ? 'Refresh' : 'Load Balances'}
            </button>
            <button onClick={exportCSV} title="Export CSV"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              <FiDownload size={13} /> Export
            </button>
            <button onClick={() => window.print()} title="Print"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              <FiPrinter size={13} /> Print
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shadow-sm">
              <FiPlus size={14} /> New Ledger
            </button>
          </div>
        </div>

        {/* ── Nature tabs ── */}
        <div className="flex gap-0 border-b border-gray-100 px-4 overflow-x-auto">
          {NATURE_TABS.map(n => (
            <button key={n} onClick={() => setNatureTab(n)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                natureTab === n
                  ? 'border-[#003087] text-[#003087]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {n}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${natureTab === n ? 'bg-blue-100 text-[#003087]' : 'bg-gray-100 text-gray-500'}`}>
                {n === 'All' ? ledgers.length : ledgers.filter(l => l.group?.nature === n).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-[#003087] rounded-full animate-spin" />
              Loading ledgers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">📒</div>
              <p className="text-sm">{search || natureTab !== 'All' ? 'No ledgers match your filters' : 'No ledgers yet — create your first one'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ledger Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nature</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Opening Bal</th>
                  {withBal && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Current Bal</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">GSTIN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((l, i) => (
                  <tr key={l._id} className={`group hover:bg-blue-50/30 transition-colors ${!l.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewId(l._id)}
                        className="font-semibold text-gray-900 hover:text-[#003087] text-left flex items-center gap-1 group/name">
                        {l.name}
                        <FiChevronRight size={13} className="opacity-0 group-hover/name:opacity-100 text-[#003087]" />
                      </button>
                      {l.notes && <div className="text-xs text-gray-400 truncate max-w-xs">{l.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{l.group?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {l.group?.nature && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${NATURE_COLORS[l.group.nature] || 'bg-gray-100 text-gray-600'}`}>
                          {l.group.nature}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                      {l.openingBalance ? `${fmt(l.openingBalance)} ${l.openingBalanceType}` : '—'}
                    </td>
                    {withBal && (
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                        {l.currentBalance != null ? (
                          <span className={l.currentBalanceType === 'Dr' ? 'text-red-600' : 'text-green-600'}>
                            {fmt(l.currentBalance)} {l.currentBalanceType}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{l.gstin || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {l.phone && <div>{l.phone}</div>}
                      {l.email && <div className="truncate max-w-32">{l.email}</div>}
                      {!l.phone && !l.email && '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {l.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewId(l._id)}   title="View details" className="p-1.5 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg"><FiEye size={14} /></button>
                        <button onClick={() => openEdit(l)}        title="Edit"         className="p-1.5 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg"><FiEdit2 size={14} /></button>
                        <button onClick={() => duplicate(l)}       title="Duplicate"    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><FiCopy size={14} /></button>
                        <button onClick={() => toggleActive(l)}    title={l.isActive ? 'Deactivate' : 'Activate'} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                          {l.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                        </button>
                        {!l.isDefault && (
                          <button onClick={() => del(l)}           title="Delete"       className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filtered.length} of {ledgers.length} ledgers</span>
          {!withBal && <span>Click <strong>Load Balances</strong> to see live Dr/Cr balances</span>}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal isOpen={modal} onClose={() => setModal(false)}
        title={editing ? `Edit Ledger — ${editing.name}` : 'Create New Ledger'} size="lg">
        <form onSubmit={save}>
          <LedgerForm form={form} setForm={setForm} groups={groups} err={err} />
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 mt-5">
            <button type="button" onClick={() => setModal(false)}
              className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update Ledger' : 'Create Ledger'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Detail slide-in panel ── */}
      {viewId && (
        <LedgerDetailPanel
          ledgerId={viewId}
          companyId={cid}
          onEdit={() => {
            const l = ledgers.find(x => x._id === viewId);
            if (l) { setViewId(null); openEdit(l); }
          }}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  );
}
