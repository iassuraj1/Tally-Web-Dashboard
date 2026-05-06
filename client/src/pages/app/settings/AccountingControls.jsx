import { useCallback, useEffect, useState } from 'react';
import { FiClock, FiLock, FiPlus, FiRefreshCw, FiShield, FiUnlock } from 'react-icons/fi';
import Modal from '../../../components/app/Modal';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';

const fyEnd = (start) => {
  const date = new Date(start);
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};
const fmtDate = (date) => (date ? new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
const dateOnly = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const emptyYear = () => {
  const start = `${new Date().getFullYear()}-04-01`;
  return { name: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`, startDate: start, endDate: fyEnd(start), isActive: false };
};

export default function AccountingControls() {
  const { company, setCompany, financialYears, refreshFinancialYears } = useCompany();
  const [yearModal, setYearModal] = useState(false);
  const [yearForm, setYearForm] = useState(emptyYear);
  const [auditLogs, setAuditLogs] = useState([]);
  const [entityType, setEntityType] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const companyId = company?._id;

  const loadAudit = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (entityType) params.set('entityType', entityType);
      const res = await api.get(`/companies/${companyId}/audit-trail?${params}`);
      setAuditLogs(res.data.data || []);
    } catch (err) {
      setMessage(getApiError(err, 'Could not load audit trail'));
    } finally {
      setLoading(false);
    }
  }, [companyId, entityType]);

  useEffect(() => {
    queueMicrotask(loadAudit);
  }, [loadAudit]);

  const toggleLocking = async () => {
    if (!company) return;
    setMessage('');
    try {
      const res = await api.put(`/companies/${company._id}`, {
        financialYearLockingEnabled: !company.financialYearLockingEnabled,
      });
      setCompany(res.data.data);
      setMessage('Financial year locking updated.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not update company settings'));
    }
  };

  const saveYear = async (event) => {
    event.preventDefault();
    if (!company) return;
    setMessage('');
    try {
      await api.post(`/companies/${company._id}/financial-years`, yearForm);
      await refreshFinancialYears();
      setYearModal(false);
      setMessage('Financial year created.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not save financial year'));
    }
  };

  const patchYear = async (year, patch) => {
    if (!company) return;
    setMessage('');
    try {
      await api.patch(`/companies/${company._id}/financial-years/${year._id}`, patch);
      await refreshFinancialYears();
      setMessage('Financial year updated.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not update financial year'));
    }
  };

  const openYear = () => {
    setYearForm(emptyYear());
    setMessage('');
    setYearModal(true);
  };

  const changedFields = (log) => {
    const before = log.before && typeof log.before === 'object' ? log.before : {};
    const after = log.after && typeof log.after === 'object' ? log.after : {};
    const keys = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    return keys.slice(0, 5).join(', ') || '-';
  };

  if (!company) return null;

  return (
    <div className="space-y-4">
      {message && <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-600">{message}</div>}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiClock className="text-[#003087]" />
              <h3 className="font-bold text-gray-900">Financial Years</h3>
            </div>
            <button onClick={openYear} className="flex items-center gap-2 px-3 py-2 bg-[#003087] text-white text-sm font-semibold rounded-lg">
              <FiPlus size={14} /> New Year
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Name', 'Period', 'Active', 'Lock', 'Action'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {financialYears.map((year) => (
                  <tr key={year._id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{year.name}</td>
                    <td className="px-4 py-3 text-gray-500">{dateOnly(year.startDate)} to {dateOnly(year.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${year.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {year.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${year.isLocked ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {year.isLocked ? <FiLock size={11} /> : <FiUnlock size={11} />} {year.isLocked ? 'Locked' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!year.isActive && <button onClick={() => patchYear(year, { isActive: true })} className="px-2 py-1 text-xs border border-green-600 text-green-700 rounded-lg">Set Active</button>}
                        <button
                          onClick={() => patchYear(year, { isLocked: !year.isLocked, lockReason: year.isLocked ? '' : 'Locked from Accounting Controls' })}
                          className={`px-2 py-1 text-xs border rounded-lg ${year.isLocked ? 'border-blue-600 text-blue-700' : 'border-red-600 text-red-700'}`}
                        >
                          {year.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {financialYears.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-gray-400">No financial years configured</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <FiShield className="text-[#003087]" />
            <h3 className="font-bold text-gray-900">Voucher Date Guard</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">When enabled, submitted and approved vouchers must stay inside the active financial year. Locked years reject voucher edits.</p>
          <button onClick={toggleLocking} className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg ${company.financialYearLockingEnabled ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-[#003087] text-white'}`}>
            {company.financialYearLockingEnabled ? 'Disable Locking' : 'Enable Locking'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-gray-900">Audit Trail</h3>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)} className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Entities</option>
            {['Company', 'FinancialYear', 'Voucher', 'WorkflowDocument', 'User'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <button onClick={loadAudit} className="p-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['When', 'User', 'Action', 'Entity', 'Changed Fields', 'IP'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{log.user?.name || 'System'}</div>
                    <div className="text-xs text-gray-400">{log.user?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#003087]">{log.action}</td>
                  <td className="px-4 py-3 text-gray-600">{log.entityType}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-md truncate">{changedFields(log)}</td>
                  <td className="px-4 py-3 text-gray-400">{log.ip || '-'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No audit entries found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={yearModal} onClose={() => setYearModal(false)} title="Create Financial Year">
        <form onSubmit={saveYear} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input required value={yearForm.name} onChange={(event) => setYearForm((form) => ({ ...form, name: event.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input required type="date" value={yearForm.startDate} onChange={(event) => setYearForm((form) => ({ ...form, startDate: event.target.value, endDate: fyEnd(event.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input required type="date" value={yearForm.endDate} onChange={(event) => setYearForm((form) => ({ ...form, endDate: event.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={yearForm.isActive} onChange={(event) => setYearForm((form) => ({ ...form, isActive: event.target.checked }))} />
            Set as active financial year
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setYearModal(false)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
