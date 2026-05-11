import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Loader, X, RefreshCw, Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiListDocuments, apiUploadDocuments, apiIngestDocuments,
  apiDeleteDocument, apiListDocumentChunks,
  type DocumentListItem, type IngestStatus, type ChunkPreviewItem,
} from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';
import { IngestStatusBadge } from '../../components/admin/IngestStatusBadge';
import StatTile from '../../components/admin/StatTile';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const StatusCell: React.FC<{ status: IngestStatus }> = ({ status }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
    <IngestStatusBadge status={status} />
    <div className="kb-progress-track">
      <div className={`kb-progress-fill kb-progress-fill--${status}`} />
    </div>
  </div>
);

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
  const [docs, setDocs]           = useState<DocumentListItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dragging, setDragging]   = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reIngestingId, setReIngestingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [chunksModal, setChunksModal] = useState<ChunksModal | null>(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IngestStatus>('all');
  const { toasts, toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { setDocs(await apiListDocuments(user!.accessToken)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Failed to load documents', 'error'); }
    finally { setLoading(false); }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const hasActive = docs.some(d => d.ingest_status === 'pending' || d.ingest_status === 'ingesting');
    if (!hasActive) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [docs, load]);

  const stageFiles = (incoming: File[]) => {
    const accepted = incoming.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.json'));
    const rejected = incoming.length - accepted.length;
    if (rejected > 0) toast(`${rejected} file(s) skipped — only PDF or JSON accepted.`, 'error');
    if (!accepted.length) return;
    setStagedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const seen = new Set<string>();
      return [...prev, ...accepted.filter(f => { if (existing.has(f.name) || seen.has(f.name)) return false; seen.add(f.name); return true; })];
    });
  };

  const handleConfirmUpload = async () => {
    if (!stagedFiles.length) return;
    const files = [...stagedFiles];
    setStagedFiles([]);
    setUploading(true);
    try {
      const results = await apiUploadDocuments(user!.accessToken, files);
      const ok = results.filter(r => r.success);
      results.filter(r => !r.success).forEach(r => toast(`"${r.filename}": ${r.error ?? 'Upload failed'}`, 'error'));
      if (ok.length) toast(`${ok.length} file(s) uploaded. Ingestion running…`, 'success');
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const handleReIngest = async (id: number, filename: string) => {
    setReIngestingId(id);
    try {
      const results = await apiIngestDocuments(user!.accessToken, [id]);
      const r = results[0];
      if (!r?.error) toast(`"${filename}" re-ingestion started.`, 'success');
      else toast(`"${filename}": ${r.error}`, 'error');
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Re-ingestion failed', 'error'); }
    finally { setReIngestingId(null); }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await apiDeleteDocument(user!.accessToken, id);
      toast(`"${filename}" deleted.`, 'success');
      setDocs(p => p.filter(d => d.id !== id));
    } catch (e) { toast(e instanceof Error ? e.message : 'Delete failed', 'error'); }
    finally { setDeletingId(null); }
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

  const filtered = docs.filter(d => {
    if (statusFilter !== 'all' && d.ingest_status !== statusFilter) return false;
    if (search && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total    = docs.length;
  const ingested = docs.filter(d => d.ingest_status === 'ingested').length;
  const pending  = docs.filter(d => d.ingest_status === 'pending' || d.ingest_status === 'ingesting').length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Knowledge base</h1>
          <div className="page__sub">Ingest, monitor and manage the corpus that powers retrieval.</div>
        </div>
      </div>

      <div className="stats">
        <StatTile label="Documents"   value={total}    delta="+0" dir="flat" period="7-day intake" spark={[12,14,16,15,18,20,22,24,26,28,total||1]} />
        <StatTile label="Ingested"    value={ingested} delta="+0" dir="flat" period="last 7 days"  spark={[10,12,13,15,17,18,20,22,24,25,ingested||1]} />
        <StatTile label="In progress" value={pending}  delta="0"  dir="flat" period="awaiting"     spark={[3,2,3,4,2,3,2,3,4,2,pending||0]} />
      </div>

      <div className="kb-grid">
        <div
          className={`dropzone${dragging ? ' is-drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); stageFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.json" multiple style={{ display: 'none' }} onChange={e => { stageFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
          <div className="dropzone__icon"><Upload size={18} /></div>
          <div className="dropzone__title">Drop files to upload</div>
          <div className="dropzone__hint">PDF or JSON · up to 1 GB · multiple supported</div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 4 }}>Choose files</button>
        </div>
        <div className="kb-side">
          <h4>How ingestion works</h4>
          <div className="kb-side__list">
            <div className="kb-side__item"><span className="num">01</span><span>Upload accepts PDF and JSON. Files over 1 GB are rejected.</span></div>
            <div className="kb-side__item"><span className="num">02</span><span>Documents are split into chunks and embedded — usually within a few minutes.</span></div>
            <div className="kb-side__item"><span className="num">03</span><span>Once ingested, content becomes available to the assistant for retrieval.</span></div>
            <div className="kb-side__item"><span className="num">04</span><span>Re-ingest or delete any document at any time. Failed jobs can be retried.</span></div>
          </div>
        </div>
      </div>

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="kb-staged-panel" style={{ marginBottom: 20 }}>
          <div className="kb-staged-header">
            <span className="kb-staged-title">{stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} ready to upload</span>
            <div className="kb-staged-actions">
              <button className="btn btn--ghost btn--sm" onClick={() => setStagedFiles([])} disabled={uploading}>Clear all</button>
              <button className="btn btn--primary btn--sm" onClick={handleConfirmUpload} disabled={uploading}>
                {uploading ? <Loader size={13} className="kb-spin" /> : <Upload size={13} />}
                Confirm upload
              </button>
            </div>
          </div>
          <ul className="kb-staged-list">
            {stagedFiles.map(f => (
              <li key={f.name} className="kb-staged-item">
                <div className="file-icon"><FileText size={13} /></div>
                <span className="kb-staged-name">{f.name}</span>
                <span className="kb-staged-size">{formatBytes(f.size)}</span>
                <button className="kb-staged-remove" onClick={() => setStagedFiles(p => p.filter(x => x.name !== f.name))} disabled={uploading}><X size={13} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploading && (
        <div className="kb-processing-bar" style={{ marginBottom: 20 }}>
          <Loader size={14} className="kb-spin" />
          Uploading files…
        </div>
      )}

      {/* Documents table */}
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input placeholder="Search documents" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="chips">
            <button className={`chip${statusFilter === 'all'       ? ' is-on' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
            <button className={`chip${statusFilter === 'ingested'  ? ' is-on' : ''}`} onClick={() => setStatusFilter('ingested')}>Ingested</button>
            <button className={`chip${statusFilter === 'ingesting' ? ' is-on' : ''}`} onClick={() => setStatusFilter('ingesting')}>In progress</button>
            <button className={`chip${statusFilter === 'failed'    ? ' is-on' : ''}`} onClick={() => setStatusFilter('failed')}>Failed</button>
          </div>
          <span className="toolbar__count">{filtered.length} documents</span>
        </div>

        {loading ? (
          <div className="empty"><Loader size={20} style={{ animation: 'kb-rotate 1s linear infinite', color: 'var(--ink-4)' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <FileText size={28} className="ico" />
            <span className="t">No documents</span>
            <span className="s">Upload PDF or JSON files above to get started.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded by</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Chunks</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div className="file-cell">
                        <div className="file-icon"><FileText size={13} /></div>
                        <span className="file-name">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="muted">{doc.uploaded_by}</td>
                    <td className="num muted">{formatDate(doc.uploaded_at)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{doc.chunk_count > 0 ? doc.chunk_count.toLocaleString() : '—'}</td>
                    <td><StatusCell status={doc.ingest_status} /></td>
                    <td>
                      <div className="row-actions">
                        {doc.ingest_status === 'ingested' && doc.chunk_count > 0 && (
                          <button className="row-btn" title="Preview chunks" onClick={() => handleViewChunks(doc)}><Eye size={13} /></button>
                        )}
                        {doc.ingest_status === 'failed' && (
                          <button className="row-btn" title="Re-ingest" disabled={reIngestingId === doc.id} onClick={() => handleReIngest(doc.id, doc.filename)}>
                            {reIngestingId === doc.id ? <Loader size={13} className="kb-spin" /> : <RefreshCw size={13} />}
                          </button>
                        )}
                        <button className="row-btn row-btn--danger" title="Delete" disabled={deletingId === doc.id} onClick={() => handleDelete(doc.id, doc.filename)}>
                          <Trash2 size={13} />
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

      {/* Chunks modal */}
      {chunksModal && (
        <div className="adm-modal-overlay" onClick={() => setChunksModal(null)}>
          <div className="adm-modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Chunks — {chunksModal.doc.filename}</span>
              <button style={{ display: 'flex', cursor: 'pointer' }} onClick={() => setChunksModal(null)}><X size={16} /></button>
            </div>
            <div className="adm-modal-sub">
              {chunksModal.total.toLocaleString()} chunk{chunksModal.total !== 1 ? 's' : ''} · page {chunksModal.page + 1} of {Math.ceil(chunksModal.total / PAGE_SIZE)}
            </div>
            {chunksModal.loading ? (
              <div className="empty"><Loader size={18} style={{ animation: 'kb-rotate 1s linear infinite', color: 'var(--ink-4)' }} /></div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', marginTop: 12 }}>
                {chunksModal.chunks.map((chunk, i) => (
                  <div key={chunk.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600, minWidth: 28 }}>#{chunksModal.page * PAGE_SIZE + i + 1}</span>
                      <span style={{ color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{chunk.id}</span>
                    </div>
                    <div style={{ color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{chunk.text}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="adm-modal-footer">
              <button className="btn btn--ghost btn--sm" disabled={chunksModal.page === 0 || chunksModal.loading} onClick={() => handleViewChunks(chunksModal.doc, chunksModal.page - 1)}>
                <ChevronLeft size={13} /> Prev
              </button>
              <button className="btn btn--ghost btn--sm" disabled={chunksModal.loading || (chunksModal.page + 1) * PAGE_SIZE >= chunksModal.total} onClick={() => handleViewChunks(chunksModal.doc, chunksModal.page + 1)}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.map(t => (
        <div key={t.id} className={`adm-toast ${t.type}`} role="status">
          {t.type === 'success' ? <CheckCircle size={15} color="var(--success)" /> : <AlertCircle size={15} color="var(--danger)" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default KnowledgeBase;
