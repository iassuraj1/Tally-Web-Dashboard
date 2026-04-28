import { useState } from 'react';
import useMaster from '../../../hooks/useMaster';
import DataTable from '../../../components/app/DataTable';
import Modal from '../../../components/app/Modal';

const natures = ['Assets', 'Liabilities', 'Income', 'Expenses'];
const empty = { name: '', nature: 'Assets', parent: '', affectsGross: false };

export default function Groups() {
  const { data, loading, create, update, remove } = useMaster('groups');
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const openAdd  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, nature: r.nature, parent: r.parent?._id || '', affectsGross: r.affectsGross }); setModal(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = { ...form, parent: form.parent || null };
      if (editing) await update(editing._id, body);
      else          await create(body);
      setModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = (r) => { if (r.isDefault) { alert('Default groups cannot be deleted'); return; } if (confirm(`Delete "${r.name}"?`)) remove(r._id).catch(e => alert(e.response?.data?.message)); };

  const cols = [
    { key: 'name',   label: 'Group Name', render: v => <span className="font-medium">{v}</span> },
    { key: 'parent', label: 'Under',      render: v => v?.name || 'Primary Group' },
    { key: 'nature', label: 'Nature',     render: v => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v === 'Assets' ? 'bg-green-100 text-green-700' : v === 'Liabilities' ? 'bg-red-100 text-red-700' : v === 'Income' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{v}</span> },
    { key: 'isDefault', label: 'Type', render: v => v ? <span className="text-xs text-gray-400">Default</span> : <span className="text-xs text-blue-600">Custom</span> },
  ];

  return (
    <>
      <DataTable title="Account Groups" columns={cols} data={data} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={del} addLabel="New Group" />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Group' : 'New Group'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Group Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nature *</label>
            <select value={form.nature} onChange={e => setForm(f => ({ ...f, nature: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
              {natures.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Under (Parent Group)</label>
            <select value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="">Primary Group</option>
              {data.filter(g => g.nature === form.nature).map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.affectsGross} onChange={e => setForm(f => ({ ...f, affectsGross: e.target.checked }))} className="rounded" />
            Affects Gross Profit
          </label>
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
