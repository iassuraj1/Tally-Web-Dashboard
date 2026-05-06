import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiLink, FiRefreshCw, FiSearch, FiSlash, FiUpload } from 'react-icons/fi';
import Modal from '../../../components/app/Modal';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const badgeClass = {
  imported: 'bg-orange-50 text-orange-700 border-orange-100',
  matched: 'bg-blue-50 text-blue-700 border-blue-100',
  reconciled: 'bg-green-50 text-green-700 border-green-100',
  ignored: 'bg-gray-50 text-gray-600 border-gray-100',
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

export default function BankImport() {
  const { company } = useCompany();
  const [banks, setBanks] = useState([]);
  const [bank, setBank] = useState('');
  const [lines, setLines] = useState([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [matchLine, setMatchLine] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);

  useEffect(() => {
    if (!company) return;
    api.get(`/companies/${company._id}/banking/bank-ledgers`).then((res) => {
      setBanks(res.data.data || []);
      if (res.data.data?.[0]) setBank(res.data.data[0]._id);
    });
  }, [company]);

  const load = useCallback(async () => {
    if (!company || !bank) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (query.trim()) params.set('q', query.trim());
    try {
      const res = await api.get(`/companies/${company._id}/banking/statement-lines/${bank}?${params}`);
      setLines(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [bank, company, query, status]);

  useEffect(() => {
    if (bank) queueMicrotask(load);
  }, [bank, load]);

  const totals = useMemo(() => ({
    imported: lines.length,
    matched: lines.filter((line) => line.status === 'matched').length,
    reconciled: lines.filter((line) => line.status === 'reconciled').length,
    pending: lines.filter((line) => line.status === 'imported').length,
  }), [lines]);

  const upload = async (file) => {
    if (!file || !bank || !company) return;
    setUploading(true);
    setMessage('');
    try {
      const lowerName = file.name.toLowerCase();
      const payload = { bankLedgerId: bank, fileName: file.name };
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        payload.fileData = await toBase64(file);
      } else {
        payload.text = await file.text();
      }
      const res = await api.post(`/companies/${company._id}/banking/statement-import`, payload);
      setMessage(`Imported ${res.data.imported} of ${res.data.parsed} lines. Auto-matched ${res.data.matched}. Skipped ${res.data.skippedDuplicates} duplicate(s).`);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const openMatch = async (line) => {
    setMatchLine(line);
    setCandidates([]);
    setCandidateLoading(true);
    try {
      const res = await api.get(`/companies/${company._id}/banking/statement-lines/${line._id}/candidates?days=60`);
      setCandidates(res.data.data || []);
    } finally {
      setCandidateLoading(false);
    }
  };

  const match = async (voucherId) => {
    await api.post(`/companies/${company._id}/banking/statement-lines/${matchLine._id}/match`, { voucherId });
    setMatchLine(null);
    await load();
  };

  const reconcile = async (line, voucherId) => {
    await api.post(`/companies/${company._id}/banking/statement-lines/${line._id}/reconcile`, voucherId ? { voucherId } : {});
    setMatchLine(null);
    await load();
  };

  const ignore = async (line) => {
    await api.patch(`/companies/${company._id}/banking/statement-lines/${line._id}/status`, { status: 'ignored' });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bank Account</label>
            <select value={bank} onChange={(e) => setBank(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white min-w-56">
              {banks.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="all">All</option>
              <option value="imported">Unmatched</option>
              <option value="matched">Matched</option>
              <option value="reconciled">Reconciled</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
              <FiSearch size={14} className="text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="outline-none text-sm w-48" placeholder="Narration" />
            </div>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-xl cursor-pointer ${uploading ? 'opacity-60' : ''}`}>
            <FiUpload size={14} /> {uploading ? 'Importing...' : 'Import CSV / Excel'}
            <input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl">
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
        {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Imported', totals.imported, 'text-[#003087]'],
          ['Auto/Manual Matched', totals.matched, 'text-blue-600'],
          ['Reconciled', totals.reconciled, 'text-green-600'],
          ['Needs Review', totals.pending, 'text-orange-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-[#003087]"><h3 className="font-bold text-white">Imported Bank Statement Lines</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Date', 'Narration', 'Bank Dr/Cr', 'Book Dr/Cr', 'Amount', 'Status', 'Matched Voucher', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : lines.map((line) => (
                <tr key={line._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(line.statementDate)}</td>
                  <td className="px-4 py-3 max-w-sm truncate text-gray-600">{line.narration || '-'}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700">{line.statementType || '-'}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${line.type === 'Dr' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{line.type}</span></td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(line.amount)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full border ${badgeClass[line.status] || badgeClass.imported}`}>{line.status}</span></td>
                  <td className="px-4 py-3 text-gray-600">
                    {line.matchedVoucher ? `${line.matchedVoucher.voucherNo} (${line.matchScore || 0}${line.matchType ? `, ${line.matchType}` : ''})` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {line.matchedVoucher && line.status !== 'reconciled' && (
                        <button onClick={() => reconcile(line)} className="flex items-center gap-1 px-2 py-1 text-xs border border-green-600 text-green-700 rounded-lg"><FiCheckCircle size={12} /> Reconcile</button>
                      )}
                      {line.status !== 'reconciled' && line.status !== 'ignored' && (
                        <button onClick={() => openMatch(line)} className="flex items-center gap-1 px-2 py-1 text-xs border border-[#003087] text-[#003087] rounded-lg"><FiLink size={12} /> Match</button>
                      )}
                      {line.status !== 'reconciled' && line.status !== 'ignored' && (
                        <button onClick={() => ignore(line)} className="p-1.5 text-gray-400 hover:text-gray-700" title="Ignore"><FiSlash size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && lines.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-400">No imported statement lines</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!matchLine} onClose={() => setMatchLine(null)} title="Match Statement Line" size="xl">
        {matchLine && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-gray-400">Date</div><div className="font-semibold">{fmtDate(matchLine.statementDate)}</div></div>
              <div><div className="text-xs text-gray-400">Amount</div><div className="font-semibold">{fmt(matchLine.amount)}</div></div>
              <div><div className="text-xs text-gray-400">Book Type</div><div className="font-semibold">{matchLine.type}</div></div>
              <div><div className="text-xs text-gray-400">Cheque / Ref</div><div className="font-semibold">{matchLine.chequeNo || '-'}</div></div>
              <div className="sm:col-span-4"><div className="text-xs text-gray-400">Narration</div><div className="text-gray-700">{matchLine.narration || '-'}</div></div>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Voucher', 'Date', 'Party', 'Narration', 'Book Type', 'Score', 'Action'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidateLoading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Finding candidates...</td></tr>
                  ) : candidates.map((candidate) => (
                    <tr key={candidate.voucher._id}>
                      <td className="px-3 py-2 font-semibold">{candidate.voucher.voucherNo}<div className="text-xs text-gray-400">{candidate.voucher.voucherType}</div></td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(candidate.voucher.date)}</td>
                      <td className="px-3 py-2">{candidate.voucher.party?.name || '-'}</td>
                      <td className="px-3 py-2 max-w-xs truncate text-gray-500">{candidate.voucher.narration || candidate.entry?.narration || '-'}</td>
                      <td className="px-3 py-2">{candidate.entry?.type}</td>
                      <td className="px-3 py-2 font-mono">{candidate.score}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => match(candidate.voucher._id)} className="px-2 py-1 text-xs border border-[#003087] text-[#003087] rounded-lg">Match</button>
                          <button onClick={() => reconcile(matchLine, candidate.voucher._id)} className="px-2 py-1 text-xs border border-green-600 text-green-700 rounded-lg">Reconcile</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!candidateLoading && candidates.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No voucher candidates found for this amount and bank ledger</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
