import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, Loader, Settings2, Eye, X as XIcon } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiListAlerts, apiDeleteAlert, type AlertItem } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../lib/utils';
import StatTile from '../../components/admin/StatTile';

const Alerts: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts]   = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [scope, setScope]     = useState<'all' | 'high' | 'med' | 'low'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toasts, toast } = useToast();

  const load = useCallback(async () => {
    try {
      setAlerts(await apiListAlerts(user!.accessToken));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiDeleteAlert(user!.accessToken, id);
      setAlerts(p => p.filter(a => a.id !== id));
      toast('Alert dismissed.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to dismiss alert', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = alerts.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.query.toLowerCase().includes(q) && !a.user_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = alerts.length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Alerts</h1>
          <div className="page__sub">Flagged user queries matching prompt-injection or jailbreak patterns.</div>
        </div>
        <button className="btn btn--ghost"><Settings2 size={14} /> Detection rules</button>
      </div>

      <div className="stats">
        <StatTile label="Active" value={total} delta={total > 0 ? `+${total}` : '0'} dir={total > 0 ? 'up' : 'flat'} period="vs. yesterday" spark={[1,2,1,3,2,4,3,5,4,6,total||0]} danger />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search flagged queries"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips">
            <button className={`chip${scope === 'all' ? ' is-on' : ''}`} onClick={() => setScope('all')}>All</button>
            <button className={`chip${scope === 'high' ? ' is-on' : ''}`} onClick={() => setScope('high')}>High</button>
            <button className={`chip${scope === 'med'  ? ' is-on' : ''}`} onClick={() => setScope('med')}>Medium</button>
            <button className={`chip${scope === 'low'  ? ' is-on' : ''}`} onClick={() => setScope('low')}>Low</button>
          </div>
          <span className="toolbar__count">{filtered.length} alerts</span>
        </div>
      </div>

      {loading ? (
        <div className="empty">
          <Loader size={22} style={{ animation: 'kb-rotate 1s linear infinite', color: 'var(--ink-4)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <ShieldAlert size={28} className="ico" />
          <span className="t">No alerts</span>
          <span className="s">All user queries look clean.</span>
        </div>
      ) : (
        filtered.map(a => (
          <div key={a.id} className="alert-row">
            <span className="alert-row__sev" />
            <div className="alert-row__body">
              <div className="alert-row__top">
                <span className="pattern">prompt injection</span>
                <span className="sep">·</span>
                <span>{formatDateTime(a.created_at)}</span>
              </div>
              <div className="alert-row__quote">&ldquo;{a.query}&rdquo;</div>
              <div className="alert-row__bottom">
                <span className="who-tag">{a.user_id}</span>
                {a.conversation_id != null && <span>Conversation #{a.conversation_id}</span>}
                {a.chat_message_id  != null && <span>Message #{a.chat_message_id}</span>}
              </div>
            </div>
            <div className="alert-row__actions" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn btn--ghost btn--sm"><Eye size={12} /> Open</button>
              <button
                className="btn btn--danger btn--sm"
                disabled={deletingId === a.id}
                onClick={() => handleDelete(a.id)}
              >
                {deletingId === a.id
                  ? <Loader size={12} style={{ animation: 'kb-rotate 1s linear infinite' }} />
                  : <XIcon size={12} />}
                Dismiss
              </button>
            </div>
          </div>
        ))
      )}

      {toasts.map(t => (
        <div key={t.id} className={`adm-toast ${t.type}`} role="status">
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default Alerts;
