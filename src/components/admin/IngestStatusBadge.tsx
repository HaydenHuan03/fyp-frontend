import { CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import type { IngestStatus } from '../../lib/api';

const CONFIG: Record<IngestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',    cls: 'kb-badge-pending',   icon: <Clock size={11} /> },
  ingesting: { label: 'Ingesting…', cls: 'kb-badge-ingesting', icon: <Loader size={11} className="kb-spin" /> },
  ingested:  { label: 'Ingested',   cls: 'kb-badge-ingested',  icon: <CheckCircle size={11} /> },
  failed:    { label: 'Failed',     cls: 'kb-badge-failed',    icon: <AlertCircle size={11} /> },
};

export const IngestStatusBadge: React.FC<{ status: IngestStatus }> = ({ status }) => {
  const { label, cls, icon } = CONFIG[status];
  return <span className={`adm-badge ${cls}`}>{icon}{label}</span>;
};
