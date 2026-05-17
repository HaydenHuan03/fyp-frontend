import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser,
  type User as UserType, type CreateUserPayload, type UpdateUserPayload,
} from '../../lib/api';
import UserTable from '../../components/admin/UserTable';
import UserModal from '../../components/admin/UserModal';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatTile from '../../components/admin/StatTile';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit';     user: UserType }
  | { type: 'suspend';  user: UserType }
  | { type: 'activate'; user: UserType }
  | { type: 'delete';   user: UserType };

interface Toast { message: string; variant: 'success' | 'error' }

const ROLE_DEFS = [
  { id: 'admin' as const, label: 'Admin',       Icon: ShieldCheck, desc: 'Full access — user mgmt, settings, audit log' },
  { id: 'user'  as const, label: 'Investigator', Icon: User,        desc: 'Case work, reports, knowledge base' },
];

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers]   = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState<'all' | 'admin' | 'user'>('all');
  const [status, setStatus]   = useState<'all' | 'active' | 'suspended'>('all');
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
    try { setUsers(await apiGetUsers(authUser.accessToken)); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [authUser, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    let r = users;
    if (role !== 'all')          r = r.filter(u => u.role === role);
    if (status === 'active')    r = r.filter(u => u.is_active);
    if (status === 'suspended') r = r.filter(u => !u.is_active);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return r;
  }, [users, role, status, search]);

  const total     = users.length;
  const active    = users.filter(u => u.is_active).length;
  const suspended = users.filter(u => !u.is_active).length;

  const hasFilters = role !== 'all' || status !== 'all' || search.length > 0;
  const clearAll   = () => { setRole('all'); setStatus('all'); setSearch(''); };

  const closeModal = () => setModal({ type: 'none' });

  const handleCreate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!authUser) return;
    const created = await apiCreateUser(authUser.accessToken, data as CreateUserPayload);
    setUsers(prev => [...prev, created]);
    showToast('User created successfully.', 'success');
  };

  const handleEdit = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!authUser || modal.type !== 'edit') return;
    const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, data as UpdateUserPayload);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast('User updated successfully.', 'success');
  };

  const handleSuspend = async () => {
    if (!authUser || modal.type !== 'suspend') return;
    const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { is_active: false });
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast('Account suspended.', 'success');
  };

  const handleActivate = async () => {
    if (!authUser || modal.type !== 'activate') return;
    const updated = await apiUpdateUser(authUser.accessToken, modal.user.id, { is_active: true });
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast('Account activated.', 'success');
  };

  const handleDelete = async () => {
    if (!authUser || modal.type !== 'delete') return;
    await apiDeleteUser(authUser.accessToken, modal.user.id);
    setUsers(prev => prev.filter(u => u.id !== (modal as { type: 'delete'; user: UserType }).user.id));
    showToast('User deleted.', 'success');
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Users</h1>
          <div className="page__sub">Manage investigator accounts and admin access.</div>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ type: 'create' })}>
          <Plus size={14} strokeWidth={2.2} /> Add user
        </button>
      </div>

      <div className="stats">
        <StatTile label="Total"     value={loading ? '—' : total}     delta="+0" dir="flat" period="all users"       spark={[5,7,8,10,12,15,18,21,23,25,total||27]} />
        <StatTile label="Active"    value={loading ? '—' : active}    delta="—"  dir="flat" period="signed in"       spark={[5,6,8,9,10,12,14,17,19,21,active||23]} />
        <StatTile label="Suspended" value={loading ? '—' : suspended} delta="0"  dir="flat" period="no change"       spark={[2,2,2,2,2,2,2,2,2,2,suspended||2]} />
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search by name or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="toolbar-select" value={role} onChange={e => setRole(e.target.value as typeof role)} aria-label="Filter by role">
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">Investigator</option>
          </select>

          <select className="toolbar-select" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <span className="toolbar__count">{filtered.length} of {total}</span>
        </div>

        {/* Active filters bar */}
        {hasFilters && (
          <div className="active-filters">
            <span className="active-filters__label">Filters</span>
            {search && (
              <span className="tag">
                <Search size={11} />
                &ldquo;{search}&rdquo;
                <button onClick={() => setSearch('')} aria-label="Clear search"><X size={11} /></button>
              </span>
            )}
            {role !== 'all' && (() => {
              const def = ROLE_DEFS.find(r => r.id === role);
              return (
                <span className="tag">
                  {def && <def.Icon size={11} />}
                  {def?.label || role}
                  <button onClick={() => setRole('all')} aria-label="Clear role"><X size={11} /></button>
                </span>
              );
            })()}
            {status !== 'all' && (
              <span className="tag">
                <span className={`dot ${status === 'active' ? 'dot--success' : 'dot--danger'}`} />
                {status === 'active' ? 'Active' : 'Suspended'}
                <button onClick={() => setStatus('all')} aria-label="Clear status"><X size={11} /></button>
              </span>
            )}
            <button className="link-btn" onClick={clearAll}>Clear all</button>
          </div>
        )}

        <UserTable
          users={filtered}
          loading={loading}
          onEdit={user => setModal({ type: 'edit', user })}
          onDelete={user => setModal({ type: 'delete', user })}
        />
      </div>

      <UserModal
        open={modal.type === 'create'}
        mode="create"
        onConfirm={handleCreate}
        onClose={closeModal}
      />
      <UserModal
        open={modal.type === 'edit'}
        mode="edit"
        user={modal.type === 'edit' ? modal.user : undefined}
        onConfirm={handleEdit}
        onClose={closeModal}
      />
      {modal.type === 'suspend' && (
        <ConfirmModal variant="suspend" userName={modal.user.full_name} onConfirm={handleSuspend} onClose={closeModal} />
      )}
      {modal.type === 'activate' && (
        <ConfirmModal variant="activate" userName={modal.user.full_name} onConfirm={handleActivate} onClose={closeModal} />
      )}
      {modal.type === 'delete' && (
        <ConfirmModal variant="delete" userName={modal.user.full_name} onConfirm={handleDelete} onClose={closeModal} />
      )}

      {toast && (
        <div className={`adm-toast ${toast.variant}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default UserManagement;
