import type { User } from '../../lib/api';

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

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

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
                      <PencilIcon />
                    </button>
                    <button
                      className="adm-row-btn adm-row-btn--danger"
                      onClick={() => onDelete(user)}
                      title="Delete user"
                    >
                      <TrashIcon />
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
