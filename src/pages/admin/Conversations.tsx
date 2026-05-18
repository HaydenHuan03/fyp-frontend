import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { apiAdminListConversations, type ConversationAdmin, type PaginatedConversationsResponse } from '../../lib/api';
import StatTile from '../../components/admin/StatTile';
import Drawer from '../../components/admin/Drawer';
import { formatDateTime } from '../../lib/utils';

type Scope = 'all' | 'case' | 'adhoc';

const Conversations: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows]       = useState<ConversationAdmin[]>([]);
  const [meta, setMeta]       = useState<Omit<PaginatedConversationsResponse, 'items'>>({ total: 0, page: 1, page_size: 20, pages: 1 });
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [scope, setScope]     = useState<Scope>('all');
  const [open, setOpen]       = useState<ConversationAdmin | null>(null);

  const load = useCallback(async (p = page) => {
    if (!user) return;
    try {
      const data = await apiAdminListConversations(user.accessToken, { page: p, page_size: 20 });
      setRows(data.items);
      setMeta({ total: data.total, page: data.page, page_size: data.page_size, pages: data.pages });
    }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = rows;
    if (scope === 'case')  r = r.filter(c => c.case_id);
    if (scope === 'adhoc') r = r.filter(c => !c.case_id);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.case_id || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, scope, search]);

  const caseLinked = rows.filter(c => c.case_id).length;
  const totalCount = meta.total;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Conversations</h1>
          <div className="page__sub">Every chat session on the platform — case-linked or ad-hoc.</div>
        </div>
      </div>

      <div className="stats">
        <StatTile label="Conversations" value={loading ? '—' : totalCount}  delta="+0" dir="flat" period="total"       spark={[8,9,11,10,13,15,14,17,19,21,totalCount||0]} />
        <StatTile label="Case-linked"   value={loading ? '—' : caseLinked}   delta="—"  dir="flat" period="of page"      spark={[5,6,7,7,8,8,9,9,10,10,caseLinked||0]} />
        <StatTile label="Ad-hoc"        value={loading ? '—' : rows.length - caseLinked} delta="—" dir="flat" period="of page" spark={[3,4,4,3,5,6,5,8,9,11,rows.length-caseLinked||0]} />
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search by title or case ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="chips">
            <button className={`chip${scope === 'all'   ? ' is-on' : ''}`} onClick={() => setScope('all')}>All</button>
            <button className={`chip${scope === 'case'  ? ' is-on' : ''}`} onClick={() => setScope('case')}>Case-linked</button>
            <button className={`chip${scope === 'adhoc' ? ' is-on' : ''}`} onClick={() => setScope('adhoc')}>Ad-hoc</button>
          </div>
          <span className="toolbar__count">{filtered.length} of {totalCount}</span>
        </div>

        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Title</th>
                <th>Case</th>
                <th>Last active</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4].map(i => (
                  <tr key={i}>
                    <td><div className="adm-skeleton" style={{ width: 200 }} /></td>
                    <td><div className="adm-skeleton" style={{ width: 80 }} /></td>
                    <td><div className="adm-skeleton" style={{ width: 100 }} /></td>
                    <td><div className="adm-skeleton" style={{ width: 100 }} /></td>
                    <td></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty">
                    <span className="t">No conversations found</span>
                  </div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onClick={() => setOpen(c)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="conv-cell">
                      <span className="conv-id">#{c.id}</span>
                      <span className="conv-title">{c.title}</span>
                    </div>
                  </td>
                  <td>
                    {c.case_id
                      ? <span className="mono-pill">{c.case_id}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num muted">{formatDateTime(c.updated_at)}</td>
                  <td className="num muted">{formatDateTime(c.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" title="Open"><ChevronRight size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn--ghost btn--sm"
              disabled={page <= 1}
              onClick={() => { setPage(p => p - 1); load(page - 1); }}
            >Previous</button>
            <span className="pagination__info">Page {meta.page} of {meta.pages}</span>
            <button
              className="btn btn--ghost btn--sm"
              disabled={page >= meta.pages}
              onClick={() => { setPage(p => p + 1); load(page + 1); }}
            >Next</button>
          </div>
        )}
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `#${open.id} · ${open.title}` : ''}
        sub={open?.case_id ? `Case ${open.case_id}` : 'Ad-hoc conversation'}
        footer={open && (
          <>
            <button className="btn btn--ghost btn--sm"><ExternalLink size={12} /> Open in chat viewer</button>
            <button className="btn btn--danger btn--sm" style={{ marginLeft: 'auto' }}><Trash2 size={12} /> Delete</button>
          </>
        )}
      >
        {open && (
          <div className="kv">
            <div className="kv__row"><span className="kv__k">Conversation ID</span><span className="kv__v mono">{open.id}</span></div>
            <div className="kv__row"><span className="kv__k">User ID</span><span className="kv__v mono">{open.user_id}</span></div>
            <div className="kv__row"><span className="kv__k">Case ID</span><span className="kv__v mono">{open.case_id || '—'}</span></div>
            <div className="kv__row"><span className="kv__k">Title</span><span className="kv__v">{open.title}</span></div>
            <div className="kv__row"><span className="kv__k">Created</span><span className="kv__v num">{formatDateTime(open.created_at)}</span></div>
            <div className="kv__row"><span className="kv__k">Updated</span><span className="kv__v num">{formatDateTime(open.updated_at)}</span></div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Conversations;
