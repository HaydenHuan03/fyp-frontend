import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader, X, Eye } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiListDocuments, apiGetDocumentPreviewUrl, type DocumentListItem } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { IngestStatusBadge } from '../../components/admin/IngestStatusBadge';
import { useToast } from '../../hooks/useToast';

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

interface PreviewState {
  filename: string;
  url: string;
}

const Documents: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs]     = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const load = useCallback(async () => {
    try { setDocs(await apiListDocuments(user!.accessToken)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load documents'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const openPreview = async (doc: DocumentListItem) => {
    if (previewLoadingId !== null) return;
    if (doc.ingest_status === 'pending' || doc.ingest_status === 'ingesting') {
      toast('Document is still being processed.', 'error');
      return;
    }
    setPreviewLoadingId(doc.id);
    try {
      const res = await apiGetDocumentPreviewUrl(user!.accessToken, doc.id);
      setPreview({ filename: res.filename, url: res.url });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to open preview', 'error');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const grouped = docs.reduce<Record<string, DocumentListItem[]>>((acc, doc) => {
    (acc[doc.uploaded_by] ??= []).push(doc);
    return acc;
  }, {});
  const uploaders = Object.keys(grouped).sort();

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Documents</h1>
          <div className="page__sub">All uploaded documents, grouped by who uploaded them.</div>
        </div>
      </div>

      {loading && (
        <div className="empty"><span className="s">Loading…</span></div>
      )}

      {error && (
        <div className="adm-notice danger" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="empty">
          <FileText size={28} className="ico" />
          <span className="t">No documents uploaded yet</span>
        </div>
      )}

      {!loading && !error && uploaders.map(uploader => (
        <div key={uploader} className="card docs-card">
          <div className="docs-card__head">
            <div className="avatar">{initials(uploader)}</div>
            <div>
              <div className="name">{uploader}</div>
              <div className="meta">{grouped[uploader].length} file{grouped[uploader].length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Chunks</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {grouped[uploader].map(doc => {
                  const isLoading = previewLoadingId === doc.id;
                  const disabled = doc.ingest_status === 'pending' || doc.ingest_status === 'ingesting';
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className="file-cell">
                          <div className="file-icon"><FileText size={13} /></div>
                          <span className="file-name">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="num muted">{formatDate(doc.uploaded_at)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {doc.chunk_count > 0 ? doc.chunk_count.toLocaleString() : '—'}
                      </td>
                      <td><IngestStatusBadge status={doc.ingest_status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => openPreview(doc)}
                          disabled={disabled || isLoading}
                          title={disabled ? 'Document is still processing' : 'Preview PDF'}
                        >
                          {isLoading ? <Loader size={12} className="spin" /> : <Eye size={12} />}
                          Preview
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {preview && (
        <>
          <div className="pdf-modal__scrim" onClick={() => setPreview(null)} />
          <div className="pdf-modal" role="dialog" aria-modal="true">
            <header className="pdf-modal__head">
              <div className="pdf-modal__title">
                <FileText size={14} />
                <span>{preview.filename}</span>
              </div>
              <div className="pdf-modal__actions">
                <a className="btn btn--ghost btn--sm" href={preview.url} target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
                <button className="row-btn" onClick={() => setPreview(null)} title="Close (Esc)">
                  <X size={14} />
                </button>
              </div>
            </header>
            <div className="pdf-modal__body">
              <iframe
                src={preview.url}
                title={preview.filename}
                className="pdf-modal__iframe"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Documents;
