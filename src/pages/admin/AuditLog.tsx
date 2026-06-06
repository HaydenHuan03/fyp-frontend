import { useState, useEffect, useMemo } from 'react';
import {
  Upload, Trash2, UserPlus, UserCheck, UserX, ShieldAlert,
  ShieldCheck, KeyRound, History, Search, Circle, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiListAuditLogs, type AuditLogEntry } from '../../lib/api';

const ACTION_META: Record<string, { Icon: React.ElementType; tone: string }> = {
  'document.upload':   { Icon: Upload,      tone: '' },
  'document.delete':   { Icon: Trash2,      tone: 'tone--danger' },
  'user.create':       { Icon: UserPlus,    tone: 'tone--accent' },
  'user.update':       { Icon: UserCheck,   tone: '' },
  'user.activate':     { Icon: UserCheck,   tone: 'tone--success' },
  'user.delete':       { Icon: UserX,       tone: 'tone--danger' },
  'alert.create':      { Icon: ShieldAlert, tone: 'tone--danger' },
  'alert.dismiss':     { Icon: ShieldCheck, tone: 'tone--success' },
  'system.key_rotate': { Icon: KeyRound,    tone: '' },
};

type ActionFilter = 'all' | 'doc' | 'user' | 'alert' | 'system';

const PAGE_SIZE = 50;

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const AuditLog: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries]           = useState<AuditLogEntry[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [page, setPage]                 = useState(0);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const resourceType =
        actionFilter === 'doc'    ? 'document' :
        actionFilter === 'user'   ? 'user' :
        actionFilter === 'alert'  ? 'alert' :
        actionFilter === 'system' ? 'system' : undefined;
      const data = await apiListAuditLogs(user.accessToken, {
        resource_type: resourceType,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [actionFilter, page]);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(a =>
      a.user_id.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      (a.resource_type ?? '').toLowerCase().includes(q) ||
      (a.resource_id ?? '').toLowerCase().includes(q) ||
      (a.details ?? '').toLowerCase().includes(q),
    );
  }, [entries, search]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Audit log</h1>
          <div className="page__sub">Every administrative action — upload, delete, role change, alert dismissal.</div>
        </div>
        <button className="btn btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search by actor, action, resource"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips">
            <button className={`chip${actionFilter === 'all'    ? ' is-on' : ''}`} onClick={() => { setActionFilter('all');    setPage(0); }}>All</button>
            <button className={`chip${actionFilter === 'doc'    ? ' is-on' : ''}`} onClick={() => { setActionFilter('doc');    setPage(0); }}>Documents</button>
            <button className={`chip${actionFilter === 'user'   ? ' is-on' : ''}`} onClick={() => { setActionFilter('user');   setPage(0); }}>Users</button>
            <button className={`chip${actionFilter === 'alert'  ? ' is-on' : ''}`} onClick={() => { setActionFilter('alert');  setPage(0); }}>Alerts</button>
            <button className={`chip${actionFilter === 'system' ? ' is-on' : ''}`} onClick={() => { setActionFilter('system'); setPage(0); }}>System</button>
          </div>
          <span className="toolbar__count">{filtered.length} entries</span>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', margin: '0 0 16px',
            background: 'var(--danger-tint)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 'var(--r)', fontSize: 13, color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty">
            <RefreshCw size={24} className="ico spin" />
            <span className="t">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <History size={28} className="ico" />
            <span className="t">No audit entries</span>
            <span className="s">No events match the current filter.</span>
          </div>
        ) : (
          <ul className="audit">
            {filtered.map(a => {
              const key = `${a.resource_type ?? ''}.${a.action}`;
              const meta = ACTION_META[key] || ACTION_META[a.action] || { Icon: Circle, tone: '' };
              const { Icon } = meta;
              return (
                <li key={a.id} className="audit__row">
                  <span className={`audit__icon ${meta.tone}`}><Icon size={13} /></span>
                  <span className="audit__ts num">{formatTs(a.created_at)}</span>
                  <span className="audit__actor">{a.user_id}</span>
                  <span className="audit__action mono">{a.action}</span>
                  <span className="audit__target">{[a.resource_type, a.resource_id].filter(Boolean).join(' · ')}</span>
                  <span className="audit__meta muted">{a.details ?? ''}</span>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && (
          <div className="toolbar" style={{ borderTop: '1px solid var(--line)', marginTop: 0, paddingTop: 12 }}>
            <button
              className="btn btn--ghost btn--sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Page {page + 1}</span>
            <button
              className="btn btn--ghost btn--sm"
              disabled={entries.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
