import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Zap, MessageSquare, Clock, Banknote } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  apiGetQuerySummary, apiGetLatencyStats, apiGetTokenStats,
  apiGetRetrievalFrequency, apiGetIntentStats,
  type AnalyticsPeriod, type QuerySummary, type LatencyStats,
  type TokenStats, type RetrievalFrequencyItem, type IntentStat,
} from '../../lib/api';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
];

const INTENT_COLORS = [
  'var(--accent)', 'var(--success)', 'var(--warn)',
  'var(--danger)', '#8b5cf6', '#06b6d4', '#f97316',
];

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

const RagAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod]       = useState<AnalyticsPeriod>('week');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary,   setSummary]   = useState<QuerySummary | null>(null);
  const [latency,   setLatency]   = useState<LatencyStats | null>(null);
  const [tokens,    setTokens]    = useState<TokenStats | null>(null);
  const [retrieval, setRetrieval] = useState<RetrievalFrequencyItem[]>([]);
  const [intents,   setIntents]   = useState<IntentStat[]>([]);

  const load = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [sum, lat, tok, ret, int_] = await Promise.all([
        apiGetQuerySummary(user.accessToken, period),
        apiGetLatencyStats(user.accessToken),
        apiGetTokenStats(user.accessToken),
        apiGetRetrievalFrequency(user.accessToken),
        apiGetIntentStats(user.accessToken),
      ]);
      setSummary(sum);
      setLatency(lat);
      setTokens(tok);
      setRetrieval(ret);
      setIntents(int_);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [user, period]);

  useEffect(() => { load(); }, [load]);

  const maxRetrieval = retrieval.length > 0 ? Math.max(...retrieval.map(r => r.retrieval_count)) : 1;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">RAG Analytics</h1>
          <p className="page__sub">Retrieval-augmented generation performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="ra-period-tabs">
            {PERIOD_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`ra-period-tab${period === o.value ? ' is-active' : ''}`}
                onClick={() => setPeriod(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => load(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={13} className={refreshing ? 'ra-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat tiles ─────────────────────────────────────── */}
      <div className="stats">
        <div className="ra-stat">
          <div className="ra-stat__icon ra-stat__icon--accent"><MessageSquare size={16} /></div>
          <div className="ra-stat__body">
            <span className="ra-stat__label">Total queries</span>
            <span className="ra-stat__value">{loading ? '—' : fmt(summary?.total_queries)}</span>
            <span className="ra-stat__sub">{PERIOD_OPTIONS.find(p2 => p2.value === period)?.label}</span>
          </div>
        </div>

        <div className="ra-stat">
          <div className="ra-stat__icon ra-stat__icon--warn"><Zap size={16} /></div>
          <div className="ra-stat__body">
            <span className="ra-stat__label">Insufficient info rate</span>
            <span className="ra-stat__value">
              {loading ? '—' : pct((summary?.insufficient_info_rate ?? 0) * 100)}
            </span>
            <span className="ra-stat__sub">{loading ? '' : `${summary?.insufficient_info_count ?? 0} queries`}</span>
          </div>
        </div>

        <div className="ra-stat">
          <div className="ra-stat__icon ra-stat__icon--success"><Clock size={16} /></div>
          <div className="ra-stat__body">
            <span className="ra-stat__label">Avg latency</span>
            <span className="ra-stat__value">{loading ? '—' : `${fmt(latency?.avg_ms)} ms`}</span>
            <span className="ra-stat__sub">P95: {loading ? '—' : `${fmt(latency?.p95_ms)} ms`}</span>
          </div>
        </div>

        <div className="ra-stat">
          <div className="ra-stat__icon ra-stat__icon--purple"><Banknote size={16} /></div>
          <div className="ra-stat__body">
            <span className="ra-stat__label">Total tokens</span>
            <span className="ra-stat__value">{loading ? '—' : fmt(tokens?.total_tokens)}</span>
            <span className="ra-stat__sub">
              {loading ? '' : `↑${fmt(tokens?.avg_prompt_tokens, 0)} / ↓${fmt(tokens?.avg_completion_tokens, 0)} avg`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Latency breakdown ──────────────────────────────── */}
      <div className="ra-row">
        <div className="card ra-latency-card">
          <div className="card__head">
            <span className="card__title">Latency breakdown</span>
            <span className="card__sub">response time distribution</span>
          </div>
          <div className="ra-latency-bars">
            {[
              { label: 'P50', value: latency?.p50_ms, color: 'var(--success)' },
              { label: 'Avg', value: latency?.avg_ms, color: 'var(--accent)' },
              { label: 'P95', value: latency?.p95_ms, color: 'var(--warn)' },
            ].map(({ label, value, color }) => {
              const max = latency?.p95_ms ?? 1;
              const w = value != null && max > 0 ? Math.round((value / max) * 100) : 0;
              return (
                <div key={label} className="ra-latency-row">
                  <span className="ra-latency-label">{label}</span>
                  <div className="ra-latency-track">
                    <div className="ra-latency-fill" style={{ width: `${w}%`, background: color }} />
                  </div>
                  <span className="ra-latency-val">{loading ? '—' : `${fmt(value)} ms`}</span>
                </div>
              );
            })}
          </div>

          <div className="card__head" style={{ marginTop: 24, borderTop: '1px solid var(--line-2)', paddingTop: 16 }}>
            <span className="card__title">Token usage</span>
            <span className="card__sub">prompt vs completion</span>
          </div>
          <div className="ra-latency-bars">
            {[
              { label: 'Prompt',     value: tokens?.avg_prompt_tokens,     color: 'var(--accent)' },
              { label: 'Completion', value: tokens?.avg_completion_tokens, color: 'var(--success)' },
            ].map(({ label, value, color }) => {
              const max = Math.max(tokens?.avg_prompt_tokens ?? 0, tokens?.avg_completion_tokens ?? 0, 1);
              const w = value != null ? Math.round((value / max) * 100) : 0;
              return (
                <div key={label} className="ra-latency-row">
                  <span className="ra-latency-label">{label}</span>
                  <div className="ra-latency-track">
                    <div className="ra-latency-fill" style={{ width: `${w}%`, background: color }} />
                  </div>
                  <span className="ra-latency-val">{loading ? '—' : fmt(value, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intent distribution */}
        <div className="card">
          <div className="card__head">
            <span className="card__title">Query intents</span>
            <span className="card__sub">distribution by intent type</span>
          </div>
          {loading ? (
            <div className="ra-empty">Loading…</div>
          ) : intents.length === 0 ? (
            <div className="ra-empty">No intent data available</div>
          ) : (
            <div className="ra-intents">
              {intents.map((it, i) => (
                <div key={it.intent} className="ra-intent-row">
                  <div className="ra-intent-info">
                    <span className="ra-intent-dot" style={{ background: INTENT_COLORS[i % INTENT_COLORS.length] }} />
                    <span className="ra-intent-name">{it.intent}</span>
                    <span className="ra-intent-count">{it.count}</span>
                  </div>
                  <div className="ra-intent-track">
                    <div
                      className="ra-intent-fill"
                      style={{ width: `${it.percentage}%`, background: INTENT_COLORS[i % INTENT_COLORS.length] }}
                    />
                  </div>
                  <span className="ra-intent-pct">{pct(it.percentage)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Document retrieval frequency ───────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__head">
          <span className="card__title">Document retrieval frequency</span>
          <span className="card__sub">how often each document is retrieved</span>
        </div>
        {loading ? (
          <div className="ra-empty">Loading…</div>
        ) : retrieval.length === 0 ? (
          <div className="ra-empty">No retrieval data available</div>
        ) : (
          <div className="ra-retrieval-list">
            {retrieval.map((r, i) => (
              <div key={r.filename} className="ra-retrieval-row">
                <span className="ra-retrieval-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="ra-retrieval-name" title={r.filename}>{r.filename}</span>
                <div className="ra-retrieval-track">
                  <div
                    className="ra-retrieval-fill"
                    style={{ width: `${Math.round((r.retrieval_count / maxRetrieval) * 100)}%` }}
                  />
                </div>
                <span className="ra-retrieval-count">{r.retrieval_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RagAnalytics;
