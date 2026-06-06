import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, ChevronRight } from 'lucide-react';
import type { User } from '../../lib/api';

interface Props {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function initials(fullName: string, email: string): string {
  const name = fullName.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SkeletonRow: React.FC = () => (
  <tr>
    <td>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="adm-skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
        <div>
          <div className="adm-skeleton" style={{ width: 110, marginBottom: 4 }} />
          <div className="adm-skeleton" style={{ width: 150, height: 11 }} />
        </div>
      </div>
    </td>
    <td><div className="adm-skeleton" style={{ width: 52 }} /></td>
    <td><div className="adm-skeleton" style={{ width: 62 }} /></td>
    <td><div className="adm-skeleton" style={{ width: 80 }} /></td>
    <td><div className="adm-skeleton" style={{ width: 80 }} /></td>
    <td><div className="adm-skeleton" style={{ width: 60 }} /></td>
  </tr>
);

const UserTable: React.FC<Props> = ({ users, loading, onEdit, onDelete }) => {
  const [sheetUser, setSheetUser] = useState<User | null>(null);

  useEffect(() => {
    if (!sheetUser) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetUser(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetUser]);

  if (!loading && users.length === 0) {
    return (
      <div className="empty">
        <span className="t">No users found</span>
        <span className="s">Try adjusting your search or filters.</span>
      </div>
    );
  }

  const init = (u: User) => initials(u.full_name, u.email);

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last seen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3, 4].map(i => <SkeletonRow key={i} />)
              : users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="who">
                        <div className="avatar">{init(u)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="who__name">{u.full_name || '—'}</div>
                          <div className="who__sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.role === 'admin'
                        ? <span className="pill pill--accent">Admin</span>
                        : <span className="pill">User</span>}
                    </td>
                    <td>
                      {u.is_active
                        ? <span className="pill pill--success pill--dot">Active</span>
                        : <span className="pill pill--danger pill--dot">Suspended</span>}
                    </td>
                    <td className="num muted">{fmtDate(u.created_at)}</td>
                    <td className="num muted">—</td>
                    <td>
                      <div className="row-actions">
                        <button className="row-btn" title="Edit user" onClick={() => onEdit(u)}>
                          <Pencil size={13} />
                        </button>
                        <button className="row-btn row-btn--danger" title="Delete user" onClick={() => onDelete(u)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile compact list ── */}
      <div className="mob-list">
        {loading
          ? [1, 2, 3, 4].map(i => (
              <div key={i} className="mob-row" style={{ pointerEvents: 'none' }}>
                <div className="adm-skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div className="mob-row__info">
                  <div className="adm-skeleton" style={{ width: 120, marginBottom: 4 }} />
                  <div className="adm-skeleton" style={{ width: 160, height: 11 }} />
                </div>
              </div>
            ))
          : users.map(u => (
              <button key={u.id} className="mob-row" onClick={() => setSheetUser(u)}>
                <div className="avatar">{init(u)}</div>
                <div className="mob-row__info">
                  <span className="mob-row__name">{u.full_name || '—'}</span>
                  <span className="mob-row__sub">{u.email}</span>
                </div>
                {u.is_active
                  ? <span className="pill pill--success pill--dot">Active</span>
                  : <span className="pill pill--danger pill--dot">Suspended</span>}
                <ChevronRight size={14} className="mob-row__chevron" />
              </button>
            ))}
      </div>

      {/* ── Bottom sheet detail card ── */}
      {sheetUser && (
        <>
          <div className="mob-sheet__scrim" onClick={() => setSheetUser(null)} aria-hidden="true" />
          <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="User details">
            <div className="mob-sheet__handle" />

            <div className="mob-sheet__head">
              <div className="avatar">{init(sheetUser)}</div>
              <div className="mob-sheet__head-info">
                <div className="mob-sheet__title">{sheetUser.full_name || '—'}</div>
                <div className="mob-sheet__sub">{sheetUser.email}</div>
              </div>
              <button className="row-btn" onClick={() => setSheetUser(null)} title="Close">
                <X size={14} />
              </button>
            </div>

            <div className="mob-sheet__body">
              <div className="mob-sheet__field">
                <span className="mob-sheet__label">Role</span>
                {sheetUser.role === 'admin'
                  ? <span className="pill pill--accent">Admin</span>
                  : <span className="pill">User</span>}
              </div>
              <div className="mob-sheet__field">
                <span className="mob-sheet__label">Status</span>
                {sheetUser.is_active
                  ? <span className="pill pill--success pill--dot">Active</span>
                  : <span className="pill pill--danger pill--dot">Suspended</span>}
              </div>
              <div className="mob-sheet__field">
                <span className="mob-sheet__label">Joined</span>
                <span className="num muted">{fmtDate(sheetUser.created_at)}</span>
              </div>
            </div>

            <div className="mob-sheet__footer">
              <button
                className="btn btn--ghost"
                onClick={() => { onEdit(sheetUser); setSheetUser(null); }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                className="btn btn--danger"
                onClick={() => { onDelete(sheetUser); setSheetUser(null); }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default UserTable;
