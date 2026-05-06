import { useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiDownload, FiUpload } from 'react-icons/fi';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';

const TYPES = [
  { value: 'ledgers', label: 'Ledgers' },
  { value: 'stock_items', label: 'Stock Items' },
  { value: 'customers', label: 'Customers' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'opening_balances', label: 'Opening Balances' },
];

const COLUMNS = {
  ledgers: 'Ledger Name, Group, Opening Balance, Opening Balance Type, GSTIN, Phone, Email',
  stock_items: 'Item Name, Stock Group, Unit, HSN Code, GST Rate, Opening Qty, Opening Rate, Selling Price',
  customers: 'Name, Opening Balance, Opening Balance Type, GSTIN, Phone, Email, Credit Days',
  vendors: 'Name, Opening Balance, Opening Balance Type, GSTIN, Phone, Email, Credit Days',
  opening_balances: 'Ledger Name, Opening Balance, Opening Balance Type, Stock Item, Opening Qty, Opening Rate',
};

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

export default function MasterImport() {
  const { company } = useCompany();
  const [type, setType] = useState('ledgers');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const validRows = useMemo(() => preview?.rows?.filter((row) => row.status === 'valid') || [], [preview]);

  const previewFile = async (file) => {
    if (!file || !company) return;
    setLoading(true);
    setMessage('');
    setResult(null);
    try {
      const lower = file.name.toLowerCase();
      const payload = { type, fileName: file.name };
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) payload.fileData = await toBase64(file);
      else payload.text = await file.text();
      const res = await api.post(`/companies/${company._id}/import/masters/preview`, payload);
      setPreview(res.data.data);
    } catch (err) {
      setPreview(null);
      setMessage(err.response?.data?.message || 'Could not preview import file');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!company || !preview) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post(`/companies/${company._id}/import/masters/commit`, { type, rows: preview.rows });
      setResult(res.data.data);
      setMessage(`Imported ${res.data.data.imported} row(s). ${res.data.data.failed} failed, ${res.data.data.skipped} skipped.`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    if (!company) return;
    const res = await api.get(`/companies/${company._id}/import/masters/template/${type}`, { responseType: 'blob' });
    downloadBlob(res, `${type}_import_template.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Import Type</label>
            <select value={type} onChange={(event) => { setType(event.target.value); setPreview(null); setResult(null); setMessage(''); }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white min-w-56">
              {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
            <FiDownload size={14} /> Template
          </button>
          <label className={`flex items-center gap-2 px-4 py-2.5 bg-[#003087] text-white text-sm font-semibold rounded-lg cursor-pointer ${loading ? 'opacity-60' : ''}`}>
            <FiUpload size={14} /> {loading ? 'Working...' : 'Upload CSV / Excel'}
            <input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={(event) => { previewFile(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          <div className="text-xs text-gray-400 max-w-2xl">Columns: {COLUMNS[type]}</div>
        </div>
        {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
      </div>

      {preview && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400">Rows</div>
              <div className="text-2xl font-bold text-gray-900">{preview.totalRows}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400">Ready</div>
              <div className="text-2xl font-bold text-green-600">{preview.validRows}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400">Needs Fix</div>
              <div className="text-2xl font-bold text-red-600">{preview.invalidRows}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900">Preview</h3>
                <p className="text-xs text-gray-400">{preview.fileName || 'Uploaded file'} {preview.sheetName ? `- ${preview.sheetName}` : ''}</p>
              </div>
              <button onClick={commit} disabled={!validRows.length || loading} className="px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                Import Valid Rows
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Row', 'Status', 'Name / Target', 'Group / Unit', 'Opening', 'Reasons'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.rows.slice(0, 200).map((row) => (
                    <tr key={row.rowNumber} className={row.status === 'valid' ? 'hover:bg-green-50/30' : 'bg-red-50/30'}>
                      <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${row.status === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.status === 'valid' ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />} {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{row.payload?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{row.payload?.groupName || row.payload?.unitSymbol || row.payload?.target || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{row.payload?.openingBalance ?? row.payload?.openingQty ?? '-'}</td>
                      <td className="px-4 py-3 text-red-600 text-xs">{row.reasons?.join(' ') || '-'}</td>
                    </tr>
                  ))}
                  {preview.rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No rows found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Import Result</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">{['Row', 'Name', 'Status', 'Reason'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {result.results.map((row, index) => (
                  <tr key={`${row.rowNumber}-${index}`}>
                    <td className="px-4 py-3">{row.rowNumber}</td>
                    <td className="px-4 py-3">{row.name || '-'}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{row.reasons?.join(' ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
