import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, ShieldCheck, User, Check, ChevronDown, X } from 'lucide-react';
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
  const [roles, setRoles]     = useState(() => new Set<string>());
  const [status, setStatus]   = useState<'all' | 'active' | 'suspended'>('all');
  const [rolePopOpen, setRolePopOpen] = useState(false);
  const [modal, setModal]     = useState<ModalState>({ type: 'none' });
  const [toast, setToast]     = useState<Toast | null>(null);
  const toastTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rolePopOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setRolePopOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [rolePopOpen]);

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

  const toggleRole = (id: string) => {
    setRoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let r = users;
    if (roles.size > 0) r = r.filter(u => roles.has(u.role));
    if (status === 'active')    r = r.filter(u => u.is_active);
    if (status === 'suspended') r = r.filter(u => !u.is_active);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return r;
  }, [users, roles, status, search]);

  const roleCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const u of users) m[u.role] = (m[u.role] || 0) + 1;
    return m;
  }, [users]);

  const total     = users.length;
  const active    = users.filter(u => u.is_active).length;
  const suspended = users.filter(u => !u.is_active).length;

  const hasFilters = roles.size > 0 || status !== 'all' || search.length > 0;
  const clearAll   = () => { setRoles(new Set()); setStatus('all'); setSearch(''); };

  const roleTriggerLabel = (() => {
    if (roles.size === 0) return 'All roles';
    if (roles.size === 1) return ROLE_DEFS.find(r => r.id === [...roles][0])?.label || [...roles][0];
    return `${roles.size} roles`;
  })();

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

          {/* Role filter popover */}
          <div className="filter" ref={popRef}>
            <button
              className={`filter-trigger${roles.size ? ' is-on' : ''}${rolePopOpen ? ' is-open' : ''}`}
              onClick={() => setRolePopOpen(v => !v)}
              aria-expanded={rolePopOpen}
            >
              <ShieldCheck size={13} />
              <span>{roleTriggerLabel}</span>
              {roles.size > 0 && <span className="filter-trigger__count">{roles.size}</span>}
              <ChevronDown size={12} />
            </button>
            {rolePopOpen && (
              <div className="popover" role="dialog">
                <div className="popover__head">
                  <span>Filter by role</span>
                  {roles.size > 0 && (
                    <button className="link-btn" onClick={() => setRoles(new Set())}>Clear</button>
                  )}
                </div>
                <ul className="role-list">
                  {ROLE_DEFS.map(r => {
                    const on = roles.has(r.id);
                    return (
                      <li key={r.id}>
                        <button
                          className={`role-row${on ? ' is-on' : ''}`}
                          onClick={() => toggleRole(r.id)}
                        >
                          <span className={`check${on ? ' is-on' : ''}`}>
                            {on && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="role-row__icon"><r.Icon size={14} /></span>
                          <span className="role-row__main">
                            <span className="role-row__label">{r.label}</span>
                            <span className="role-row__desc">{r.desc}</span>
                          </span>
                          <span className="role-row__count">{roleCounts[r.id] || 0}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="chips">
            <button className={`chip${status === 'all'       ? ' is-on' : ''}`} onClick={() => setStatus('all')}>Any status</button>
            <button className={`chip${status === 'active'    ? ' is-on' : ''}`} onClick={() => setStatus('active')}>Active</button>
            <button className={`chip${status === 'suspended' ? ' is-on' : ''}`} onClick={() => setStatus('suspended')}>Suspended</button>
          </div>

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
            {[...roles].map(id => {
              const def = ROLE_DEFS.find(r => r.id === id);
              return (
                <span key={id} className="tag">
                  {def && <def.Icon size={11} />}
                  {def?.label || id}
                  <button onClick={() => toggleRole(id)} aria-label={`Remove ${def?.label}`}><X size={11} /></button>
                </span>
              );
            })}
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

      {modal.type === 'create' && (
        <UserModal mode="create" onConfirm={handleCreate} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <UserModal mode="edit" user={modal.user} onConfirm={handleEdit} onClose={closeModal} />
      )}
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
