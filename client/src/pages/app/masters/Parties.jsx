import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import Modal from '../../../components/app/Modal';
import CollaborationPanel from '../../../components/app/CollaborationPanel';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiTruck, FiRefreshCw,
  FiUpload, FiX, FiBriefcase, FiMail, FiPhone, FiMapPin, FiCreditCard,
  FiUsers, FiTag, FiFileText, FiPaperclip, FiSave,
} from 'react-icons/fi';
import { GST_STATES, getGstStateFromGstin } from '../../../data/gstStates';

const GST_TREATMENTS = [
  { value: '', label: 'Not set' },
  { value: 'registered', label: 'Registered business' },
  { value: 'composition', label: 'Composition dealer' },
  { value: 'unregistered', label: 'Unregistered business' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'overseas', label: 'Overseas' },
];

const SALUTATIONS = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.'];
const LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const PAYMENT_TERMS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65'];
const PARTY_TABS = [
  { id: 'tax', label: 'Accounts', icon: FiCreditCard },
  { id: 'address', label: 'Address', icon: FiMapPin },
  { id: 'people', label: 'Contacts', icon: FiUsers },
  { id: 'fields', label: 'Fields', icon: FiFileText },
  { id: 'tags', label: 'Tags', icon: FiTag },
  { id: 'remarks', label: 'Remarks', icon: FiFileText },
  { id: 'documents', label: 'Documents', icon: FiPaperclip },
];

const toBase64 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const emptyParty = (type) => ({
  partyType: type,
  customerType: 'business',
  salutation: '',
  firstName: '',
  lastName: '',
  companyName: '',
  partyCode: '',
  name: '',
  group: '',
  openingBalance: 0,
  openingBalanceType: type === 'vendor' ? 'Cr' : 'Dr',
  billingAddress: '',
  shippingAddress: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  workPhoneCountryCode: '+91',
  mobileCountryCode: '+91',
  phone: '',
  mobile: '',
  email: '',
  website: '',
  language: 'English',
  pan: '',
  currency: 'INR',
  receivableAccount: '',
  payableAccount: '',
  portalAccess: false,
  gstApplicable: false,
  gstin: '',
  gstType: '',
  gstTreatment: '',
  creditLimit: 0,
  creditDays: 0,
  paymentTerms: '',
  contactPersons: [{ name: '', designation: '', phone: '', email: '' }],
  customFields: [{ label: '', value: '' }],
  reportingTags: [{ label: '', value: '' }],
  remarks: '',
  isActive: true,
});

