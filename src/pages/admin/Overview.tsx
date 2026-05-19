import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import { apiGetUsers, apiListDocuments, apiListAlerts } from '../../lib/api';
import StatTile from '../../components/admin/StatTile';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface Stats { investigators: number; documents: number; ingested: number; alerts: number }

const Overview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState<{ query: string; user_id: string; created_at: string }[]>([]);

  const firstName = user?.email?.split('@')[0] || 'Admin';

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [users, docs, alerts] = await Promise.all([
        apiGetUsers(user.accessToken),
        apiListDocuments(user.accessToken),
        apiListAlerts(user.accessToken),
      ]);
      setStats({
        investigators: users.items.filter(u => u.role === 'user').length,
        documents: docs.length,
        ingested: docs.filter(d => d.ingest_status === 'ingested').length,
        alerts: alerts.length,
      });
      setRecentAlerts(alerts.slice(0, 6));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const s = stats;

  return (
    <div className="page">

      <header className="page__head">
        <div>
          <p className="page__eyebrow">
            <span className="page__eyebrow-dot" aria-hidden="true" />
            Workspace overview
          </p>
          <h1 className="page__title">{greeting()}, {firstName}.</h1>
          <p className="page__sub">
            A quick read of activity across the platform — investigators,
            knowledge ingestion, and flagged queries.
          </p>
        </div>
      </header>

      <div className="stats">
        <StatTile
          label="Investigators"
          value={loading ? '—' : (s?.investigators ?? 0)}
          delta="+0" dir="flat" period="all users"
          spark={[4,6,5,7,9,8,11,12,10,13,s?.investigators||1]}
        />
        <StatTile
          label="Documents"
          value={loading ? '—' : (s?.documents ?? 0)}
          delta="+0" dir="flat" period="uploaded"
          spark={[12,14,15,13,17,18,16,20,22,24,s?.documents||1]}
        />
        <StatTile
          label="Ingested"
          value={loading ? '—' : (s?.ingested ?? 0)}
          delta="+0" dir="flat" period="ready for retrieval"
          spark={[10,12,13,15,17,18,20,22,24,25,s?.ingested||1]}
        />
        <StatTile
          label="Active alerts"
          value={loading ? '—' : (s?.alerts ?? 0)}
          delta="+0" dir={s && s.alerts > 0 ? 'up' : 'flat'} period="last 24h"
          spark={[1,0,2,1,3,2,1,4,3,5,s?.alerts||0]}
          danger
        />
      </div>

      <div className="ov-grid">

        {/* Recent alerts */}
        <section className="card">
          <div className="card__head">
            <span className="card__title">Recent alerts</span>
            <span className="card__sub">last flagged queries</span>
            <div className="right">
              <button className="btn btn--ghost btn--sm">View all</button>
            </div>
          </div>
          <div className="feed">
            {loading ? (
              <div className="empty">
                <span className="s">Loading recent activity…</span>
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="empty">
                <span className="t">No alerts</span>
                <span className="s">All user queries look clean.</span>
              </div>
            ) : recentAlerts.map((a, i) => (
              <div key={i} className="feed__item">
                <span className="feed__time">{fmtTime(a.created_at)}</span>
                <span className="feed__line">
                  <span className="dot dot--danger" />
                  <span className="who-tag">{a.user_id.slice(0, 8)}</span>
                  <span>flagged query</span>
                  <span className="obj-tag">
                    {a.query.length > 50 ? a.query.slice(0, 50) + '…' : a.query}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Side column */}
        <aside className="gauge">
          <div className="card__head">
            <span className="card__title">Top contributors</span>
            <span className="card__sub">by uploads</span>
          </div>
          {loading || !s ? (
            <div className="empty"><span className="s">Loading…</span></div>
          ) : s.documents === 0 ? (
            <div className="empty">
              <span className="t">Nothing here yet</span>
              <span className="s">No documents have been uploaded.</span>
            </div>
          ) : (
            <div className="contrib__row">
              <span className="contrib__rank">01</span>
              <div className="avatar avatar--sm">{firstName.slice(0, 1).toUpperCase()}</div>
              <span style={{ color: 'var(--ink)', fontWeight: 500, flex: 1 }}>Platform total</span>
              <span className="contrib__bar"><span style={{ width: '100%' }} /></span>
              <span className="contrib__num">{s.documents}</span>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
};

export default Overview;
