import { useState, useEffect, useCallback } from 'react';
import { Play, Trash2, Plus, DatabaseZap, CalendarClock, ChevronRight, X, Save } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  apiListEvalDataset, apiAddEvalEntry, apiDeleteEvalEntry, apiSeedEvalDataset,
  apiTriggerEvalRun, apiListEvalRuns, apiGetEvalRun, apiGetEvalSchedule, apiUpdateEvalSchedule,
  type DatasetEntryOut, type EvalRunOut, type EvalRunDetail, type EvalScheduleOut,
} from '../../lib/api';

const METRICS: { key: keyof EvalRunOut; label: string; color: string }[] = [
  { key: 'faithfulness',       label: 'Faithfulness',       color: '#1863dc' },
  { key: 'answer_relevancy',   label: 'Answer relevancy',   color: '#15803d' },
  { key: 'context_precision',  label: 'Context precision',  color: '#7c3aed' },
  { key: 'context_recall',     label: 'Context recall',     color: '#b45309' },
  { key: 'answer_correctness', label: 'Answer correctness', color: '#0891b2' },
];

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  completed: { cls: 'ev-pill ev-pill--success', label: 'Completed' },
  running:   { cls: 'ev-pill ev-pill--running',  label: 'Running'   },
  pending:   { cls: 'ev-pill ev-pill--pending',  label: 'Pending'   },
  failed:    { cls: 'ev-pill ev-pill--danger',   label: 'Failed'    },
};

function statusPill(status: string) {
  return STATUS_MAP[status] ?? { cls: 'ev-pill ev-pill--pending', label: status };
}

function fmtScore(v: number | null | undefined): string {
  if (v == null) return '—';
  return (v * 100).toFixed(1) + '%';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' });
}

