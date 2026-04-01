import type { User } from '../../lib/api';
import { Edit2, Trash2 } from 'lucide-react';

interface Props {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onToggleSuspend: (user: User) => void;
  onDelete: (user: User) => void;
}

function getInitials(fullName: string, email: string): string {
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

const SkeletonRows: React.FC = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <tr key={i}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="adm-skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="adm-skeleton" style={{ width: '120px', marginBottom: '5px' }} />
              <div className="adm-skeleton" style={{ width: '160px', height: '11px' }} />
            </div>
          </div>
        </td>
        <td><div className="adm-skeleton" style={{ width: '55px' }} /></td>
        <td><div className="adm-skeleton" style={{ width: '65px' }} /></td>
        <td>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div className="adm-skeleton" style={{ width: '30px', height: '30px', borderRadius: '6px' }} />
            <div className="adm-skeleton" style={{ width: '30px', height: '30px', borderRadius: '6px' }} />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const UserTable: React.FC<Props> = ({
  users, loading, onEdit, onDelete,
}) => {
  if (!loading && users.length === 0) {
    return (
      <div className="adm-table-wrap">
        <div className="adm-empty">No users found.</div>
      </div>
    );
  }

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : (
            users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="adm-user-cell">
                    <div className={`adm-row-avatar adm-row-avatar--${user.role}`}>
                      {getInitials(user.full_name, user.email)}
                    </div>
                    <div>
                      <div className="adm-row-name">{user.full_name || '—'}</div>
                      <div className="adm-row-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`adm-badge adm-badge-${user.role}`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  <span className={`adm-badge adm-badge-${user.is_active ? 'active' : 'suspended'}`}>
                    {user.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  <div className="adm-row-actions">
                    <button
                      className="adm-row-btn"
                      onClick={() => onEdit(user)}
                      title="Edit user"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="adm-row-btn adm-row-btn--danger"
                      onClick={() => onDelete(user)}
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
