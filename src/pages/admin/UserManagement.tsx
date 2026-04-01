// src/pages/admin/UserManagement.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Users, CheckCircle, XCircle, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser,
  type User, type CreateUserPayload, type UpdateUserPayload,
} from '../../lib/api';
import UserTable from '../../components/admin/UserTable';
import UserModal from '../../components/admin/UserModal';
import ConfirmModal from '../../components/admin/ConfirmModal';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit';    user: User }
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
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const totalUsers     = users.length;
  const activeUsers    = users.filter(u => u.is_active).length;
  const suspendedUsers = users.filter(u => !u.is_active).length;

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

  const handleSuspend = async () => {
    if (!authUser || modal.type !== 'suspend') return;
    try {
      const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { is_active: false });
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
      const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { is_active: true });
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
          <Plus size={14} strokeWidth={2.5} />
          Add New User
        </button>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat-card">
          <div className="adm-stat-icon adm-stat-icon--indigo">
            <Users size={18} color="#4f46e5" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value adm-stat-value--indigo">{loading ? '—' : totalUsers}</div>
            <div className="adm-stat-label">Total Users</div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon adm-stat-icon--green">
            <CheckCircle size={18} color="#16a34a" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value adm-stat-value--green">{loading ? '—' : activeUsers}</div>
            <div className="adm-stat-label">Active</div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon adm-stat-icon--red">
            <XCircle size={18} color="#dc2626" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value adm-stat-value--red">{loading ? '—' : suspendedUsers}</div>
            <div className="adm-stat-label">Suspended</div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="adm-table-card">
        <div className="adm-table-toolbar">
          <div className="adm-search-wrap">
            <span className="adm-search-icon">
              <Search size={14} />
            </span>
            <input
              className="adm-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {!loading && (
            <span className="adm-user-count">{filtered.length} users</span>
          )}
        </div>
        <UserTable
          users={filtered}
          loading={loading}
          onEdit={user => setModal({ type: 'edit', user })}
          onToggleSuspend={user =>
            setModal({ type: user.is_active ? 'suspend' : 'activate', user })
          }
          onDelete={user => setModal({ type: 'delete', user })}
        />
      </div>

      {/* Modals */}
      {modal.type === 'create' && (
        <UserModal mode="create" onConfirm={handleCreate} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <UserModal mode="edit" user={modal.user} onConfirm={handleEdit} onClose={closeModal} />
      )}
      {modal.type === 'suspend' && (
        <ConfirmModal
          variant="suspend"
          userName={modal.user.full_name}
          onConfirm={handleSuspend}
          onClose={closeModal}
        />
      )}
      {modal.type === 'activate' && (
        <ConfirmModal
          variant="activate"
          userName={modal.user.full_name}
          onConfirm={handleActivate}
          onClose={closeModal}
        />
      )}
      {modal.type === 'delete' && (
        <ConfirmModal
          variant="delete"
          userName={modal.user.full_name}
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
