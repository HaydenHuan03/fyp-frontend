import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, Loader, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiListDocuments,
  apiUploadDocuments,
  apiIngestDocuments,
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

const StatusCell: React.FC<{ status: IngestStatus; isIngesting: boolean }> = ({ status, isIngesting }) => {
  type BadgeKey = IngestStatus | 'ingesting';
  const map: Record<BadgeKey, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: 'Pending',    cls: 'kb-badge-pending',   icon: <Clock size={11} /> },
    ingesting: { label: 'Ingesting…', cls: 'kb-badge-ingesting', icon: <Loader size={11} className="kb-spin" /> },
    ingested:  { label: 'Ingested',   cls: 'kb-badge-ingested',  icon: <CheckCircle size={11} /> },
    failed:    { label: 'Failed',     cls: 'kb-badge-failed',    icon: <AlertCircle size={11} /> },
  };
  const key: BadgeKey = isIngesting ? 'ingesting' : status;
  const { label, cls, icon } = map[key];
  const fillCls = isIngesting ? 'kb-progress-fill--ingesting' : `kb-progress-fill--${status}`;
  return (
    <div className="kb-status-cell">
      <span className={`adm-badge ${cls}`}>{icon}{label}</span>
      <div className="kb-progress-track">
        <div className={`kb-progress-fill ${fillCls}`} />
      </div>
    </div>
  );
};

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ingestingIds, setIngestingIds] = useState<Set<number>>(new Set());
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

  const stageFiles = (incoming: File[]) => {
    const pdfs = incoming.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const rejected = incoming.length - pdfs.length;
    if (rejected > 0) toast(`${rejected} file(s) skipped — only PDFs are accepted.`, 'error');
    if (!pdfs.length) return;
    setStagedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const deduped = pdfs.filter(f => !existing.has(f.name));
      return [...prev, ...deduped];
    });
  };

  const removeStagedFile = (name: string) => {
    setStagedFiles(prev => prev.filter(f => f.name !== name));
  };

  const handleConfirmUpload = async () => {
    if (!stagedFiles.length) return;
    const files = [...stagedFiles];
    setStagedFiles([]);
    setUploading(true);

    let uploadedIds: number[] = [];
    try {
      const results = await apiUploadDocuments(user!.accessToken, files);
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      if (succeeded.length) toast(`${succeeded.length} file(s) uploaded. Ingesting…`, 'success');
      failed.forEach(r => toast(`"${r.filename}": ${r.error}`, 'error'));
      uploadedIds = succeeded.map(r => r.id!);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
      setUploading(false);
      return;
    }
    setUploading(false);

    if (!uploadedIds.length) return;
    setIngestingIds(new Set(uploadedIds));
    try {
      const results = await apiIngestDocuments(user!.accessToken, uploadedIds);
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      if (succeeded.length) toast(`${succeeded.length} file(s) ingested successfully.`, 'success');
      failed.forEach(r => toast(`"${r.filename}": ${r.error}`, 'error'));
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ingestion failed', 'error');
      await load();
    } finally {
      setIngestingIds(new Set());
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    stageFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    stageFiles(Array.from(e.target.files ?? []));
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
  const busy     = uploading || ingestingIds.size > 0;

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
        onClick={() => !busy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Select PDFs — click or drag and drop"
        onKeyDown={e => e.key === 'Enter' && !busy && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <div className="kb-dropzone-icon">
          <Upload size={22} color={dragging ? 'var(--adm-accent)' : 'var(--adm-text-sub)'} />
        </div>
        <div className="kb-dropzone-text">
          {dragging ? 'Drop to add' : 'Click or drag PDFs to add'}
        </div>
        <div className="kb-dropzone-hint">PDF only · Max 50 MB per file · Multiple files supported</div>
      </div>

      {/* Staged file queue */}
      {stagedFiles.length > 0 && (
        <div className="kb-staged-panel">
          <div className="kb-staged-header">
            <span className="kb-staged-title">
              {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} ready to upload
            </span>
            <div className="kb-staged-actions">
              <button
                className="adm-btn-secondary"
                onClick={() => setStagedFiles([])}
                disabled={busy}
              >
                Clear all
              </button>
              <button
                className="adm-btn-primary"
                onClick={handleConfirmUpload}
                disabled={busy}
              >
                {busy ? <Loader size={14} className="kb-spin" /> : <Upload size={14} />}
                Confirm Upload
              </button>
            </div>
          </div>
          <ul className="kb-staged-list">
            {stagedFiles.map(f => (
              <li key={f.name} className="kb-staged-item">
                <div className="kb-file-icon" aria-hidden="true"><FileText size={14} /></div>
                <span className="kb-staged-name">{f.name}</span>
                <span className="kb-staged-size">{formatBytes(f.size)}</span>
                <button
                  className="kb-staged-remove"
                  onClick={() => removeStagedFile(f.name)}
                  aria-label={`Remove ${f.name}`}
                  disabled={busy}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processing status */}
      {busy && (
        <div className="kb-processing-bar">
          <Loader size={14} className="kb-spin" />
          {uploading ? 'Uploading files…' : `Ingesting ${ingestingIds.size} file(s) into knowledge base…`}
        </div>
      )}

      {/* Documents table */}
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
                    <td><StatusCell status={doc.ingest_status} isIngesting={ingestingIds.has(doc.id)} /></td>
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
