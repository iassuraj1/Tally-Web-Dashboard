import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiPaperclip, FiRefreshCw, FiSend } from 'react-icons/fi';
import { useCompany } from '../../context/useCompany';
import api from '../../utils/api';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN') : '-');
const fmtSize = (size) => {
  const n = Number(size || 0);
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
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

export default function CollaborationPanel({ entityType, entityId }) {
  const { company } = useCompany();
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const cid = company?._id;

  const load = useCallback(async () => {
    if (!cid || !entityType || !entityId) return;
    const res = await api.get(`/companies/${cid}/collaboration/${entityType}/${entityId}`);
    setComments(res.data.data?.comments || []);
    setAttachments(res.data.data?.attachments || []);
  }, [cid, entityId, entityType]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/companies/${cid}/collaboration/${entityType}/${entityId}/comments`, { body: comment });
    setComment('');
    await load();
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await api.post(`/companies/${cid}/collaboration/${entityType}/${entityId}/attachments`, {
        fileName: file.name,
        mimeType: file.type,
        fileData: await toBase64(file),
      });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = async (attachment) => {
    if (attachment.storage === 'url') {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const res = await api.get(`/companies/${cid}/collaboration/attachments/${attachment._id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!entityId) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Comments and Attachments</h3>
        <button type="button" onClick={load} className="p-2 text-gray-400 hover:text-[#003087] hover:bg-blue-50 rounded-lg">
          <FiRefreshCw size={14} />
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        <div className="p-5 space-y-4">
          <form onSubmit={addComment} className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
            <button type="submit" className="px-3 py-2 bg-[#003087] text-white rounded-xl"><FiSend size={15} /></button>
          </form>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {comments.map((item) => (
              <div key={item._id} className="border border-gray-100 rounded-xl p-3">
                <div className="text-sm text-gray-800 whitespace-pre-line">{item.body}</div>
                <div className="text-xs text-gray-400 mt-2">{item.createdBy?.name || 'User'} - {fmtDate(item.createdAt)}</div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No comments yet</div>}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <label className={`flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-60' : ''}`}>
            <FiPaperclip size={16} /> {uploading ? 'Uploading...' : 'Upload attachment'}
            <input type="file" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {attachments.map((item) => (
              <button type="button" key={item._id} onClick={() => downloadAttachment(item)} className="w-full flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 hover:bg-gray-50 text-left">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{item.originalName}</div>
                  <div className="text-xs text-gray-400">{fmtSize(item.size)} - {item.uploadedBy?.name || 'User'} - {fmtDate(item.createdAt)}</div>
                </div>
                <FiDownload size={15} className="text-gray-400" />
              </button>
            ))}
            {attachments.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No attachments yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
