import { useState } from 'react';
import { FiArchive, FiCheckCircle, FiDatabase, FiDownload, FiUpload } from 'react-icons/fi';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';

const toBase64 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const downloadBlob = (res, fallback) => {
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallback;
  const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function BackupRestore() {
  const { company } = useCompany();
  const [fileData, setFileData] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const exportBackup = async () => {
    if (!company) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/companies/${company._id}/backup/export`, { responseType: 'blob' });
      downloadBlob(res, `${company.name}_backup.json`);
      setMessage('Backup export downloaded.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Backup export failed');
    } finally {
      setLoading(false);
    }
  };

  const validateRestore = async (file) => {
    if (!file || !company) return;
    setLoading(true);
    setMessage('');
    setResult(null);
    try {
      const base64 = await toBase64(file);
      const res = await api.post(`/companies/${company._id}/backup/restore`, { fileData: base64, dryRun: true });
      setFileData(base64);
      setFileName(file.name);
      setPreview(res.data.data);
    } catch (err) {
      setPreview(null);
      setMessage(err.response?.data?.message || 'Backup validation failed');
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    if (!company || !fileData) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post(`/companies/${company._id}/backup/restore`, { fileData, dryRun: false });
      setResult(res.data.data);
      setMessage('Backup restored into the current company.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  };

  const counts = preview?.counts || result?.counts || {};

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiArchive size={18} className="text-[#003087]" />
            <h3 className="font-bold text-gray-900">Company Backup</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Exports company profile, masters, vouchers, inventory masters, and payroll data as a JSON archive.</p>
          <button onClick={exportBackup} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
            <FiDownload size={14} /> Export Backup
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiDatabase size={18} className="text-[#003087]" />
            <h3 className="font-bold text-gray-900">Restore Backup</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Upload a backup JSON to validate it before restoring into the selected company.</p>
          <label className={`inline-flex items-center gap-2 px-4 py-2.5 border border-[#003087] text-[#003087] text-sm font-semibold rounded-lg cursor-pointer ${loading ? 'opacity-60' : ''}`}>
            <FiUpload size={14} /> Validate Backup
            <input type="file" accept=".json,application/json" className="hidden" onChange={(event) => { validateRestore(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        </div>
      </div>

      {message && <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-600">{message}</div>}

      {preview && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Restore Validation</h3>
              <p className="text-xs text-gray-400">{fileName}</p>
            </div>
            <button onClick={restore} disabled={!preview.valid || loading} className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
              <FiCheckCircle size={14} /> Restore
            </button>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Groups', counts.groups],
              ['Ledgers', counts.ledgers],
              ['Stock Items', counts.stockItems],
              ['Vouchers', counts.vouchers],
              ['Employees', counts.employees],
              ['Payroll', counts.payrollVouchers],
            ].map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-xl font-bold text-gray-900">{value || 0}</div>
              </div>
            ))}
          </div>
          {preview.errors?.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
              {preview.errors.join(' ')}
            </div>
          )}
        </div>
      )}

      {result?.results && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Restore Result</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(result.results).slice(0, 8).map(([key, value]) => (
              <div key={key} className="border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                <div className="text-xl font-bold text-gray-900">{value.imported || 0}</div>
                {value.errors?.length > 0 && <div className="text-xs text-red-600 mt-1">{value.errors.length} issue(s)</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
