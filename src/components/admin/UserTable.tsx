import { useState, useRef, useEffect } from 'react';
import type { User } from '../../lib/api';

interface Props {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleSuspend: (user: User) => void;
  onDelete: (user: User) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const ActionsDropdown: React.FC<{
  user: User;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
}> = ({ user, onEdit, onResetPassword, onToggleSuspend, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="adm-actions-wrap" ref={ref}>
      <button className="adm-actions-btn" onClick={() => setOpen(v => !v)}>
        Actions ▾
      </button>
      {open && (
        <div className="adm-dropdown">
          <button className="adm-dropdown-item" onClick={() => { onEdit(); setOpen(false); }}>
            Edit Details
          </button>
          <button className="adm-dropdown-item" onClick={() => { onResetPassword(); setOpen(false); }}>
            Reset Password
          </button>
          <button
            className={`adm-dropdown-item ${user.status === 'active' ? 'warning' : ''}`}
            onClick={() => { onToggleSuspend(); setOpen(false); }}
          >
            {user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
          </button>
          <button className="adm-dropdown-item danger" onClick={() => { onDelete(); setOpen(false); }}>
            Delete User
          </button>
        </div>
      )}
    </div>
  );
};

const SkeletonRows: React.FC = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <tr key={i}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
          <td key={j}><div className="adm-skeleton" style={{ width: j === 8 ? '80px' : '100%' }} /></td>
        ))}
      </tr>
    ))}
  </>
);

const UserTable: React.FC<Props> = ({
  users, loading, onEdit, onResetPassword, onToggleSuspend, onDelete,
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
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Department</th>
            <th>Registered</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : (
            users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.fullName}</td>
                <td style={{ color: 'var(--adm-text-muted)' }}>{user.email}</td>
                <td>
                  <span className={`adm-badge adm-badge-${user.role}`}>
                    {user.role === 'admin' ? 'Admin' : 'Investigator'}
                  </span>
                </td>
                <td>
                  <span className={`adm-badge adm-badge-${user.status}`}>
                    {user.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td style={{ color: 'var(--adm-text-muted)' }}>{user.department}</td>
                <td style={{ color: 'var(--adm-text-muted)' }}>{formatDate(user.registeredAt)}</td>
                <td style={{ color: 'var(--adm-text-muted)' }}>
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
                </td>
                <td>
                  <ActionsDropdown
                    user={user}
                    onEdit={() => onEdit(user)}
                    onResetPassword={() => onResetPassword(user)}
                    onToggleSuspend={() => onToggleSuspend(user)}
                    onDelete={() => onDelete(user)}
                  />
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
