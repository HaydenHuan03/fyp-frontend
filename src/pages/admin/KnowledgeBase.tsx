import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiListDocuments,
  apiUploadDocument,
  apiDeleteDocument,
  type DocumentListItem,
  type IngestStatus,
} from '../../lib/api';

interface Toast { id: number; msg: string; type: 'success' | 'error'; }
let _tid = 0;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const StatusBadge: React.FC<{ status: IngestStatus }> = ({ status }) => {
  const map: Record<IngestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:  { label: 'Pending',  cls: 'kb-badge-pending',  icon: <Clock size={11} /> },
    ingested: { label: 'Ingested', cls: 'kb-badge-ingested', icon: <CheckCircle size={11} /> },
    failed:   { label: 'Failed',   cls: 'kb-badge-failed',   icon: <AlertCircle size={11} /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`adm-badge ${cls}`}>
      {icon}{label}
    </span>
  );
};

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = ++_tid;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiListDocuments(user!.accessToken);
      setDocs(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('Only PDF files are accepted.', 'error');
      return;
    }
    setUploading(true);
    try {
      await apiUploadDocument(user!.accessToken, file);
      toast(`"${file.name}" uploaded successfully.`, 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleUpload(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleUpload(file);
    e.target.value = '';
  };

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await apiDeleteDocument(user!.accessToken, id);
      toast(`"${filename}" deleted.`, 'success');
      setDocs(p => p.filter(d => d.id !== id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const total    = docs.length;
  const ingested = docs.filter(d => d.ingest_status === 'ingested').length;
  const pending  = docs.filter(d => d.ingest_status === 'pending').length;

  return (
    <div>
      {/* Page header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Knowledge Base</div>
          <div className="adm-page-sub">Manage PDF documents ingested into the RAG knowledge base.</div>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat-card">
          <div className="adm-stat-icon adm-stat-icon--indigo">
            <FileText size={18} color="var(--adm-accent)" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value adm-stat-value--indigo">{total}</div>
            <div className="adm-stat-label">Total Documents</div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon adm-stat-icon--green">
            <CheckCircle size={18} color="var(--adm-success)" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value adm-stat-value--green">{ingested}</div>
            <div className="adm-stat-label">Ingested</div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: 'var(--adm-warning-tint)' }}>
            <Clock size={18} color="var(--adm-warning)" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value" style={{ color: 'var(--adm-warning)' }}>{pending}</div>
            <div className="adm-stat-label">Awaiting Ingest</div>
          </div>
        </div>
      </div>

      {/* Upload dropzone */}
      <div
        className={`kb-dropzone${dragging ? ' kb-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF — click or drag and drop"
        onKeyDown={e => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <div className="kb-dropzone-icon">
          <Upload size={22} color={dragging ? 'var(--adm-accent)' : 'var(--adm-text-sub)'} />
        </div>
        <div className="kb-dropzone-text">
          {uploading
            ? 'Uploading…'
            : dragging
            ? 'Drop to upload'
            : 'Click or drag a PDF to upload'}
        </div>
        <div className="kb-dropzone-hint">PDF only · Max 16 MB</div>
      </div>

      {/* Table */}
      <div className="adm-table-card">
        <div className="adm-table-toolbar">
          <span className="adm-user-count">{total} document{total !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="kb-empty-state">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="kb-empty-state">
            <FileText size={32} color="var(--adm-text-sub)" />
            <p>No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div className="kb-filename-cell">
                        <div className="kb-file-icon" aria-hidden="true">
                          <FileText size={14} />
                        </div>
                        <span className="kb-filename">{doc.filename}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                      {formatBytes(doc.file_size)}
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                      {doc.uploaded_by}
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td><StatusBadge status={doc.ingest_status} /></td>
                    <td>
                      <div className="adm-row-actions">
                        <button
                          className="adm-row-btn adm-row-btn--danger"
                          title="Delete document"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          aria-label={`Delete ${doc.filename}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toasts */}
      {toasts.map(t => (
        <div key={t.id} className={`adm-toast ${t.type}`} role="status" aria-live="polite">
          {t.type === 'success'
            ? <CheckCircle size={16} color="var(--adm-success)" />
            : <AlertCircle size={16} color="var(--adm-danger)" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default KnowledgeBase;
