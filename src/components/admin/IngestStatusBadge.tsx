import { Loader } from 'lucide-react';
import type { IngestStatus } from '../../lib/api';

export const IngestStatusBadge: React.FC<{ status: IngestStatus }> = ({ status }) => {
  if (status === 'ingested')  return <span className="pill pill--success pill--dot">Ingested</span>;
  if (status === 'ingesting') return (
    <span className="pill pill--accent pill--dot" style={{ gap: 6 }}>
      <Loader size={10} style={{ animation: 'kb-rotate 1s linear infinite' }} />
      Ingesting
    </span>
  );
  if (status === 'pending')   return <span className="pill pill--warn pill--dot">Pending</span>;
  if (status === 'failed')    return <span className="pill pill--danger pill--dot">Failed</span>;
  return <span className="pill">{status}</span>;
};
