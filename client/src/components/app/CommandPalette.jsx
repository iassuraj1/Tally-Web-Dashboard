import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/useCompany';
import api from '../../utils/api';
import {
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiClock,
  FiFileText,
  FiPackage,
  FiSearch,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

const ICONS = {
  approval: FiClock,
  command: FiZap,
  ledger: FiBookOpen,
  master: FiUsers,
  report: FiBarChart2,
  stock: FiPackage,
  voucher: FiFileText,
};

const TYPE_LABELS = {
  approval: 'Approval',
  command: 'Command',
  ledger: 'Ledger',
  master: 'Master',
  report: 'Report',
  stock: 'Stock',
  voucher: 'Voucher',
};

const formatMeta = (meta) => {
  if (!meta) return '';
  const date = new Date(meta);
  if (!Number.isNaN(date.getTime()) && String(meta).includes('T')) {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return String(meta);
};

export default function CommandPalette({ isOpen, onClose }) {
  const { company } = useCompany();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setQuery('');
      setResults([]);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !company?._id) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.get(`/companies/${company._id}/dashboard/search`, { params: { q: query } })
        .then((res) => setResults(res.data.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, query ? 160 : 0);
    return () => window.clearTimeout(timer);
  }, [company?._id, isOpen, query]);

  const firstResult = useMemo(() => results[0], [results]);

  const openResult = (result) => {
    if (!result?.href) return;
    navigate(result.href);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key === 'Enter' && firstResult) {
      event.preventDefault();
      openResult(firstResult);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-6" onMouseDown={onClose}>
      <div
        className="mx-auto mt-16 w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <FiSearch size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ledgers, vouchers, stock items, reports"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <FiX size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results found</div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => {
                const Icon = ICONS[result.type] || FiSearch;
                return (
                  <button
                    key={`${result.type}-${result.label}-${index}`}
                    type="button"
                    onClick={() => openResult(result)}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-blue-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-[#003087] group-hover:text-white">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{result.label}</span>
                      <span className="block truncate text-xs text-gray-400">
                        {TYPE_LABELS[result.type] || 'Result'}{result.subtitle ? ` - ${result.subtitle}` : ''}
                      </span>
                    </span>
                    {formatMeta(result.meta) && (
                      <span className="hidden shrink-0 text-xs text-gray-400 sm:block">{formatMeta(result.meta)}</span>
                    )}
                    <FiArrowRight size={14} className="shrink-0 text-gray-300 group-hover:text-[#003087]" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          <span>Alt G / Ctrl G</span>
          <span>Enter opens, Esc closes</span>
        </div>
      </div>
    </div>
  );
}
