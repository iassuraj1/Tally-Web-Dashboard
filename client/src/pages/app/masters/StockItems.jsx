import { useState } from 'react';
import { useCompany } from '../../../context/CompanyContext';
import useMaster from '../../../hooks/useMaster';
import DataTable from '../../../components/app/DataTable';
import Modal from '../../../components/app/Modal';
import api from '../../../utils/api';

const empty = { name: '', group: '', unit: '', hsnCode: '', gstRate: 0, taxability: 'Taxable', costPrice: 0, sellingPrice: 0, mrp: 0, openingQty: 0, openingRate: 0, description: '', reorderLevel: 0 };

export default function StockItems() {
  const { company } = useCompany();
  const { data: items, loading, create, update, remove } = useMaster('inventory/items');
  const { data: groups }  = useMaster('inventory/stock-groups');
  const { data: units  }  = useMaster('inventory/units');
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const openAdd  = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, group: r.group?._id || '', unit: r.unit?._id || '', hsnCode: r.hsnCode || '', gstRate: r.gstRate, taxability: r.taxability, costPrice: r.costPrice, sellingPrice: r.sellingPrice, mrp: r.mrp, openingQty: r.openingQty, openingRate: r.openingRate, description: r.description || '', reorderLevel: r.reorderLevel });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/companies/${company._id}/inventory/items/${editing._id}`, form);
      else          await api.post(`/companies/${company._id}/inventory/items`, form);
      setModal(false);
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = (r) => { if (confirm(`Delete "${r.name}"?`)) api.delete(`/companies/${company._id}/inventory/items/${r._id}`).catch(e => alert(e.response?.data?.message)); };

  const cols = [
    { key: 'name',       label: 'Item Name',    render: v => <span className="font-medium">{v}</span> },
    { key: 'group',      label: 'Group',        render: v => v?.name || '—' },
    { key: 'unit',       label: 'Unit',         render: v => v?.symbol || '—' },
    { key: 'hsnCode',    label: 'HSN Code',     render: v => v || '—' },
    { key: 'gstRate',    label: 'GST %',        render: v => `${v}%` },
    { key: 'sellingPrice',label:'Selling Price', render: v => `₹${v?.toLocaleString('en-IN')}` },
    { key: 'openingQty', label: 'Opening Qty'  },
  ];

  const numFields = [
    { key: 'gstRate',      label: 'GST Rate %'    },
    { key: 'costPrice',    label: 'Cost Price'     },
    { key: 'sellingPrice', label: 'Selling Price'  },
    { key: 'mrp',          label: 'MRP'            },
    { key: 'openingQty',   label: 'Opening Qty'    },
    { key: 'openingRate',  label: 'Opening Rate'   },
    { key: 'reorderLevel', label: 'Reorder Level'  },
  ];

  return (
    <>
      <DataTable title="Stock Items" columns={cols} data={items} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={del} addLabel="New Item" />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Stock Item' : 'New Stock Item'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock Group</label>
              <select value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Select group…</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
              <select required value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Select unit…</option>
                {units.map(u => <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">HSN Code</label>
              <input value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Taxability</label>
              <select value={form.taxability} onChange={e => setForm(f => ({ ...f, taxability: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003087]">
                {['Taxable','Exempt','Nil Rated','Non-GST'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {numFields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="number" step="0.01" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
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
