import { useState, useMemo } from 'react';
import {
  Upload, Trash2, UserPlus, UserCheck, UserX, ShieldAlert,
  ShieldCheck, KeyRound, History, Search, Download, Circle,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  meta: string;
}

const SAMPLE: AuditEntry[] = [];

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

const AuditLog: React.FC = () => {
  const [search, setSearch]             = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  const filtered = useMemo(() => {
    let r = SAMPLE;
    if (actionFilter === 'doc')    r = r.filter(a => a.action.startsWith('document.'));
    if (actionFilter === 'user')   r = r.filter(a => a.action.startsWith('user.'));
    if (actionFilter === 'alert')  r = r.filter(a => a.action.startsWith('alert.'));
    if (actionFilter === 'system') r = r.filter(a => a.action.startsWith('system.'));
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(a => a.actor.toLowerCase().includes(q) || a.target.toLowerCase().includes(q) || a.action.toLowerCase().includes(q));
    }
    return r;
  }, [search, actionFilter]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Audit log</h1>
          <div className="page__sub">Every administrative action — upload, delete, role change, alert dismissal.</div>
        </div>
        <button className="btn btn--ghost"><Download size={14} /> Export</button>
      </div>

      {/* Backend gap notice */}
      <div style={{
        background: 'var(--warn-tint)', border: '1px solid rgba(180,83,9,0.2)',
        borderRadius: 'var(--r-2)', padding: '12px 16px', marginBottom: 24,
        fontSize: 13, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <History size={15} />
        <span>
          Requires an <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>audit_events</code> table, write helpers in existing routers, and <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>GET /admin/audit</code> (paginated, filterable by action prefix).
        </span>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search by actor, target or action"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips">
            <button className={`chip${actionFilter === 'all'    ? ' is-on' : ''}`} onClick={() => setActionFilter('all')}>All</button>
            <button className={`chip${actionFilter === 'doc'    ? ' is-on' : ''}`} onClick={() => setActionFilter('doc')}>Documents</button>
            <button className={`chip${actionFilter === 'user'   ? ' is-on' : ''}`} onClick={() => setActionFilter('user')}>Users</button>
            <button className={`chip${actionFilter === 'alert'  ? ' is-on' : ''}`} onClick={() => setActionFilter('alert')}>Alerts</button>
            <button className={`chip${actionFilter === 'system' ? ' is-on' : ''}`} onClick={() => setActionFilter('system')}>System</button>
          </div>
          <span className="toolbar__count">{filtered.length} entries</span>
        </div>

        {SAMPLE.length === 0 ? (
          <div className="empty">
            <History size={28} className="ico" />
            <span className="t">No audit entries</span>
            <span className="s">Audit events will appear here once the backend endpoint is wired up.</span>
          </div>
        ) : (
          <ul className="audit">
            {filtered.map((a, i) => {
              const meta = ACTION_META[a.action] || { Icon: Circle, tone: '' };
              const { Icon } = meta;
              return (
                <li key={i} className="audit__row">
                  <span className={`audit__icon ${meta.tone}`}><Icon size={13} /></span>
                  <span className="audit__ts num">{a.ts}</span>
                  <span className="audit__actor">{a.actor}</span>
                  <span className="audit__action mono">{a.action}</span>
                  <span className="audit__target">{a.target}</span>
                  <span className="audit__meta muted">{a.meta}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
