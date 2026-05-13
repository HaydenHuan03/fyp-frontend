import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { User, CreateUserPayload, UpdateUserPayload, UserRoleType } from '../../lib/api';
import Drawer from './Drawer';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  user?: User;
  onConfirm: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  username:   string;
  first_name: string;
  last_name:  string;
  email:      string;
  password:   string;
  role:       UserRoleType;
}

const FORM_ID = 'user-modal-form';

const UserModal: React.FC<Props> = ({ open, mode, user, onConfirm, onClose }) => {
  const [form, setForm] = useState<FormState>({
    username: '', first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
    email: user?.email ?? '', password: '', role: user?.role ?? 'user',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ username: '', first_name: user.first_name, last_name: user.last_name, email: user.email, password: '', role: user.role });
    }
  }, [user]);

  useEffect(() => {
    if (!open) { setError(''); setLoading(false); setShowPw(false); }
  }, [open]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'create') {
        await onConfirm({
          username: form.username, first_name: form.first_name, last_name: form.last_name,
          email: form.email, password: form.password, role: form.role,
        } satisfies CreateUserPayload);
      } else {
        await onConfirm({
          first_name: form.first_name, last_name: form.last_name, role: form.role,
        } satisfies UpdateUserPayload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Add user' : 'Edit user'}
      sub={mode === 'create'
        ? 'New investigator or admin account'
        : (user ? `${user.first_name} ${user.last_name}`.trim() : '')}
      footer={
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button form={FORM_ID} type="submit" className="btn btn--primary btn--sm" disabled={loading}>
            {loading ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="df">
        <div className="df-row">
          <div className="df-field">
            <label htmlFor="df-first_name" className="df-label">
              First name<span className="df-req">*</span>
            </label>
            <input
              id="df-first_name" className="df-input" name="first_name"
              value={form.first_name} onChange={onChange}
              placeholder="e.g. Alice" autoComplete="given-name" required
            />
          </div>
          <div className="df-field">
            <label htmlFor="df-last_name" className="df-label">
              Last name<span className="df-req">*</span>
            </label>
            <input
              id="df-last_name" className="df-input" name="last_name"
              value={form.last_name} onChange={onChange}
              placeholder="e.g. Tan" autoComplete="family-name" required
            />
          </div>
        </div>

        {mode === 'create' && (
          <div className="df-field">
            <label htmlFor="df-username" className="df-label">
              Username<span className="df-req">*</span>
            </label>
            <input
              id="df-username" className="df-input" name="username"
              value={form.username} onChange={onChange}
              placeholder="e.g. alicetan" autoComplete="username" required
            />
          </div>
        )}

        <div className="df-field">
          <label htmlFor="df-email" className="df-label">
            Email{mode === 'create' && <span className="df-req">*</span>}
          </label>
          <input
            id="df-email" className="df-input" name="email" type="email"
            value={form.email} onChange={onChange}
            placeholder="email@example.com" autoComplete="email"
            required={mode === 'create'} disabled={mode === 'edit'}
          />
          {mode === 'edit' && (
            <span className="df-hint">Email cannot be changed after creation.</span>
          )}
        </div>

        {mode === 'create' && (
          <div className="df-field">
            <label htmlFor="df-password" className="df-label">
              Password<span className="df-req">*</span>
            </label>
            <div className="df-pw">
              <input
                id="df-password" className="df-input" name="password"
                type={showPw ? 'text' : 'password'}
                value={form.password} onChange={onChange}
                placeholder="••••••••" autoComplete="new-password" required
              />
              <button
                type="button" className="df-pw-eye"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
              </button>
            </div>
          </div>
        )}

        <div className="df-field">
          <label htmlFor="df-role" className="df-label">Role</label>
          <div className="df-select-wrap">
            <select id="df-role" className="df-select" name="role" value={form.role} onChange={onChange}>
              <option value="user">Investigator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {error && <div className="df-error" role="alert">{error}</div>}
      </form>
    </Drawer>
  );
};

export default UserModal;
