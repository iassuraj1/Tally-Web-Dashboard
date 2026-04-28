import { useState } from 'react';
import useMaster from '../../../hooks/useMaster';
import DataTable from '../../../components/app/DataTable';
import Modal from '../../../components/app/Modal';

const empty = { name: '', empCode: '', designation: '', department: '', dateOfJoining: '', pan: '', aadhar: '', uan: '', esicNo: '', bankName: '', accountNo: '', ifsc: '', salaryMode: 'Monthly', ctc: 0, basic: 0, hra: 0, pfApplicable: true, esicApplicable: false, ptApplicable: false, phone: '', email: '', gender: 'Male' };

export default function Employees() {
  const { data, loading, create, update, remove } = useMaster('payroll/employees');
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const openAdd  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...empty, ...r, dateOfJoining: r.dateOfJoining?.split('T')[0] || '' }); setModal(true); };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await update(editing._id, form); else await create(form);
      setModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };
  const del = (r) => { if (confirm(`Delete employee "${r.name}"?`)) remove(r._id).catch(e => alert(e.response?.data?.message)); };

  const cols = [
    { key: 'empCode',     label: 'Code'        },
    { key: 'name',        label: 'Name',        render: v => <span className="font-medium">{v}</span> },
    { key: 'designation', label: 'Designation'  },
    { key: 'department',  label: 'Department'   },
    { key: 'ctc',         label: 'CTC',         render: v => v ? `₹${v.toLocaleString('en-IN')}` : '—' },
    { key: 'basic',       label: 'Basic',       render: v => v ? `₹${v.toLocaleString('en-IN')}` : '—' },
    { key: 'pfApplicable',label: 'PF',          render: v => v ? '✓' : '—' },
  ];

  const groups = [
    { label: 'Personal Details', fields: ['name','empCode','designation','department','gender','dateOfJoining','pan','aadhar','phone','email'] },
    { label: 'Salary',           fields: ['ctc','basic','hra','salaryMode'] },
    { label: 'Statutory',        fields: ['uan','esicNo'] },
    { label: 'Bank Details',     fields: ['bankName','accountNo','ifsc'] },
  ];

  const fldMeta = {
    name:{label:'Full Name *',required:true}, empCode:{label:'Employee Code'}, designation:{label:'Designation'},
    department:{label:'Department'}, gender:{label:'Gender',type:'select',options:['Male','Female','Other']},
    dateOfJoining:{label:'Date of Joining',type:'date'}, pan:{label:'PAN'}, aadhar:{label:'Aadhar'},
    phone:{label:'Phone'}, email:{label:'Email',type:'email'},
    ctc:{label:'CTC (Annual)',type:'number'}, basic:{label:'Basic (Monthly)',type:'number'}, hra:{label:'HRA (Monthly)',type:'number'},
    salaryMode:{label:'Salary Mode',type:'select',options:['Monthly','Daily','Weekly']},
    uan:{label:'UAN (PF)'}, esicNo:{label:'ESIC No'},
    bankName:{label:'Bank Name'}, accountNo:{label:'Account No'}, ifsc:{label:'IFSC Code'},
  };

  return (
    <>
      <DataTable title="Employees" columns={cols} data={data} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={del} addLabel="Add Employee" />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Employee' : 'New Employee'} size="lg">
        <form onSubmit={save} className="space-y-6">
          {groups.map(g => (
            <div key={g.label}>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{g.label}</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {g.fields.map(key => {
                  const m = fldMeta[key];
                  if (key === 'pfApplicable' || key === 'esicApplicable' || key === 'ptApplicable') {
                    return <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />{m?.label}</label>;
                  }
                  if (m?.type === 'select') {
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{m.label}</label>
                        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                          {m.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{m?.label}</label>
                      <input type={m?.type || 'text'} required={m?.required} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: m?.type === 'number' ? +e.target.value : e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">Statutory</div>
          <div className="flex gap-6">
            {['pfApplicable','esicApplicable','ptApplicable'].map(key => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                {key === 'pfApplicable' ? 'PF Applicable' : key === 'esicApplicable' ? 'ESIC Applicable' : 'PT Applicable'}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
