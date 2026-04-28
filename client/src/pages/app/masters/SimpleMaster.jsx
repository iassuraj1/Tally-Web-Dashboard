import { useState } from 'react';
import useMaster from '../../../hooks/useMaster';
import DataTable from '../../../components/app/DataTable';
import Modal from '../../../components/app/Modal';

// Generic simple master page (Units, Godowns, Stock Groups, Cost Centres)
export default function SimpleMaster({ title, path, columns, formFields, emptyForm, addLabel = 'New' }) {
  const { data, loading, create, update, remove } = useMaster(path);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    const f = {};
    for (const key of Object.keys(emptyForm)) {
      if (formFields.find(ff => ff.key === key && (ff.type === 'select' || ff.refPath))) {
        f[key] = r[key]?._id || r[key] || '';
      } else {
        f[key] = r[key] ?? emptyForm[key];
      }
    }
    setForm(f); setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = { ...form };
      for (const ff of formFields) { if (ff.optional && !body[ff.key]) body[ff.key] = null; }
      if (editing) await update(editing._id, body);
      else          await create(body);
      setModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = (r) => { if (confirm(`Delete "${r.name}"?`)) remove(r._id).catch(e => alert(e.response?.data?.message || 'Cannot delete')); };

  return (
    <>
      <DataTable title={title} columns={columns} data={data} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={del} addLabel={addLabel} />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}>
        <form onSubmit={save} className="space-y-4">
          {formFields.map(ff => {
            if (ff.type === 'select') {
              return (
                <div key={ff.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{ff.label}</label>
                  <select value={form[ff.key]} required={ff.required} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                    {ff.optional && <option value="">— None —</option>}
                    {ff.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    {ff.refData?.map(o => <option key={o._id} value={o._id}>{o.name}{o.symbol ? ` (${o.symbol})` : ''}</option>)}
                  </select>
                </div>
              );
            }
            if (ff.type === 'checkbox') {
              return (
                <label key={ff.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form[ff.key]} onChange={e => setForm(f => ({ ...f, [ff.key]: e.target.checked }))} className="rounded" />
                  {ff.label}
                </label>
              );
            }
            return (
              <div key={ff.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{ff.label}{ff.required ? ' *' : ''}</label>
                <input type={ff.type || 'text'} step={ff.step} required={ff.required} value={form[ff.key]} onChange={e => setForm(f => ({ ...f, [ff.key]: ff.type === 'number' ? +e.target.value : e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
            );
          })}
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
