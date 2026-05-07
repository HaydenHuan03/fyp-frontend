import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, Loader, X, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiListDocuments,
  apiUploadDocuments,
  apiIngestDocuments,
  apiDeleteDocument,
  apiListDocumentChunks,
  type DocumentListItem,
  type IngestStatus,
  type ChunkPreviewItem,
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

const StatusCell: React.FC<{ status: IngestStatus }> = ({ status }) => {
  const map: Record<IngestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: 'Pending',    cls: 'kb-badge-pending',   icon: <Clock size={11} /> },
    ingesting: { label: 'Ingesting…', cls: 'kb-badge-ingesting', icon: <Loader size={11} className="kb-spin" /> },
    ingested:  { label: 'Ingested',   cls: 'kb-badge-ingested',  icon: <CheckCircle size={11} /> },
    failed:    { label: 'Failed',     cls: 'kb-badge-failed',    icon: <AlertCircle size={11} /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <div className="kb-status-cell">
      <span className={`adm-badge ${cls}`}>{icon}{label}</span>
      <div className="kb-progress-track">
        <div className={`kb-progress-fill kb-progress-fill--${status}`} />
      </div>
    </div>
  );
};

interface ChunksModal {
  doc: DocumentListItem;
  chunks: ChunkPreviewItem[];
  page: number;
  loading: boolean;
  total: number;
}

