import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import Modal from '../../../components/app/Modal';
import CollaborationPanel from '../../../components/app/CollaborationPanel';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiTruck, FiRefreshCw } from 'react-icons/fi';

const GST_TREATMENTS = [
  { value: '', label: 'Not set' },
  { value: 'registered', label: 'Registered business' },
  { value: 'composition', label: 'Composition dealer' },
  { value: 'unregistered', label: 'Unregistered business' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'overseas', label: 'Overseas' },
];

const emptyParty = (type) => ({
  partyType: type,
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
  phone: '',
  email: '',
  website: '',
  gstApplicable: false,
  gstin: '',
  gstType: '',
  gstTreatment: '',
  creditLimit: 0,
  creditDays: 0,
  paymentTerms: '',
  contactPersons: [{ name: '', designation: '', phone: '', email: '' }],
  isActive: true,
});

const fmtMoney = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function PartyForm({ form, setForm, groups, type, error }) {
  const debtorGroup = groups.find((g) => g.name === 'Sundry Debtors');
  const creditorGroup = groups.find((g) => g.name === 'Sundry Creditors');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const defaultGroup = type === 'vendor' ? creditorGroup?._id : debtorGroup?._id;

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]';
  const label = (text, required) => (
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const updateContact = (index, key, value) => {
    setForm((f) => {
      const contactPersons = [...(f.contactPersons || [])];
      contactPersons[index] = { ...contactPersons[index], [key]: value };
      return { ...f, contactPersons };
    });
  };

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          {label(`${type === 'vendor' ? 'Vendor' : 'Customer'} Code`)}
          <input value={form.partyCode} onChange={(e) => set('partyCode', e.target.value.toUpperCase())} className={inputClass} placeholder={type === 'vendor' ? 'VEN-001' : 'CUS-001'} />
        </div>
        <div className="md:col-span-2">
          {label('Display Name', true)}
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        </div>
        <div>
          {label('Ledger Group', true)}
          <select required value={form.group || defaultGroup || ''} onChange={(e) => set('group', e.target.value)} className={`${inputClass} bg-white`}>
            <option value="">Select group</option>
            {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          {label('Opening Balance')}
          <div className="flex gap-2">
            <input type="number" step="0.01" value={form.openingBalance} onChange={(e) => set('openingBalance', +e.target.value)} className={inputClass} />
            <select value={form.openingBalanceType} onChange={(e) => set('openingBalanceType', e.target.value)} className="px-3 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="Dr">Dr</option>
              <option value="Cr">Cr</option>
            </select>
          </div>
        </div>
        <div>
          {label('Payment Terms')}
          <input value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className={inputClass} placeholder="Net 15, Net 30, Due on receipt" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          {label('Billing Address')}
          <textarea rows={3} value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} className={inputClass} />
        </div>
        <div>
          {label('Shipping Address')}
          <textarea rows={3} value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} className={inputClass} />
        </div>
        {['city', 'state', 'pincode', 'country'].map((key) => (
          <div key={key}>
            {label(key === 'pincode' ? 'Pincode' : key[0].toUpperCase() + key.slice(1))}
            <input value={form[key] || ''} onChange={(e) => set(key, e.target.value)} className={inputClass} />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>{label('Phone')}<input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} /></div>
        <div>{label('Email')}<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} /></div>
        <div>{label('Website')}<input value={form.website} onChange={(e) => set('website', e.target.value)} className={inputClass} /></div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          {label('GST Treatment')}
          <select value={form.gstTreatment} onChange={(e) => set('gstTreatment', e.target.value)} className={`${inputClass} bg-white`}>
            {GST_TREATMENTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div>
          {label('GSTIN')}
          <input value={form.gstin} maxLength={15} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} />
        </div>
        <div>{label('Credit Limit')}<input type="number" step="0.01" value={form.creditLimit} onChange={(e) => set('creditLimit', +e.target.value)} className={inputClass} /></div>
        <div>{label('Credit Days')}<input type="number" step="1" value={form.creditDays} onChange={(e) => set('creditDays', +e.target.value)} className={inputClass} /></div>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">Contact Persons</div>
          <button type="button" onClick={() => setForm((f) => ({ ...f, contactPersons: [...(f.contactPersons || []), { name: '', designation: '', phone: '', email: '' }] }))} className="text-xs text-[#003087] font-semibold">Add contact</button>
        </div>
        <div className="divide-y divide-gray-50">
          {(form.contactPersons || []).map((person, index) => (
            <div key={index} className="grid md:grid-cols-4 gap-3 p-4">
              {['name', 'designation', 'phone', 'email'].map((key) => (
                <input key={key} value={person[key] || ''} onChange={(e) => updateContact(index, key, e.target.value)} className={inputClass} placeholder={key[0].toUpperCase() + key.slice(1)} />
              ))}
            </div>
          ))}
        </div>
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
      billingAddress: party.billingAddress || party.address || '',
    });
    setError('');
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        partyType: type,
        group: form.group || (type === 'vendor'
          ? groups.find((g) => g.name === 'Sundry Creditors')?._id
          : groups.find((g) => g.name === 'Sundry Debtors')?._id),
        address: form.billingAddress || form.address,
        gstApplicable: Boolean(form.gstin || form.gstTreatment),
        gstType: form.gstTreatment === 'registered' ? 'Regular' : form.gstTreatment === 'composition' ? 'Composition' : form.gstTreatment === 'overseas' ? 'Overseas' : form.gstTreatment ? 'Unregistered' : '',
        contactPersons: (form.contactPersons || []).filter((p) => p.name || p.phone || p.email),
      };
      const res = editing
        ? await api.put(`/companies/${cid}/ledgers/${editing._id}`, body)
        : await api.post(`/companies/${cid}/ledgers`, body);
      const saved = res.data.data;
      setParties((rows) => editing ? rows.map((r) => r._id === saved._id ? saved : r) : [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setModal(false);
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

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : `New ${type === 'vendor' ? 'Vendor' : 'Customer'}`} size="lg">
        <form onSubmit={save}>
          <PartyForm form={form} setForm={setForm} groups={groups} type={type} error={error} />
          {editing && (
            <div className="mt-5">
              <CollaborationPanel entityType="Ledger" entityId={editing._id} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
