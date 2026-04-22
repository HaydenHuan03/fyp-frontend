import { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiListDocuments, type DocumentListItem, type IngestStatus } from '../../lib/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const StatusBadge: React.FC<{ status: IngestStatus }> = ({ status }) => {
  const map: Record<IngestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: 'Pending',   cls: 'kb-badge-pending',   icon: <Clock size={11} /> },
    ingesting: { label: 'Ingesting', cls: 'kb-badge-ingesting', icon: <Clock size={11} /> },
    ingested:  { label: 'Ingested',  cls: 'kb-badge-ingested',  icon: <CheckCircle size={11} /> },
    failed:    { label: 'Failed',    cls: 'kb-badge-failed',    icon: <AlertCircle size={11} /> },
  };
  const { label, cls, icon } = map[status];
  return <span className={`adm-badge ${cls}`}>{icon}{label}</span>;
};

const Documents: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiListDocuments(user!.accessToken);
      setDocs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Group by uploader
  const grouped = docs.reduce<Record<string, DocumentListItem[]>>((acc, doc) => {
    (acc[doc.uploaded_by] ??= []).push(doc);
    return acc;
  }, {});

  const uploaders = Object.keys(grouped).sort();

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Documents</div>
          <div className="adm-page-sub">All uploaded documents, grouped by who uploaded them.</div>
        </div>
      </div>

      {loading && <div className="kb-empty-state">Loading…</div>}

      {error && (
        <div className="adm-notice danger" style={{ marginBottom: 0 }}>{error}</div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="kb-empty-state">
          <FileText size={32} color="var(--adm-text-sub)" />
          <p>No documents have been uploaded yet.</p>
        </div>
      )}

      {!loading && !error && uploaders.map(uploader => (
        <div key={uploader} className="adm-table-card" style={{ marginBottom: '20px' }}>
          <div className="adm-table-toolbar">
            <div className="docs-uploader-row">
              <div className="docs-uploader-avatar" aria-hidden="true">
                <User size={13} />
              </div>
              <span className="docs-uploader-name">{uploader}</span>
              <span className="adm-user-count">
                {grouped[uploader].length} file{grouped[uploader].length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {/* Desktop table */}
          <div className="adm-table-wrap adm-hide-mobile">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped[uploader].map(doc => (
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
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td><StatusBadge status={doc.ingest_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="adm-mobile-cards adm-show-mobile">
            {grouped[uploader].map(doc => (
              <div key={doc.id} className="adm-mobile-card">
                <div className="adm-mobile-card-header">
                  <div className="kb-filename-cell" style={{ flex: 1, minWidth: 0 }}>
                    <div className="kb-file-icon" aria-hidden="true">
                      <FileText size={14} />
                    </div>
                    <span className="kb-filename">{doc.filename}</span>
                  </div>
                  <StatusBadge status={doc.ingest_status} />
                </div>
                <div className="adm-mobile-card-details">
                  <div className="adm-mobile-card-detail">
                    <span className="adm-mobile-card-label">Uploaded</span>
                    <span className="adm-mobile-card-value">{formatDate(doc.uploaded_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Documents;
