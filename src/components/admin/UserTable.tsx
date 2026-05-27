import type { User } from '../../lib/api';
import { Pencil, Trash2 } from 'lucide-react';

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
  if (!loading && users.length === 0) {
    return (
      <div className="empty">
        <span className="t">No users found</span>
        <span className="s">Try adjusting your search or filters.</span>
      </div>
    );
  }

  return (
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
                      <div className="avatar">{initials(u.full_name, u.email)}</div>
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
                  <td className="num muted">{new Date(u.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
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
  );
};

export default UserTable;