const fmtMoney = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function PartyForm({ form, setForm, groups, type, error, pendingDocuments, setPendingDocuments }) {
  const [tab, setTab] = useState('tax');
  const debtorGroup = groups.find((g) => g.name === 'Sundry Debtors');
  const creditorGroup = groups.find((g) => g.name === 'Sundry Creditors');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const defaultGroup = type === 'vendor' ? creditorGroup?._id : debtorGroup?._id;
  const isVendor = type === 'vendor';
  const partyLabel = isVendor ? 'Vendor' : 'Customer';
  const accountLabel = isVendor ? 'Payable Account' : 'Receivable Account';
  const PartyIcon = isVendor ? FiTruck : FiUser;
  const activeTone = isVendor ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-blue-50 text-[#003087] ring-blue-100';
  const isIndividual = form.customerType === 'individual';
  const displayTitle = form.name || form.companyName || [form.firstName, form.lastName].filter(Boolean).join(' ') || `New ${partyLabel}`;

  const inputClass = 'w-full h-11 px-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-blue-100';
  const textareaClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-blue-100';
  const selectClass = `${inputClass} bg-white`;
  const label = (text, required) => (
    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const displaySuggestions = useMemo(() => {
    const fullName = [form.salutation, form.firstName, form.lastName].filter(Boolean).join(' ').trim();
    return [...new Set([form.companyName, fullName, form.email].filter(Boolean))];
  }, [form.companyName, form.email, form.firstName, form.lastName, form.salutation]);

  const applyIdentityValue = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'companyName' && f.customerType === 'business' && !f.name) next.name = value;
      if (['salutation', 'firstName', 'lastName'].includes(key) && f.customerType === 'individual') {
        const fullName = [
          key === 'salutation' ? value : f.salutation,
          key === 'firstName' ? value : f.firstName,
          key === 'lastName' ? value : f.lastName,
        ].filter(Boolean).join(' ').trim();
        if (!f.name || f.name === f.companyName) next.name = fullName;
      }
      return next;
    });
  };

  const applyGstin = () => {
    const gstin = String(form.gstin || '').trim().toUpperCase();
    if (!gstin) return;
    const state = getGstStateFromGstin(gstin)?.name || form.state;
    setForm((f) => ({
      ...f,
      gstin,
      gstApplicable: true,
      gstTreatment: f.gstTreatment || 'registered',
      gstType: f.gstType || 'Regular',
      state,
      pan: f.pan || gstin.slice(2, 12),
    }));
  };

  const addRow = (key, row) => setForm((f) => ({ ...f, [key]: [...(f[key] || []), row] }));
  const removeRow = (key, index) => setForm((f) => ({ ...f, [key]: (f[key] || []).filter((_, rowIndex) => rowIndex !== index) }));
  const updateRow = (key, index, field, value) => {
    setForm((f) => {
      const rows = [...(f[key] || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...f, [key]: rows };
    });
  };

  const updateContact = (index, key, value) => {
    setForm((f) => {
      const contactPersons = [...(f.contactPersons || [])];
      contactPersons[index] = { ...contactPersons[index], [key]: value };
      return { ...f, contactPersons };
    });
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[260px,1fr]">
          <div className="border-b border-gray-100 bg-gray-50/80 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${activeTone}`}>
                <PartyIcon size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{partyLabel} Ledger</div>
                <div className="truncate text-lg font-bold text-gray-950">{displayTitle}</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-1">
              {[
                { id: 'business', label: 'Business', icon: FiBriefcase },
                { id: 'individual', label: 'Individual', icon: FiUser },
              ].map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => set('customerType', option.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      form.customerType === option.id ? 'bg-[#003087] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <OptionIcon size={14} /> {option.label}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700">
              <span>Active Ledger</span>
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#003087] focus:ring-[#003087]" />
            </label>
          </div>

          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                {label(`${partyLabel} Code`)}
                <input value={form.partyCode} onChange={(e) => set('partyCode', e.target.value.toUpperCase())} className={inputClass} placeholder={isVendor ? 'VEN-001' : 'CUS-001'} />
              </div>

              {isIndividual ? (
                <>
                  <div className="md:col-span-2">
                    {label('Salutation')}
                    <select value={form.salutation} onChange={(e) => applyIdentityValue('salutation', e.target.value)} className={selectClass}>
                      {SALUTATIONS.map((value) => <option key={value} value={value}>{value || 'None'}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    {label('First Name')}
                    <input value={form.firstName} onChange={(e) => applyIdentityValue('firstName', e.target.value)} className={inputClass} />
                  </div>
                  <div className="md:col-span-4">
                    {label('Last Name')}
                    <input value={form.lastName} onChange={(e) => applyIdentityValue('lastName', e.target.value)} className={inputClass} />
                  </div>
                </>
              ) : (
                <div className="md:col-span-4">
                  {label('Company Name')}
                  <input value={form.companyName} onChange={(e) => applyIdentityValue('companyName', e.target.value)} className={inputClass} />
                </div>
              )}

              <div className={isIndividual ? 'md:col-span-12' : 'md:col-span-5'}>
                {label('Display Name', true)}
                <input required list="party-display-name-options" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="Select or type a display name" />
                <datalist id="party-display-name-options">
                  {displaySuggestions.map((value) => <option key={value} value={value} />)}
                </datalist>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              {label('Email Address')}
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={`${inputClass} pl-9`} />
              </div>
            </div>
            <div>
              {label('Work Phone')}
              <div className="flex">
                <select value={form.workPhoneCountryCode} onChange={(e) => set('workPhoneCountryCode', e.target.value)} className="h-11 w-20 rounded-l-xl border border-r-0 border-gray-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {COUNTRY_CODES.map((code) => <option key={code}>{code}</option>)}
                </select>
                <div className="relative min-w-0 flex-1">
                  <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={`${inputClass} rounded-l-none pl-9`} />
                </div>
              </div>
            </div>
            <div>
              {label('Mobile')}
              <div className="flex">
                <select value={form.mobileCountryCode} onChange={(e) => set('mobileCountryCode', e.target.value)} className="h-11 w-20 rounded-l-xl border border-r-0 border-gray-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  {COUNTRY_CODES.map((code) => <option key={code}>{code}</option>)}
                </select>
                <div className="relative min-w-0 flex-1">
                  <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} className={`${inputClass} rounded-l-none pl-9`} />
                </div>
              </div>
            </div>
            <div>
              {label(`${partyLabel} Language`)}
              <select value={form.language} onChange={(e) => set('language', e.target.value)} className={selectClass}>
                {LANGUAGES.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          {PARTY_TABS.map((item) => {
            const TabIcon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  tab === item.id ? 'bg-[#003087] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <TabIcon size={15} /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {tab === 'tax' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            {label('PAN')}
            <input value={form.pan || ''} maxLength={10} onChange={(e) => set('pan', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} />
          </div>
          <div>
            {label('GST Treatment')}
            <select value={form.gstTreatment} onChange={(e) => set('gstTreatment', e.target.value)} className={selectClass}>
              {GST_TREATMENTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            {label('GSTIN')}
            <div className="flex gap-2">
              <input value={form.gstin} maxLength={15} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} />
              <button type="button" onClick={applyGstin} className="px-3 rounded-lg border border-[#003087] text-xs font-semibold text-[#003087]">Apply</button>
            </div>
          </div>
          <div>
            {label('Currency')}
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={selectClass}>
              {CURRENCIES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div>
            {label(accountLabel, true)}
            <select required value={form.group || defaultGroup || ''} onChange={(e) => set('group', e.target.value)} className={selectClass}>
              <option value="">Select account</option>
              {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            {label('Opening Balance')}
            <div className="flex gap-2">
              <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => set('openingBalance', +e.target.value)} className={inputClass} />
              <select value={form.openingBalanceType} onChange={(e) => set('openingBalanceType', e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>
          <div>
            {label('Payment Terms')}
            <select value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className={selectClass}>
              <option value="">Select terms</option>
              {PAYMENT_TERMS.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div>{label('Credit Limit')}<input type="number" step="0.01" value={form.creditLimit} onChange={(e) => set('creditLimit', +e.target.value)} className={inputClass} /></div>
          <div>{label('Credit Days')}<input type="number" step="1" value={form.creditDays} onChange={(e) => set('creditDays', +e.target.value)} className={inputClass} /></div>
          <label className="md:col-span-3 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={Boolean(form.portalAccess)} onChange={(e) => set('portalAccess', e.target.checked)} />
            Allow portal access for this {partyLabel.toLowerCase()}
          </label>
        </div>
      )}

      {tab === 'address' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            {label('Billing Address')}
              <textarea rows={4} value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} className={textareaClass} />
          </div>
          <div>
            {label('Shipping Address')}
              <textarea rows={4} value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} className={textareaClass} />
          </div>
          {['city', 'state', 'pincode', 'country', 'website'].map((key) => (
            <div key={key}>
              {label(key === 'state' ? 'State / UT' : key === 'pincode' ? 'Pincode' : key[0].toUpperCase() + key.slice(1))}
              {key === 'state' ? (
                <select value={form.state || ''} onChange={(e) => set('state', e.target.value)} className={selectClass}>
                  <option value="">Select state / UT</option>
                  {GST_STATES.map((state) => (
                    <option key={state.code} value={state.name}>{state.code} - {state.name}</option>
                  ))}
                </select>
              ) : (
                <input value={form[key] || ''} onChange={(e) => set(key, e.target.value)} className={inputClass} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'people' && (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">Contact Persons</div>
            <button type="button" onClick={() => addRow('contactPersons', { name: '', designation: '', phone: '', email: '' })} className="text-xs text-[#003087] font-semibold">Add contact</button>
          </div>
          <div className="divide-y divide-gray-50">
            {(form.contactPersons || []).map((person, index) => (
              <div key={index} className="grid md:grid-cols-[1fr,1fr,1fr,1fr,auto] gap-3 p-4">
                {['name', 'designation', 'phone', 'email'].map((key) => (
                  <input key={key} value={person[key] || ''} onChange={(e) => updateContact(index, key, e.target.value)} className={inputClass} placeholder={key[0].toUpperCase() + key.slice(1)} />
                ))}
                <button type="button" onClick={() => removeRow('contactPersons', index)} className="p-2 text-gray-400 hover:text-red-600"><FiX size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'fields' && (
        <div className="space-y-3">
          {(form.customFields || []).map((field, index) => (
            <div key={index} className="grid md:grid-cols-[1fr,1fr,auto] gap-3">
              <input value={field.label || ''} onChange={(e) => updateRow('customFields', index, 'label', e.target.value)} className={inputClass} placeholder="Field name" />
              <input value={field.value || ''} onChange={(e) => updateRow('customFields', index, 'value', e.target.value)} className={inputClass} placeholder="Value" />
              <button type="button" onClick={() => removeRow('customFields', index)} className="p-2 text-gray-400 hover:text-red-600"><FiX size={15} /></button>
            </div>
          ))}
          <button type="button" onClick={() => addRow('customFields', { label: '', value: '' })} className="text-xs font-semibold text-[#003087]">Add custom field</button>
        </div>
      )}

      {tab === 'tags' && (
        <div className="space-y-3">
          {(form.reportingTags || []).map((tag, index) => (
            <div key={index} className="grid md:grid-cols-[1fr,1fr,auto] gap-3">
              <input value={tag.label || ''} onChange={(e) => updateRow('reportingTags', index, 'label', e.target.value)} className={inputClass} placeholder="Tag group" />
              <input value={tag.value || ''} onChange={(e) => updateRow('reportingTags', index, 'value', e.target.value)} className={inputClass} placeholder="Tag value" />
              <button type="button" onClick={() => removeRow('reportingTags', index)} className="p-2 text-gray-400 hover:text-red-600"><FiX size={15} /></button>
            </div>
          ))}
          <button type="button" onClick={() => addRow('reportingTags', { label: '', value: '' })} className="text-xs font-semibold text-[#003087]">Add reporting tag</button>
        </div>
      )}

      {tab === 'remarks' && (
        <div>
          {label('Remarks')}
          <textarea rows={5} value={form.remarks || ''} onChange={(e) => set('remarks', e.target.value)} className={textareaClass} />
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            <FiUpload size={16} /> Upload File
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files || [])];
                setPendingDocuments((rows) => [...rows, ...files]);
                e.target.value = '';
              }}
            />
          </label>
          <div className="space-y-2">
            {pendingDocuments.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => setPendingDocuments((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-gray-400 hover:text-red-600"><FiX size={15} /></button>
              </div>
            ))}
            {pendingDocuments.length === 0 && <div className="text-sm text-gray-400">No files selected</div>}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function Parties({ type = 'customer' }) {
  const { company } = useCompany();
  const [parties, setParties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyParty(type));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState([]);

  const title = type === 'vendor' ? 'Vendors' : 'Customers';
  const cid = company?._id;

  const load = useCallback(() => {
    if (!cid) return;
    setLoading(true);
    Promise.all([
      api.get(`/companies/${cid}/ledgers?partyType=${type}&withBalance=true`),
      api.get(`/companies/${cid}/groups`),
    ]).then(([partyRes, groupRes]) => {
      setParties(partyRes.data.data || []);
      setGroups(groupRes.data.data || []);
    }).finally(() => setLoading(false));
  }, [cid, type]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return parties.filter((p) => !q || [p.name, p.partyCode, p.gstin, p.phone, p.email].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [parties, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyParty(type));
    setPendingDocuments([]);
    setError('');
    setModal(true);
  };

  const openEdit = (party) => {
    setEditing(party);
    setForm({
      ...emptyParty(type),
      ...party,
      group: party.group?._id || party.group || '',
      contactPersons: party.contactPersons?.length ? party.contactPersons : [{ name: '', designation: '', phone: '', email: '' }],
      customFields: party.customFields?.length ? party.customFields : [{ label: '', value: '' }],
      reportingTags: party.reportingTags?.length ? party.reportingTags : [{ label: '', value: '' }],
      billingAddress: party.billingAddress || party.address || '',
    });
    setPendingDocuments([]);
    setError('');
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const defaultGroup = type === 'vendor'
        ? groups.find((g) => g.name === 'Sundry Creditors')?._id
        : groups.find((g) => g.name === 'Sundry Debtors')?._id;
      const body = {
        ...form,
        partyType: type,
        group: form.group || defaultGroup,
        address: form.billingAddress || form.address,
        gstApplicable: Boolean(form.gstin || form.gstTreatment),
        gstType: form.gstTreatment === 'registered' ? 'Regular' : form.gstTreatment === 'composition' ? 'Composition' : form.gstTreatment === 'overseas' ? 'Overseas' : form.gstTreatment ? 'Unregistered' : '',
        contactPersons: (form.contactPersons || []).filter((p) => p.name || p.phone || p.email),
        customFields: (form.customFields || []).filter((field) => field.label || field.value),
        reportingTags: (form.reportingTags || []).filter((tag) => tag.label || tag.value),
        receivableAccount: type === 'customer' ? (form.group || defaultGroup || null) : null,
        payableAccount: type === 'vendor' ? (form.group || defaultGroup || null) : null,
      };
      const res = editing
        ? await api.put(`/companies/${cid}/ledgers/${editing._id}`, body)
        : await api.post(`/companies/${cid}/ledgers`, body);
      const saved = res.data.data;
      let attachmentError = '';
      if (pendingDocuments.length) {
        try {
          await Promise.all(pendingDocuments.map(async (file) => api.post(`/companies/${cid}/collaboration/Ledger/${saved._id}/attachments`, {
            fileName: file.name,
            mimeType: file.type,
            fileData: await toBase64(file),
          })));
        } catch {
          attachmentError = 'Saved, but one or more documents could not be uploaded.';
        }
      }
      setParties((rows) => editing ? rows.map((r) => r._id === saved._id ? saved : r) : [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setPendingDocuments([]);
      setModal(false);
      if (attachmentError) alert(attachmentError);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save party');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (party) => {
    if (!confirm(`Delete ${party.name}?`)) return;
    await api.delete(`/companies/${cid}/ledgers/${party._id}`);
    setParties((rows) => rows.filter((r) => r._id !== party._id));
  };

  const Icon = type === 'vendor' ? FiTruck : FiUser;
  const totals = {
    count: parties.length,
    active: parties.filter((p) => p.isActive).length,
    balance: parties.reduce((sum, p) => sum + Number(p.currentBalance || 0), 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-lg p-4"><div className="text-xs text-gray-400">Total {title}</div><div className="text-2xl font-bold text-[#003087]">{totals.count}</div></div>
        <div className="bg-white border border-gray-100 rounded-lg p-4"><div className="text-xs text-gray-400">Active</div><div className="text-2xl font-bold text-green-600">{totals.active}</div></div>
        <div className="bg-white border border-gray-100 rounded-lg p-4"><div className="text-xs text-gray-400">Live Outstanding</div><div className="text-2xl font-bold text-gray-900">{fmtMoney(totals.balance)}</div></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-gray-900"><Icon size={18} /> {title}</div>
          <div className="relative ml-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-56" />
          </div>
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"><FiRefreshCw size={15} /></button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiPlus size={14} /> New {type === 'vendor' ? 'Vendor' : 'Customer'}</button>
        </div>

        <div className="overflow-x-auto">
          {loading ? <div className="py-16 text-center text-gray-400">Loading...</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{['Code', 'Name', 'GSTIN', 'Contact', 'Terms', 'Balance', 'Status', 'Actions'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((party) => (
                  <tr key={party._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{party.partyCode || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{party.name}<div className="text-xs text-gray-400">{party.group?.name}</div></td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{party.gstin || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{party.phone || '-'}<div>{party.email || ''}</div></td>
                    <td className="px-4 py-3 text-gray-500">{party.paymentTerms || `${party.creditDays || 0} days`}</td>
                    <td className="px-4 py-3 font-semibold">{party.currentBalance != null ? `${fmtMoney(party.currentBalance)} ${party.currentBalanceType}` : '-'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${party.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{party.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(party)} className="p-1.5 text-gray-400 hover:text-[#003087]"><FiEdit2 size={14} /></button>
                        {!party.isDefault && <button onClick={() => remove(party)} className="p-1.5 text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="py-14 text-center text-gray-400">No {title.toLowerCase()} found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit ${editing.name}` : `Create ${type === 'vendor' ? 'Vendor' : 'Customer'} Ledger`}
        size="xl"
      >
        <form onSubmit={save}>
          <PartyForm
            form={form}
            setForm={setForm}
            groups={groups}
            type={type}
            error={error}
            pendingDocuments={pendingDocuments}
            setPendingDocuments={setPendingDocuments}
          />
          <div className="sticky bottom-0 -mx-6 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
            <button type="button" onClick={() => setModal(false)} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#003087] px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60">
              <FiSave size={16} /> {saving ? 'Saving...' : editing ? `Update ${type === 'vendor' ? 'Vendor' : 'Customer'}` : `Create ${type === 'vendor' ? 'Vendor' : 'Customer'}`}
            </button>
          </div>
        </form>
        {editing && (
          <div className="mt-5">
            <CollaborationPanel entityType="Ledger" entityId={editing._id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
