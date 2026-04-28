import { useState } from 'react';
import useMaster from '../../../hooks/useMaster';
import DataTable from '../../../components/app/DataTable';
import Modal from '../../../components/app/Modal';

const TYPES    = ['Earning', 'Deduction', 'Employer Contribution', 'Employee Contribution'];
const CALC_TYPES = ['Fixed', 'Percentage of Basic', 'Percentage of Gross', 'Percentage of CTC', 'As Computed Value'];
const empty = { name: '', type: 'Earning', calcType: 'Fixed', calcValue: 0, affectsPF: false, affectsESIC: false };

export default function PayHeads() {
  const { data, loading, create, update, remove } = useMaster('payroll/pay-heads');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const openAdd  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, type: r.type, calcType: r.calcType, calcValue: r.calcValue, affectsPF: r.affectsPF, affectsESIC: r.affectsESIC }); setModal(true); };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await update(editing._id, form); else await create(form);
      setModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };
  const del = (r) => { if (confirm(`Delete "${r.name}"?`)) remove(r._id).catch(e => alert(e.response?.data?.message)); };

  const cols = [
    { key: 'name',     label: 'Pay Head', render: v => <span className="font-medium">{v}</span> },
    { key: 'type',     label: 'Type',     render: v => {
      const colors = { Earning: 'bg-green-100 text-green-700', Deduction: 'bg-red-100 text-red-700', 'Employer Contribution': 'bg-blue-100 text-blue-700', 'Employee Contribution': 'bg-purple-100 text-purple-700' };
      return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors[v] || 'bg-gray-100'}`}>{v}</span>;
    }},
    { key: 'calcType',  label: 'Calculation'    },
    { key: 'calcValue', label: 'Value',  render: (v, r) => r.calcType === 'Fixed' ? `₹${v.toLocaleString('en-IN')}` : `${v}%` },
    { key: 'affectsPF', label: 'PF',    render: v => v ? '✓' : '—' },
  ];

  return (
    <>
      <DataTable title="Pay Heads" columns={cols} data={data} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={del} addLabel="New Pay Head" />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Pay Head' : 'New Pay Head'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Calculation Type</label>
              <select value={form.calcType} onChange={e => setForm(f => ({ ...f, calcType: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                {CALC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{form.calcType === 'Fixed' ? 'Amount (₹)' : 'Percentage (%)'}</label>
              <input type="number" step="0.01" value={form.calcValue} onChange={e => setForm(f => ({ ...f, calcValue: +e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.affectsPF} onChange={e => setForm(f => ({ ...f, affectsPF: e.target.checked }))} />Affects PF</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.affectsESIC} onChange={e => setForm(f => ({ ...f, affectsESIC: e.target.checked }))} />Affects ESIC</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#003087] rounded-xl disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
