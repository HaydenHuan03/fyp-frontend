import { Scale, Download, ExternalLink, Search, ChevronRight } from 'lucide-react';
import Drawer from '../../components/admin/Drawer';
import { useState } from 'react';

interface SampleReport {
  report_id: string;
  case_id: string;
  crime_type: string;
  investigator_name: string;
  investigator_id: string;
  laws_cited: string[];
  precedents: string[];
  generated_at: string;
}

const SAMPLE: SampleReport[] = [];

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

const CaseReports: React.FC = () => {
  const [open, setOpen] = useState<SampleReport | null>(null);
  const [search, setSearch] = useState('');

  const filtered = SAMPLE.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.case_id.toLowerCase().includes(q) || r.crime_type.toLowerCase().includes(q) || r.investigator_name.toLowerCase().includes(q);
  });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Case reports</h1>
          <div className="page__sub">Agent-generated reports — violated laws and precedents per case.</div>
        </div>
      </div>

      {/* Backend gap notice */}
      <div style={{
        background: 'var(--warn-tint)', border: '1px solid rgba(180,83,9,0.2)',
        borderRadius: 'var(--r-2)', padding: '12px 16px', marginBottom: 24,
        fontSize: 13, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Scale size={15} />
        <span>
          Requires <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>GET /admin/case-reports</code> — an admin-scoped listing endpoint for all <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>CaseReport</code> rows. The current per-case endpoint requires a specific <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>case_id</code>.
        </span>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input placeholder="Search by case, investigator, crime type or law" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="toolbar__count">{filtered.length} of {SAMPLE.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <Scale size={28} className="ico" />
            <span className="t">No reports yet</span>
            <span className="s">Case reports will appear here once the backend endpoint is available.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Crime type</th>
                  <th>Investigator</th>
                  <th>Laws cited</th>
                  <th style={{ textAlign: 'right' }}>Precedents</th>
                  <th>Generated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.report_id} onClick={() => setOpen(r)} style={{ cursor: 'pointer' }}>
                    <td><span className="mono-pill">{r.case_id}</span></td>
                    <td>{r.crime_type}</td>
                    <td>
                      <div className="who">
                        <div className="avatar avatar--sm">{initials(r.investigator_name)}</div>
                        <span className="who__name">{r.investigator_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="law-pills">
                        {r.laws_cited.slice(0, 2).map((l, i) => <span key={i} className="law-pill">{l}</span>)}
                        {r.laws_cited.length > 2 && <span className="law-pill law-pill--more">+{r.laws_cited.length - 2}</span>}
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{r.precedents.length}</td>
                    <td className="num muted">{r.generated_at}</td>
                    <td>
                      <div className="row-actions">
                        <button className="row-btn" title="Open report"><ChevronRight size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.case_id || ''}
        sub={open ? `${open.crime_type} · ${open.investigator_name}` : ''}
        footer={open && (
          <>
            <button className="btn btn--ghost btn--sm"><Download size={12} /> Download JSON</button>
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}><ExternalLink size={12} /> Open case</button>
          </>
        )}
      >
        {open && (
          <>
            <div className="kv">
              <div className="kv__row"><span className="kv__k">Report ID</span><span className="kv__v mono">{open.report_id}</span></div>
              <div className="kv__row"><span className="kv__k">Investigator</span><span className="kv__v mono">{open.investigator_id}</span></div>
              <div className="kv__row"><span className="kv__k">Generated</span><span className="kv__v num">{open.generated_at}</span></div>
            </div>
            <div className="drawer__section-label">Violated laws ({open.laws_cited.length})</div>
            <ul className="lp-list">
              {open.laws_cited.map((l, i) => (
                <li key={i} className="lp-list__item">
                  <Scale size={13} />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <div className="drawer__section-label">Precedents ({open.precedents.length})</div>
            {open.precedents.length === 0
              ? <div className="muted" style={{ fontSize: 13 }}>No precedents cited.</div>
              : <ul className="lp-list">
                  {open.precedents.map((p, i) => (
                    <li key={i} className="lp-list__item"><span>{p}</span></li>
                  ))}
                </ul>}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default CaseReports;
