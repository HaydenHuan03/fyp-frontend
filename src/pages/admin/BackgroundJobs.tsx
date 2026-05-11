import { useState } from 'react';
import { Database, Sparkles, RefreshCw, X, Terminal, Activity } from 'lucide-react';
import StatTile from '../../components/admin/StatTile';

type JobState = 'running' | 'queued' | 'failed' | 'done';

interface Job {
  id: string;
  kind: 'ingest' | 'analyse';
  target: string;
  owner: string;
  detail: string;
  state: JobState;
  progress: number;
  eta_s: number | null;
}

const SAMPLE_JOBS: Job[] = [];

const STATE_CLASS: Record<JobState, string> = {
  running: 'job-row--running', queued: 'job-row--queued',
  failed: 'job-row--failed', done: 'job-row--done',
};
const STATE_LABEL: Record<JobState, string> = {
  running: 'Running', queued: 'Queued', failed: 'Failed', done: 'Done',
};
const PILL_CLASS: Record<JobState, string> = {
  running: 'pill--accent', queued: 'pill--warn', failed: 'pill--danger', done: 'pill--success',
};

function JobRow({ job }: { job: Job }) {
  const pct = Math.round(job.progress * 100);
  const KindIcon = job.kind === 'ingest' ? Database : Sparkles;
  return (
    <div className={`job-row ${STATE_CLASS[job.state]}`}>
      <div className="job-row__icon"><KindIcon size={14} /></div>
      <div className="job-row__main">
        <div className="job-row__top">
          <span className="job-row__kind">{job.kind === 'ingest' ? 'Ingest' : 'Analyse'}</span>
          <span className="muted" style={{ fontSize: 12 }}>·</span>
          <span className="job-row__target">{job.target}</span>
          <span className="muted" style={{ fontSize: 12 }}>·</span>
          <span className="muted" style={{ fontSize: 12 }}>{job.owner}</span>
        </div>
        <div className="job-row__detail">{job.detail}</div>
        {(job.state === 'running' || job.state === 'queued') && (
          <div className="job-row__bar"><span style={{ width: `${pct}%` }} /></div>
        )}
      </div>
      <div className="job-row__meta">
        <span className={`pill pill--dot ${PILL_CLASS[job.state]}`}>{STATE_LABEL[job.state]}</span>
        {job.state === 'running' && job.eta_s != null && <span className="muted mono" style={{ fontSize: 11 }}>ETA {job.eta_s}s</span>}
        {job.state === 'running' && <span className="mono" style={{ fontSize: 11 }}>{pct}%</span>}
      </div>
      <div className="job-row__actions">
        {job.state === 'failed'  && <button className="row-btn" title="Retry"><RefreshCw size={13} /></button>}
        {job.state === 'running' && <button className="row-btn" title="Cancel"><X size={13} /></button>}
        <button className="row-btn" title="Logs"><Terminal size={13} /></button>
      </div>
    </div>
  );
}

type Scope = 'active' | 'failed' | 'done' | 'all';

const BackgroundJobs: React.FC = () => {
  const [scope, setScope] = useState<Scope>('active');

  const filtered = SAMPLE_JOBS.filter(j => {
    if (scope === 'active') return j.state === 'running' || j.state === 'queued';
    if (scope === 'failed') return j.state === 'failed';
    if (scope === 'done')   return j.state === 'done';
    return true;
  });

  const counts = {
    running: SAMPLE_JOBS.filter(j => j.state === 'running').length,
    queued:  SAMPLE_JOBS.filter(j => j.state === 'queued').length,
    failed:  SAMPLE_JOBS.filter(j => j.state === 'failed').length,
    done:    SAMPLE_JOBS.filter(j => j.state === 'done').length,
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Background jobs</h1>
          <div className="page__sub">Live ingestion and agent-analysis workers — backed by Valkey locks.</div>
        </div>
        <button className="btn btn--ghost"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Backend gap notice */}
      <div style={{
        background: 'var(--warn-tint)', border: '1px solid rgba(180,83,9,0.2)',
        borderRadius: 'var(--r-2)', padding: '12px 16px', marginBottom: 24,
        fontSize: 13, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Activity size={15} />
        <span>
          Requires <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>GET /admin/jobs</code> — unions ingest documents in non-terminal states with active agent locks (Valkey scan for <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>agent:lock:*</code>).
        </span>
      </div>

      <div className="stats">
        <StatTile label="Running"        value={counts.running} delta="—" dir="flat" period="now"        spark={[2,2,3,2,3,2,2,3,2,2,counts.running||0]} />
        <StatTile label="Queued"         value={counts.queued}  delta="—" dir="flat" period="awaiting"   spark={[0,1,0,1,0,1,1,0,1,0,counts.queued||0]} />
        <StatTile label="Failed"         value={counts.failed}  delta="—" dir="flat" period="last 24h"   spark={[0,0,0,1,0,0,0,1,0,0,counts.failed||0]} danger />
        <StatTile label="Completed · 24h" value={counts.done}  delta="—" dir="flat" period="vs. yesterday" spark={[1,2,2,3,3,4,4,5,5,6,counts.done||0]} />
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="chips">
            <button className={`chip${scope === 'active' ? ' is-on' : ''}`} onClick={() => setScope('active')}>Active</button>
            <button className={`chip${scope === 'failed' ? ' is-on' : ''}`} onClick={() => setScope('failed')}>Failed</button>
            <button className={`chip${scope === 'done'   ? ' is-on' : ''}`} onClick={() => setScope('done')}>Done</button>
            <button className={`chip${scope === 'all'    ? ' is-on' : ''}`} onClick={() => setScope('all')}>All</button>
          </div>
          <span className="toolbar__count">{filtered.length} jobs</span>
        </div>

        {SAMPLE_JOBS.length === 0 ? (
          <div className="empty">
            <Activity size={28} className="ico" />
            <span className="t">No jobs</span>
            <span className="s">Jobs will appear here once the backend endpoint is wired up.</span>
          </div>
        ) : (
          <div className="job-list">
            {filtered.map(j => <JobRow key={j.id} job={j} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundJobs;
