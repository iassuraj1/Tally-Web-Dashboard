import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import api from '../../utils/api';
import Modal from '../../components/app/Modal';
import { FiPlus, FiCheck, FiBriefcase, FiEdit2 } from 'react-icons/fi';

const emptyForm = { name: '', legalName: '', gstin: '', pan: '', address: '', city: '', state: '', pincode: '', phone: '', email: '' };

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const { company, setCompany }   = useCompany();
  const navigate                  = useNavigate();

  const load = () => {
    api.get('/companies').then(r => setCompanies(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, legalName: c.legalName || '', gstin: c.gstin || '', pan: c.pan || '', address: c.address || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', phone: c.phone || '', email: c.email || '' }); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/companies/${editing._id}`, form);
      else          await api.post('/companies', form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving company');
    } finally { setSaving(false); }
  };

  const select = (c) => { setCompany(c); navigate('/app'); };

  const fields = [
    { name: 'name',      label: 'Company Name *',   required: true },
    { name: 'legalName', label: 'Legal Name'        },
    { name: 'gstin',     label: 'GSTIN'             },
    { name: 'pan',       label: 'PAN'               },
    { name: 'address',   label: 'Address'           },
    { name: 'city',      label: 'City'              },
    { name: 'state',     label: 'State'             },
    { name: 'pincode',   label: 'Pincode'           },
    { name: 'phone',     label: 'Phone'             },
    { name: 'email',     label: 'Email'             },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">My Companies</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800">
          <FiPlus size={16} /> New Company
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No companies yet</h3>
          <p className="text-gray-500 mb-6">Create your first company to start managing your books.</p>
          <button onClick={openAdd} className="px-6 py-3 bg-[#003087] text-white font-semibold rounded-xl">Create Company</button>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c._id} className={`bg-white rounded-2xl border-2 p-5 flex items-center justify-between transition-all ${company?._id === c._id ? 'border-[#003087]' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {c.name[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{c.name}</div>
                  {c.gstin && <div className="text-xs text-gray-400">GSTIN: {c.gstin}</div>}
                  {c.city  && <div className="text-xs text-gray-400">{c.city}{c.state ? `, ${c.state}` : ''}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg"><FiEdit2 size={15} /></button>
                <button
                  onClick={() => select(c)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    company?._id === c._id ? 'bg-green-100 text-green-700' : 'bg-[#003087] text-white hover:bg-blue-800'
                  }`}
                >
                  {company?._id === c._id ? <><FiCheck size={14} /> Active</> : 'Select'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Company' : 'Create New Company'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type="text" value={form[f.name]} required={f.required}
                  onChange={(e) => setForm(x => ({ ...x, [f.name]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl hover:bg-blue-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create Company'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