const PAGE_SIZE = 10;

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reIngestingId, setReIngestingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [chunksModal, setChunksModal] = useState<ChunksModal | null>(null);
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

  // Poll every 4 s while any document is still pending or ingesting.
  useEffect(() => {
    const hasActive = docs.some(d => d.ingest_status === 'pending' || d.ingest_status === 'ingesting');
    if (!hasActive) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [docs, load]);

  const handleReIngest = async (id: number, filename: string) => {
    setReIngestingId(id);
    try {
      const results = await apiIngestDocuments(user!.accessToken, [id]);
      const result = results[0];
      if (!result?.error) {
        toast(`"${filename}" re-ingestion started.`, 'success');
      } else {
        toast(`"${filename}": ${result.error}`, 'error');
      }
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Re-ingestion failed', 'error');
    } finally {
      setReIngestingId(null);
    }
  };

  const stageFiles = (incoming: File[]) => {
    const accepted = incoming.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.json');
    });
    const rejected = incoming.length - accepted.length;
    if (rejected > 0) toast(`${rejected} file(s) skipped — only PDF or JSON files are accepted.`, 'error');
    if (!accepted.length) return;
    setStagedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const seen = new Set<string>();
      const deduped = accepted.filter(f => {
        if (existing.has(f.name) || seen.has(f.name)) return false;
        seen.add(f.name);
        return true;
      });
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

    try {
      const results = await apiUploadDocuments(user!.accessToken, files);
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      if (succeeded.length) toast(`${succeeded.length} file(s) uploaded. Ingestion running in background…`, 'success');
      failed.forEach(r => toast(`"${r.filename}": ${r.error ?? 'Upload failed'}`, 'error'));
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
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

  const handleViewChunks = async (doc: DocumentListItem, page = 0) => {
    if (chunksModal && chunksModal.doc.id === doc.id && chunksModal.page === page) return;
    setChunksModal(prev => prev ? { ...prev, loading: true } : { doc, chunks: [], page, loading: true, total: doc.chunk_count });
    try {
      const chunks = await apiListDocumentChunks(user!.accessToken, doc.id, PAGE_SIZE, page * PAGE_SIZE);
      setChunksModal({ doc, chunks, page, loading: false, total: doc.chunk_count });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load chunks', 'error');
      setChunksModal(null);
    }
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
  const busy     = uploading;

  return (
    <div>
      {/* Page header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Knowledge Base</div>
          <div className="adm-page-sub">Manage PDF and JSON documents ingested into the RAG knowledge base.</div>
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
        aria-label="Select PDF or JSON files — click or drag and drop"
        onKeyDown={e => e.key === 'Enter' && !busy && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.json,application/pdf,application/json"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <div className="kb-dropzone-icon">
          <Upload size={22} color={dragging ? 'var(--adm-accent)' : 'var(--adm-text-sub)'} />
        </div>
        <div className="kb-dropzone-text">
          {dragging ? 'Drop to add' : 'Click or drag PDF or JSON files to add'}
        </div>
        <div className="kb-dropzone-hint">PDF or JSON · Max 1GB per file · Multiple files supported</div>
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
          Uploading files…
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
          <>
          <div className="adm-table-wrap adm-hide-mobile">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded By</th>
                  <th>Uploaded</th>
                  <th>Chunks</th>
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
                      {doc.uploaded_by}
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                      {doc.chunk_count > 0 ? doc.chunk_count.toLocaleString() : '—'}
                    </td>
                    <td><StatusCell status={doc.ingest_status} /></td>
                    <td>
                      <div className="adm-row-actions">
                        {doc.ingest_status === 'ingested' && doc.chunk_count > 0 && (
                          <button
                            className="adm-row-btn"
                            title="Preview chunks"
                            onClick={() => handleViewChunks(doc)}
                            aria-label={`Preview chunks for ${doc.filename}`}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {doc.ingest_status === 'failed' && (
                          <button
                            className="adm-row-btn"
                            title="Re-ingest document"
                            disabled={reIngestingId === doc.id}
                            onClick={() => handleReIngest(doc.id, doc.filename)}
                            aria-label={`Re-ingest ${doc.filename}`}
                          >
                            {reIngestingId === doc.id
                              ? <Loader size={14} className="kb-spin" />
                              : <RefreshCw size={14} />}
                          </button>
                        )}
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

          {/* Mobile cards */}
          <div className="adm-mobile-cards adm-show-mobile">
            {docs.map(doc => (
              <div key={doc.id} className="adm-mobile-card">
                <div className="adm-mobile-card-header">
                  <div className="kb-filename-cell" style={{ flex: 1, minWidth: 0 }}>
                    <div className="kb-file-icon" aria-hidden="true">
                      <FileText size={14} />
                    </div>
                    <span className="kb-filename">{doc.filename}</span>
                  </div>
                  <div className="adm-row-actions">
                    {doc.ingest_status === 'ingested' && doc.chunk_count > 0 && (
                      <button
                        className="adm-row-btn"
                        title="Preview chunks"
                        onClick={() => handleViewChunks(doc)}
                        aria-label={`Preview chunks for ${doc.filename}`}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {doc.ingest_status === 'failed' && (
                      <button
                        className="adm-row-btn"
                        title="Re-ingest document"
                        disabled={reIngestingId === doc.id}
                        onClick={() => handleReIngest(doc.id, doc.filename)}
                        aria-label={`Re-ingest ${doc.filename}`}
                      >
                        {reIngestingId === doc.id
                          ? <Loader size={14} className="kb-spin" />
                          : <RefreshCw size={14} />}
                      </button>
                    )}
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
                </div>
                <div className="adm-mobile-card-details">
                  <div className="adm-mobile-card-detail">
                    <span className="adm-mobile-card-label">By</span>
                    <span className="adm-mobile-card-value">{doc.uploaded_by}</span>
                  </div>
                  <div className="adm-mobile-card-detail">
                    <span className="adm-mobile-card-label">Date</span>
                    <span className="adm-mobile-card-value">{formatDate(doc.uploaded_at)}</span>
                  </div>
                  <div className="adm-mobile-card-detail">
                    <span className="adm-mobile-card-label">Chunks</span>
                    <span className="adm-mobile-card-value">{doc.chunk_count > 0 ? doc.chunk_count.toLocaleString() : '—'}</span>
                  </div>
                </div>
                <div className="adm-mobile-card-footer">
                  <StatusCell status={doc.ingest_status} />
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Chunks viewer modal */}
      {chunksModal && (
        <div className="adm-modal-overlay" onClick={() => setChunksModal(null)}>
          <div className="adm-modal" style={{ maxWidth: '720px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Chunk Preview — {chunksModal.doc.filename}</span>
              <button className="kb-staged-remove" onClick={() => setChunksModal(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="adm-modal-sub">
              {chunksModal.total.toLocaleString()} total chunk{chunksModal.total !== 1 ? 's' : ''} · page {chunksModal.page + 1} of {Math.ceil(chunksModal.total / PAGE_SIZE)}
            </div>
            {chunksModal.loading ? (
              <div className="kb-empty-state"><Loader size={20} className="kb-spin" /></div>
            ) : chunksModal.chunks.length === 0 ? (
              <div className="kb-empty-state">No chunks on this page.</div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto', marginTop: '12px' }}>
                {chunksModal.chunks.map((chunk, i) => (
                  <div key={chunk.id} style={{ padding: '12px', borderBottom: '1px solid var(--adm-border)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, color: 'var(--adm-accent)', minWidth: '28px' }}>#{chunksModal.page * PAGE_SIZE + i + 1}</span>
                      <span style={{ color: 'var(--adm-text-sub)', fontSize: '11px', fontFamily: 'monospace' }}>{chunk.id}</span>
                    </div>
                    <div style={{ color: 'var(--adm-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{chunk.text}</div>
                    {Object.keys(chunk.metadata).length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(chunk.metadata).map(([k, v]) => (
                          <span key={k} style={{ fontSize: '11px', background: 'var(--adm-accent-tint)', color: 'var(--adm-accent)', borderRadius: '4px', padding: '2px 6px' }}>
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="adm-modal-footer">
              <button
                className="adm-btn-secondary"
                disabled={chunksModal.page === 0 || chunksModal.loading}
                onClick={() => handleViewChunks(chunksModal.doc, chunksModal.page - 1)}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="adm-btn-secondary"
                disabled={chunksModal.loading || (chunksModal.page + 1) * PAGE_SIZE >= chunksModal.total}
                onClick={() => handleViewChunks(chunksModal.doc, chunksModal.page + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

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
