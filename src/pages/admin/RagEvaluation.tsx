import { useState, useEffect, useCallback } from 'react';
import { Play, Trash2, Plus, DatabaseZap, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  apiListEvalDataset, apiAddEvalEntry, apiDeleteEvalEntry, apiSeedEvalDataset,
  apiTriggerEvalRun, apiListEvalRuns, apiGetEvalRun,
  type DatasetEntryOut, type EvalRunOut, type EvalRunDetail,
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
  const [loading,       setLoading]       = useState(true);
  const [triggering,    setTriggering]    = useState(false);
  const [seeding,       setSeeding]       = useState(false);
  const [tab,           setTab]           = useState<'runs' | 'dataset'>('runs');

  const [addOpen,       setAddOpen]       = useState(false);
  const [addQuestion,   setAddQuestion]   = useState('');
  const [addTruth,      setAddTruth]      = useState('');
  const [adding,        setAdding]        = useState(false);

  const [detailRun,     setDetailRun]     = useState<EvalRunDetail | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteId,      setDeleteId]      = useState<number | null>(null);

  // Mobile bottom sheet for dataset entries
  const [sheetEntry,    setSheetEntry]    = useState<DatasetEntryOut | null>(null);

  const closeDetail = useCallback(() => { setDetailOpen(false); setDetailRun(null); }, []);

  useEffect(() => {
    if (!detailOpen && !sheetEntry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeDetail(); setSheetEntry(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailOpen, sheetEntry, closeDetail]);

  const latestRun = runs.find(r => r.status === 'completed') ?? runs[0] ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ds, rs] = await Promise.all([
        apiListEvalDataset(user.accessToken),
        apiListEvalRuns(user.accessToken),
      ]);
      setDataset(ds);
      setRuns(rs);
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
      if (sheetEntry?.id === id) setSheetEntry(null);
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

  return (
    <div className="page">

      {/* ── Head ── */}
      <div className="page__head">
        <div>
          <h1 className="page__title">RAG Evaluation</h1>
          <p className="page__sub">Automated quality scoring for the retrieval pipeline</p>
        </div>
        <button className="btn btn--primary" onClick={handleTrigger} disabled={triggering}>
          <Play size={14} />
          {triggering ? 'Running…' : 'Run evaluation'}
        </button>
      </div>

      {/* ── Latest scores strip ── */}
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
                <span className="ev-metric__value" style={{ color: raw != null ? m.color : 'var(--ink-4)' }}>
                  {raw != null ? `${pct}%` : '—'}
                </span>
                <div className="ev-metric__track">
                  <div className="ev-metric__fill" style={{ width: `${pct}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ev-tabs">
        <button className={`ev-tab${tab === 'runs' ? ' is-active' : ''}`} onClick={() => setTab('runs')}>
          Eval runs
          <span className="ev-tab__count">{runs.length}</span>
        </button>
        <button className={`ev-tab${tab === 'dataset' ? ' is-active' : ''}`} onClick={() => setTab('dataset')}>
          Dataset
          <span className="ev-tab__count">{dataset.length}</span>
        </button>
      </div>

      {/* ── Runs tab ── */}
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
            <>
              {/* Desktop table */}
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
                          <td><span className="ev-run-id">#{r.id}</span></td>
                          <td className="primary">{r.triggered_by}</td>
                          <td><span className={sp.cls}>{sp.label}</span></td>
                          <td className="num">{fmtScore(r.faithfulness)}</td>
                          <td className="num">{fmtScore(r.answer_relevancy)}</td>
                          <td className="num">{fmtScore(r.context_precision)}</td>
                          <td className="num">{fmtScore(r.context_recall)}</td>
                          <td className="num">{fmtScore(r.answer_correctness)}</td>
                          <td className="muted" style={{ fontSize: 12 }}>{fmtDate(r.started_at)}</td>
                          <td>
                            <button className="row-btn" onClick={() => handleOpenDetail(r)} title="View details">
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile compact list */}
              <div className="mob-list">
                {runs.map(r => {
                  const sp = statusPill(r.status);
                  const faith = r.faithfulness != null ? Math.round(r.faithfulness * 100) + '%' : '—';
                  return (
                    <button key={r.id} className="mob-row" onClick={() => handleOpenDetail(r)}>
                      <div className="mob-row__info">
                        <span className="mob-row__name">Run #{r.id} · {faith} faith.</span>
                        <span className="mob-row__sub">{r.triggered_by} · {fmtDate(r.started_at)}</span>
                      </div>
                      <span className={sp.cls}>{sp.label}</span>
                      <ChevronRight size={14} className="mob-row__chevron" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Dataset tab ── */}
      {tab === 'dataset' && (
        <div className="card ev-content">
          <div className="card__head">
            <span className="card__title">Evaluation dataset</span>
            <span className="card__sub">{dataset.length} entries</span>
            <div className="right" style={{ gap: 6 }}>
              <button className="btn btn--ghost btn--sm" onClick={handleSeed} disabled={seeding}>
                <DatabaseZap size={13} />
                {seeding ? 'Seeding…' : 'Seed defaults'}
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => setAddOpen(v => !v)}>
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
            <>
              {/* Desktop table */}
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
                        <td><span className="ev-pill ev-pill--pending">{e.source}</span></td>
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

              {/* Mobile compact list */}
              <div className="mob-list">
                {dataset.map(e => (
                  <button key={e.id} className="mob-row" onClick={() => setSheetEntry(e)}>
                    <div className="mob-row__info">
                      <span className="mob-row__name">{e.question}</span>
                      <span className="mob-row__sub">{e.source} · {fmtDate(e.created_at)}</span>
                    </div>
                    <ChevronRight size={14} className="mob-row__chevron" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Run detail modal ── */}
      {detailOpen && (
        <div className="ev-modal-scrim" onClick={closeDetail} role="dialog" aria-modal="true" aria-label="Evaluation run details">
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
                {[40, 60, 50, 55, 45, 58].map((w, i) => (
                  <div key={i} className="ev-skel" style={{ height: i === 0 ? 20 : 16, width: `${w}%` }} />
                ))}
              </div>
            ) : detailRun ? (
              <>
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
                              <div className="ev-score-row__fill" style={{ width: `${pct}%`, background: m.color }} />
                            </div>
                            <span className="ev-score-row__val" style={{ color: raw != null ? m.color : 'var(--ink-4)' }}>
                              {fmtScore(raw)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

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
                            {r.answer != null && <div className="ev-result__a">{String(r.answer)}</div>}
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

      {/* ── Dataset entry bottom sheet (mobile) ── */}
      {sheetEntry && (
        <>
          <div className="mob-sheet__scrim" onClick={() => setSheetEntry(null)} aria-hidden="true" />
          <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="Dataset entry">
            <div className="mob-sheet__handle" />
            <div className="mob-sheet__head">
              <div className="mob-sheet__head-info">
                <div className="mob-sheet__title">Dataset entry</div>
                <div className="mob-sheet__sub">{sheetEntry.source} · {fmtDate(sheetEntry.created_at)}</div>
              </div>
              <button className="row-btn" onClick={() => setSheetEntry(null)} title="Close"><X size={14} /></button>
            </div>
            <div className="mob-sheet__body">
              <div className="mob-sheet__field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="mob-sheet__label">Question</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sheetEntry.question}</span>
              </div>
              <div className="mob-sheet__field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="mob-sheet__label">Ground truth</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sheetEntry.ground_truth}</span>
              </div>
            </div>
            <div className="mob-sheet__footer">
              <button
                className="btn btn--danger"
                disabled={deleteId === sheetEntry.id}
                onClick={() => handleDelete(sheetEntry.id)}
              >
                <Trash2 size={13} /> Delete entry
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default RagEvaluation;
