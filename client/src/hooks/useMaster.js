import { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../utils/api';
import { useCompany } from '../context/useCompany';

export default function useMaster(path) {
  const { company }     = useCompany();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const cid  = company?._id;
  const base = cid ? `/companies/${cid}/${path}` : null;

  const load = useCallback(() => {
    if (!base) { setLoading(false); return; }
    setLoading(true);
    api.get(base).then(r => setData(r.data.data || [])).catch(e => setError(getApiError(e, 'Could not load data'))).finally(() => setLoading(false));
  }, [base]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const create = async (body) => { const r = await api.post(base, body); setData(d => [...d, r.data.data]); return r.data.data; };
  const update = async (id, body) => { const r = await api.put(`${base}/${id}`, body); setData(d => d.map(x => x._id === id ? r.data.data : x)); return r.data.data; };
  const remove = async (id) => { await api.delete(`${base}/${id}`); setData(d => d.filter(x => x._id !== id)); };

  return { data, loading, error, create, update, remove, reload: load };
}
