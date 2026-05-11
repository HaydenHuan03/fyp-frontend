import { useState, useEffect, useCallback } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiListDocuments, type DocumentListItem } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { IngestStatusBadge } from '../../components/admin/IngestStatusBadge';

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

const Documents: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs]     = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = useCallback(async () => {
    try { setDocs(await apiListDocuments(user!.accessToken)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load documents'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

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
            <div className="right">
              <button className="btn btn--ghost btn--sm"><ExternalLink size={12} /> View profile</button>
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
                </tr>
              </thead>
              <tbody>
                {grouped[uploader].map(doc => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Documents;