const RagEvaluation: React.FC = () => {
  const { user } = useAuth();

  const [dataset,       setDataset]       = useState<DatasetEntryOut[]>([]);
  const [runs,          setRuns]          = useState<EvalRunOut[]>([]);
  const [schedule,      setSchedule]      = useState<EvalScheduleOut | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [triggering,    setTriggering]    = useState(false);
  const [seeding,       setSeeding]       = useState(false);
  const [cronDraft,     setCronDraft]     = useState('');
  const [savingCron,    setSavingCron]    = useState(false);
  const [tab,           setTab]           = useState<'runs' | 'dataset' | 'schedule'>('runs');

  const [addOpen,       setAddOpen]       = useState(false);
  const [addQuestion,   setAddQuestion]   = useState('');
  const [addTruth,      setAddTruth]      = useState('');
  const [adding,        setAdding]        = useState(false);

  const [detailRun,     setDetailRun]     = useState<EvalRunDetail | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteId,      setDeleteId]      = useState<number | null>(null);

  const closeDetail = useCallback(() => { setDetailOpen(false); setDetailRun(null); }, []);

  useEffect(() => {
    if (!detailOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailOpen, closeDetail]);

  const latestRun = runs.find(r => r.status === 'completed') ?? runs[0] ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ds, rs, sc] = await Promise.all([
        apiListEvalDataset(user.accessToken),
        apiListEvalRuns(user.accessToken),
        apiGetEvalSchedule(user.accessToken),
      ]);
      setDataset(ds);
      setRuns(rs);
      setSchedule(sc);
      setCronDraft(sc.cron);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleTrigger = async () => {
    if (!user) return;
    setTriggering(true);
    try {
      const run = await apiTriggerEvalRun(user.accessToken);
      setRuns(prev => [run, ...prev]);
    } catch { /* silent */ }
    finally { setTriggering(false); }
  };

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await apiSeedEvalDataset(user.accessToken);
      const ds = await apiListEvalDataset(user.accessToken);
      setDataset(ds);
    } catch { /* silent */ }
    finally { setSeeding(false); }
  };

  const handleAdd = async () => {
    if (!user || !addQuestion.trim() || !addTruth.trim()) return;
    setAdding(true);
    try {
      const entry = await apiAddEvalEntry(user.accessToken, {
        question: addQuestion.trim(),
        ground_truth: addTruth.trim(),
      });
      setDataset(prev => [entry, ...prev]);
      setAddQuestion(''); setAddTruth(''); setAddOpen(false);
    } catch { /* silent */ }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    setDeleteId(id);
    try {
      await apiDeleteEvalEntry(user.accessToken, id);
      setDataset(prev => prev.filter(e => e.id !== id));
    } catch { /* silent */ }
    finally { setDeleteId(null); }
  };

  const handleOpenDetail = async (run: EvalRunOut) => {
    if (!user) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await apiGetEvalRun(user.accessToken, run.id);
      setDetailRun(detail);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const handleSaveCron = async () => {
    if (!user || !cronDraft.trim()) return;
    setSavingCron(true);
    try {
      const sc = await apiUpdateEvalSchedule(user.accessToken, cronDraft.trim());
      setSchedule(sc);
    } catch { /* silent */ }
    finally { setSavingCron(false); }
  };

  const CRON_PRESETS = [
    { expr: '0 2 * * *', desc: 'Daily 2 AM'    },
    { expr: '0 2 * * 1', desc: 'Weekly Mon'     },
    { expr: '0 2 1 * *', desc: 'Monthly 1st'   },
  ];

  return (
    <div className="page">

      {/* ── Head ───────────────────────────────────────────── */}
      <div className="page__head">
        <div>
          <h1 className="page__title">RAG Evaluation</h1>
          <p className="page__sub">Automated quality scoring for the retrieval pipeline</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={handleTrigger}
          disabled={triggering}
        >
          <Play size={14} />
          {triggering ? 'Running…' : 'Run evaluation'}
        </button>
      </div>

      {/* ── Metrics strip ──────────────────────────────────── */}
      <div className="card ev-metrics-card">
        <div className="card__head">
          <span className="card__title">Latest scores</span>
          <span className="card__sub">
            {latestRun
              ? fmtDate(latestRun.completed_at ?? latestRun.started_at)
              : 'No completed runs yet'}
          </span>
          {latestRun && (
            <div className="right">
              <span className={statusPill(latestRun.status).cls}>
                {statusPill(latestRun.status).label}
              </span>
            </div>
          )}
        </div>

        <div className="ev-metrics-strip">
          {METRICS.map(m => {
            const raw = latestRun ? (latestRun[m.key] as number | null) : null;
            const pct = raw != null ? Math.round(raw * 100) : 0;
            return (
              <div key={m.key} className="ev-metric">
                <span className="ev-metric__label">{m.label}</span>
                <span
                  className="ev-metric__value"
                  style={{ color: raw != null ? m.color : 'var(--ink-4)' }}
                >
                  {raw != null ? `${pct}%` : '—'}
                </span>
                <div className="ev-metric__track">
                  <div
                    className="ev-metric__fill"
                    style={{ width: `${pct}%`, background: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="ev-tabs">
        <button
          className={`ev-tab${tab === 'runs' ? ' is-active' : ''}`}
          onClick={() => setTab('runs')}
        >
          Eval runs
          <span className="ev-tab__count">{runs.length}</span>
        </button>
        <button
          className={`ev-tab${tab === 'dataset' ? ' is-active' : ''}`}
          onClick={() => setTab('dataset')}
        >
          Dataset
          <span className="ev-tab__count">{dataset.length}</span>
        </button>
        <button
          className={`ev-tab${tab === 'schedule' ? ' is-active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          Schedule
        </button>
      </div>

      {/* ── Runs tab ───────────────────────────────────────── */}
      {tab === 'runs' && (
        <div className="card ev-content">
          {loading ? (
            <div className="ev-empty">Loading evaluation runs…</div>
          ) : runs.length === 0 ? (
            <div className="ev-empty">
              <Play size={20} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div>No evaluation runs yet.</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-4)' }}>
                Click "Run evaluation" to start the first run.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Triggered by</th>
                    <th>Status</th>
                    <th>Faith.</th>
                    <th>Relevancy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>Correctness</th>
                    <th>Started</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => {
                    const sp = statusPill(r.status);
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="ev-run-id">#{r.id}</span>
                        </td>
                        <td className="primary">{r.triggered_by}</td>
                        <td><span className={sp.cls}>{sp.label}</span></td>
                        <td className="num">{fmtScore(r.faithfulness)}</td>
                        <td className="num">{fmtScore(r.answer_relevancy)}</td>
                        <td className="num">{fmtScore(r.context_precision)}</td>
                        <td className="num">{fmtScore(r.context_recall)}</td>
                        <td className="num">{fmtScore(r.answer_correctness)}</td>
                        <td className="muted" style={{ fontSize: 12 }}>{fmtDate(r.started_at)}</td>
                        <td>
                          <button
                            className="row-btn"
                            onClick={() => handleOpenDetail(r)}
                            title="View details"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Dataset tab ────────────────────────────────────── */}
      {tab === 'dataset' && (
        <div className="card ev-content">
          <div className="card__head">
            <span className="card__title">Evaluation dataset</span>
            <span className="card__sub">{dataset.length} entries</span>
            <div className="right" style={{ gap: 6 }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={handleSeed}
                disabled={seeding}
              >
                <DatabaseZap size={13} />
                {seeding ? 'Seeding…' : 'Seed defaults'}
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => setAddOpen(v => !v)}
              >
                <Plus size={13} />
                Add entry
              </button>
            </div>
          </div>

          {addOpen && (
            <div className="ev-add-form">
              <div className="df-field">
                <label className="df-label">Question</label>
                <input
                  className="df-input"
                  placeholder="Enter test question…"
                  value={addQuestion}
                  onChange={e => setAddQuestion(e.target.value)}
                />
              </div>
              <div className="df-field">
                <label className="df-label">Ground truth answer</label>
                <textarea
                  className="df-input"
                  placeholder="Enter expected answer…"
                  value={addTruth}
                  onChange={e => setAddTruth(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 72 }}
                />
              </div>
              <div className="ev-add-actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => { setAddOpen(false); setAddQuestion(''); setAddTruth(''); }}
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleAdd}
                  disabled={adding || !addQuestion.trim() || !addTruth.trim()}
                >
                  {adding ? 'Adding…' : 'Add entry'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="ev-empty">Loading dataset…</div>
          ) : dataset.length === 0 ? (
            <div className="ev-empty">
              <DatabaseZap size={20} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div>No dataset entries.</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-4)' }}>
                Add entries manually or seed from built-in defaults.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Ground truth</th>
                    <th>Source</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dataset.map(e => (
                    <tr key={e.id}>
                      <td style={{ maxWidth: 260 }}>
                        <span className="ev-truncate" title={e.question}>{e.question}</span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="ev-truncate" title={e.ground_truth}>{e.ground_truth}</span>
                      </td>
                      <td>
                        <span className="ev-pill ev-pill--pending">{e.source}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtDate(e.created_at)}</td>
                      <td>
                        <button
                          className="row-btn row-btn--danger"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleteId === e.id}
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule tab ───────────────────────────────────── */}
      {tab === 'schedule' && (
        <div className="ev-content ev-schedule-layout">

          {/* Info panel */}
          <div className="ev-schedule-info">
            <div className="ev-schedule-info__icon">
              <CalendarClock size={22} />
            </div>
            <div className="ev-schedule-info__title">Auto-evaluation</div>
            <p className="ev-schedule-info__body">
              Set a cron expression to run evaluations on a repeating schedule.
              Scores are recorded automatically for trend analysis.
            </p>
            {schedule && (
              <div className="ev-schedule-info__status">
                <div className="ev-schedule-info__row">
                  <span>Current schedule</span>
                  <code className="ev-schedule-info__code">{schedule.cron}</code>
                </div>
                <div className="ev-schedule-info__row">
                  <span>Status</span>
                  <span className={schedule.is_active ? 'ev-pill ev-pill--success' : 'ev-pill ev-pill--pending'}>
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Form panel */}
          <div className="ev-schedule-form card">
            <div className="card__head">
              <span className="card__title">Cron expression</span>
            </div>
            <div className="ev-schedule-form__body">
              <div className="df-field">
                <label className="df-label">Schedule</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="df-input"
                    placeholder="e.g. 0 2 * * 1"
                    value={cronDraft}
                    onChange={e => setCronDraft(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveCron}
                    disabled={savingCron || !cronDraft.trim()}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <Save size={13} />
                    {savingCron ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <p className="df-hint">
                  Uses standard 5-field cron syntax: <code style={{ fontFamily: 'var(--font-mono)' }}>min hour dom month dow</code>
                </p>
              </div>

              <div>
                <div className="ev-schedule-presets-label">Presets</div>
                <div className="ev-cron-presets">
                  {CRON_PRESETS.map(ex => (
                    <button
                      key={ex.expr}
                      className="ev-cron-chip"
                      onClick={() => setCronDraft(ex.expr)}
                    >
                      <code>{ex.expr}</code>
                      <span>{ex.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Run detail modal ────────────────────────────────── */}
      {detailOpen && (
        <div
          className="ev-modal-scrim"
          onClick={closeDetail}
          role="dialog"
          aria-modal="true"
          aria-label="Evaluation run details"
        >
          <div className="ev-modal" onClick={e => e.stopPropagation()}>

            <div className="ev-modal__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ev-modal__title">
                  {detailRun ? `Run #${detailRun.id}` : 'Run details'}
                </span>
                {detailRun && (
                  <span className={statusPill(detailRun.status).cls}>
                    {statusPill(detailRun.status).label}
                  </span>
                )}
              </div>
              <button className="ev-modal__close" onClick={closeDetail} aria-label="Close">
                <X size={15} />
              </button>
            </div>

            {detailLoading ? (
              <div className="ev-modal__skeleton">
                <div className="ev-skel" style={{ height: 20, width: '40%' }} />
                <div className="ev-skel" style={{ height: 16, width: '60%' }} />
                <div className="ev-skel" style={{ height: 16, width: '50%' }} />
                <div className="ev-skel" style={{ height: 16, width: '55%' }} />
                <div className="ev-skel" style={{ height: 16, width: '45%' }} />
                <div className="ev-skel" style={{ height: 16, width: '58%' }} />
              </div>
            ) : detailRun ? (
              <>
                {/* Meta grid */}
                <div className="ev-modal__meta">
                  {[
                    { label: 'Triggered by', val: detailRun.triggered_by },
                    { label: 'Status',       val: <span className={statusPill(detailRun.status).cls}>{statusPill(detailRun.status).label}</span> },
                    { label: 'Started',      val: fmtDate(detailRun.started_at)   },
                    { label: 'Completed',    val: fmtDate(detailRun.completed_at) },
                  ].map(({ label, val }) => (
                    <div key={label} className="ev-modal__meta-cell">
                      <span className="ev-modal__meta-label">{label}</span>
                      <span className="ev-modal__meta-val">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Score bars */}
                <div className="ev-modal__body">
                  {detailRun.error && (
                    <div className="df-error" style={{ marginBottom: 4 }}>{detailRun.error}</div>
                  )}

                  <div>
                    <div className="ev-modal__section-label">Quality scores</div>
                    <div className="ev-score-rows">
                      {METRICS.map(m => {
                        const raw = detailRun[m.key] as number | null;
                        const pct = raw != null ? Math.round(raw * 100) : 0;
                        return (
                          <div key={m.key} className="ev-score-row">
                            <span className="ev-score-row__name">{m.label}</span>
                            <div className="ev-score-row__track">
                              <div
                                className="ev-score-row__fill"
                                style={{ width: `${pct}%`, background: m.color }}
                              />
                            </div>
                            <span className="ev-score-row__val" style={{ color: raw != null ? m.color : 'var(--ink-4)' }}>
                              {fmtScore(raw)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-question results */}
                  {detailRun.results && detailRun.results.length > 0 && (
                    <div>
                      <div className="ev-modal__section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Per-question results
                        <span className="ev-modal__count">{detailRun.results.length}</span>
                      </div>
                      <div className="ev-results">
                        {(detailRun.results as Record<string, unknown>[]).map((r, i) => (
                          <div key={i} className="ev-result">
                            <div className="ev-result__q">Q{i + 1}: {String(r.question ?? '')}</div>
                            {r.answer != null && (
                              <div className="ev-result__a">{String(r.answer)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};

export default RagEvaluation;
