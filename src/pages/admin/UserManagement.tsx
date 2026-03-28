// src/pages/admin/UserManagement.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser, apiResetPassword,
  type User, type CreateUserPayload, type UpdateUserPayload,
} from '../../lib/api';
import UserTable from '../../components/admin/UserTable';
import UserModal from '../../components/admin/UserModal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import ConfirmModal from '../../components/admin/ConfirmModal';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit';    user: User }
  | { type: 'reset';   user: User }
  | { type: 'suspend'; user: User }
  | { type: 'activate'; user: User }
  | { type: 'delete';  user: User };

interface Toast { message: string; variant: 'success' | 'error' }

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState<ModalState>({ type: 'none' });
  const [toast, setToast]     = useState<Toast | null>(null);
  const toastTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, variant: 'success' | 'error') => {
    setToast({ message, variant });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const data = await apiGetUsers(authUser.accessToken);
      setUsers(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [authUser, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const totalUsers     = users.length;
  const activeUsers    = users.filter(u => u.status === 'active').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;

  // ── Handlers ──

  const handleCreate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!authUser) return;
    try {
      const created = await apiCreateUser(authUser.accessToken, data as CreateUserPayload);
      setUsers(prev => [...prev, created]);
      showToast('User created successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create user', 'error');
      throw err;
    }
  };

  const handleEdit = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!authUser || modal.type !== 'edit') return;
    try {
      const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, data as UpdateUserPayload);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast('User updated successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user', 'error');
      throw err;
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!authUser || modal.type !== 'reset') return;
    try {
      await apiResetPassword(authUser.accessToken, modal.user.id, newPassword);
      showToast('Password reset successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset password', 'error');
      throw err;
    }
  };

  const handleSuspend = async () => {
    if (!authUser || modal.type !== 'suspend') return;
    try {
      const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { status: 'suspended' });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast('Account suspended.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to suspend account', 'error');
      throw err;
    }
  };

  const handleActivate = async () => {
    if (!authUser || modal.type !== 'activate') return;
    try {
      const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { status: 'active' });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast('Account activated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to activate account', 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!authUser || modal.type !== 'delete') return;
    try {
      await apiDeleteUser(authUser.accessToken, modal.user.id);
      setUsers(prev => prev.filter(u => u.id !== modal.user.id));
      showToast('User deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
      throw err;
    }
  };

  const closeModal = () => setModal({ type: 'none' });

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">User Management</div>
          <div className="adm-page-sub">Manage investigator accounts</div>
        </div>
        <button className="adm-btn-primary" onClick={() => setModal({ type: 'create' })}>
          + Add User
        </button>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat-card">
          <div className="adm-stat-value">{loading ? '—' : totalUsers}</div>
          <div className="adm-stat-label">Total Users</div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-value green">{loading ? '—' : activeUsers}</div>
          <div className="adm-stat-label">Active</div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-value red">{loading ? '—' : suspendedUsers}</div>
          <div className="adm-stat-label">Suspended</div>
        </div>
      </div>

      {/* Search */}
      <div className="adm-search-bar">
        <input
          className="adm-search-input"
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <UserTable
        users={filtered}
        loading={loading}
        onEdit={user => setModal({ type: 'edit', user })}
        onResetPassword={user => setModal({ type: 'reset', user })}
        onToggleSuspend={user =>
          setModal({ type: user.status === 'active' ? 'suspend' : 'activate', user })
        }
        onDelete={user => setModal({ type: 'delete', user })}
      />

      {/* Modals */}
      {modal.type === 'create' && (
        <UserModal mode="create" onConfirm={handleCreate} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <UserModal mode="edit" user={modal.user} onConfirm={handleEdit} onClose={closeModal} />
      )}
      {modal.type === 'reset' && (
        <ResetPasswordModal user={modal.user} onConfirm={handleResetPassword} onClose={closeModal} />
      )}
      {modal.type === 'suspend' && (
        <ConfirmModal
          variant="suspend"
          userName={modal.user.fullName}
          onConfirm={handleSuspend}
          onClose={closeModal}
        />
      )}
      {modal.type === 'activate' && (
        <ConfirmModal
          variant="activate"
          userName={modal.user.fullName}
          onConfirm={handleActivate}
          onClose={closeModal}
        />
      )}
      {modal.type === 'delete' && (
        <ConfirmModal
          variant="delete"
          userName={modal.user.fullName}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`adm-toast ${toast.variant}`}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default UserManagement;
