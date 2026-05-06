import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/useCompany';
import api from '../../utils/api';
import Modal from '../../components/app/Modal';
import { FiPlus, FiCheck, FiEdit2, FiUsers, FiTrash2 } from 'react-icons/fi';

const emptyForm = { name: '', legalName: '', gstin: '', pan: '', address: '', city: '', state: '', pincode: '', phone: '', email: '' };

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [usersModal, setUsersModal] = useState(false);
  const [usersCompany, setUsersCompany] = useState(null);
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ email: '', role: 'accountant', permissions: [] });
  const [permissionDefs, setPermissionDefs] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const { company, setCompany }   = useCompany();
  const navigate                  = useNavigate();

  const load = () => {
    api.get('/companies').then(r => setCompanies(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, legalName: c.legalName || '', gstin: c.gstin || '', pan: c.pan || '', address: c.address || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', phone: c.phone || '', email: c.email || '' }); setModal(true); };
  const loadUsers = async (c) => {
    setUsersLoading(true);
    try {
      const [usersRes, permissionsRes] = await Promise.all([
        api.get(`/companies/${c._id}/users`),
        api.get(`/companies/${c._id}/permissions`),
      ]);
      setUsers(usersRes.data.data);
      setPermissionDefs(permissionsRes.data.data?.permissions || []);
      setRoleDefaults(permissionsRes.data.data?.roleDefaults || {});
      setUserForm((x) => x.email ? x : { ...x, permissions: permissionsRes.data.data?.roleDefaults?.[x.role] || [] });
    } finally { setUsersLoading(false); }
  };
  const openUsers = (c) => {
    setUsersCompany(c);
    setUserForm({ email: '', role: 'accountant', permissions: roleDefaults.accountant || [] });
    setUsersModal(true);
    loadUsers(c);
  };

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

  const addUser = async (e) => {
    e.preventDefault();
    if (!usersCompany) return;
    setSaving(true);
    try {
      await api.post(`/companies/${usersCompany._id}/users`, userForm);
      setUserForm({ email: '', role: 'accountant', permissions: roleDefaults.accountant || [] });
      await loadUsers(usersCompany);
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding user');
    } finally { setSaving(false); }
  };

  const updateUser = async (userId, patch) => {
    try {
      await api.patch(`/companies/${usersCompany._id}/users/${userId}`, patch);
      await loadUsers(usersCompany);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user');
    }
  };

  const setUserRole = (role) => {
    setUserForm((x) => ({ ...x, role, permissions: roleDefaults[role] || [] }));
  };

  const toggleFormPermission = (permission) => {
    setUserForm((x) => ({
      ...x,
      permissions: x.permissions.includes(permission)
        ? x.permissions.filter((item) => item !== permission)
        : [...x.permissions, permission],
    }));
  };

  const toggleUserPermission = async (user, permission) => {
    const permissions = user.permissions?.includes(permission)
      ? user.permissions.filter((item) => item !== permission)
      : [...(user.permissions || []), permission];
    await updateUser(user._id, { permissions });
  };

  const removeUser = async (userId) => {
    if (!confirm('Remove this user from the company?')) return;
    try {
      await api.delete(`/companies/${usersCompany._id}/users/${userId}`);
      await loadUsers(usersCompany);
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing user');
    }
  };

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
    <div className="max-w-5xl mx-auto">
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
                <button onClick={() => openUsers(c)} className="p-2 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg" title="Manage users"><FiUsers size={15} /></button>
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

      <Modal isOpen={usersModal} onClose={() => setUsersModal(false)} title={usersCompany ? `Users - ${usersCompany.name}` : 'Users'} size="lg">
        <form onSubmit={addUser} className="space-y-3 mb-6">
          <div className="grid md:grid-cols-[1fr_180px_auto] gap-3">
            <input
              type="email"
              required
              placeholder="registered-user@example.com"
              value={userForm.email}
              onChange={(e) => setUserForm((x) => ({ ...x, email: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            />
            <select
              value={userForm.role}
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
            >
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" disabled={saving} className="px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-60">
              Add User
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {permissionDefs.map((permission) => (
              <label key={permission.key} className="flex items-center gap-2 text-xs text-gray-600 border border-gray-100 rounded-lg px-3 py-2">
                <input type="checkbox" checked={userForm.permissions.includes(permission.key)} onChange={() => toggleFormPermission(permission.key)} />
                {permission.label}
              </label>
            ))}
          </div>
        </form>

        {usersLoading ? (
          <div className="text-center py-10 text-gray-400">Loading users...</div>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  {permissionDefs.map((permission) => <th key={permission.key} className="text-center px-3 py-3 whitespace-nowrap">{permission.label}</th>)}
                  <th className="w-20 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'owner' ? (
                        <span className="font-semibold text-[#003087]">Owner</span>
                      ) : (
                        <select value={u.role} onChange={(e) => updateUser(u._id, { role: e.target.value })} className="px-2 py-1.5 border border-gray-200 rounded-lg">
                          <option value="admin">Admin</option>
                          <option value="accountant">Accountant</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'owner' ? (
                        <span className="text-green-700">active</span>
                      ) : (
                        <select value={u.status} onChange={(e) => updateUser(u._id, { status: e.target.value })} className="px-2 py-1.5 border border-gray-200 rounded-lg">
                          <option value="active">active</option>
                          <option value="disabled">disabled</option>
                        </select>
                      )}
                    </td>
                    {permissionDefs.map((permission) => (
                      <td key={`${u._id}-${permission.key}`} className="px-3 py-3 text-center">
                        {u.role === 'owner' ? (
                          <span className="text-green-600 font-semibold">Yes</span>
                        ) : (
                          <input type="checkbox" checked={(u.permissions || []).includes(permission.key)} onChange={() => toggleUserPermission(u, permission.key)} />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'owner' && (
                        <button onClick={() => removeUser(u._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove user">
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
