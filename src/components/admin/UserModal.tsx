import { useState, useEffect } from 'react';
import type { User, CreateUserPayload, UpdateUserPayload, UserRoleType } from '../../lib/api';

interface Props {
  mode: 'create' | 'edit';
  user?: User;          // provided in edit mode
  onConfirm: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  username: string;
  full_name: string;
  email: string;
  password: string;
  role: UserRoleType;
}

const UserModal: React.FC<Props> = ({ mode, user, onConfirm, onClose }) => {
  const [form, setForm] = useState<FormState>({
    username:  '',
    full_name: user?.full_name ?? '',
    email:     user?.email    ?? '',
    password:  '',
    role:      user?.role     ?? 'user',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username:  '',
        full_name: user.full_name,
        email:     user.email,
        password:  '',
        role:      user.role,
      });
    }
  }, [user]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setError('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'create') {
        await onConfirm({
          username:  form.username,
          full_name: form.full_name,
          email:     form.email,
          password:  form.password,
          role:      form.role,
        } satisfies CreateUserPayload);
      } else {
        await onConfirm({
          full_name: form.full_name,
          role:      form.role,
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
    <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal">
        <div className="adm-modal-title">
          {mode === 'create' ? 'Add New User' : 'Edit User'}
        </div>
        <div className="adm-modal-sub">
          {mode === 'create' ? 'Fill in the details to create an account.' : `Editing details for ${user?.full_name}.`}
        </div>

        <form onSubmit={onSubmit}>
          <div className="adm-form-grid">
            <div>
              <div className="adm-field-label">Full Name</div>
              <input
                className="adm-input"
                name="full_name"
                value={form.full_name}
                onChange={onChange}
                placeholder="e.g. Alice Tan"
                required
              />
            </div>
            {mode === 'create' && (
              <div>
                <div className="adm-field-label">Username</div>
                <input
                  className="adm-input"
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="e.g. alicetan"
                  required
                />
              </div>
            )}
            <div>
              <div className="adm-field-label">Email</div>
              <input
                className="adm-input"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="email@example.com"
                required
                disabled={mode === 'edit'}
              />
            </div>

            {mode === 'create' && (
              <div>
                <div className="adm-field-label">Password</div>
                <input
                  className="adm-input"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <div>
              <div className="adm-field-label">Role</div>
              <select className="adm-select" name="role" value={form.role} onChange={onChange}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {error && <div className="adm-field-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div className="adm-modal-footer">
            <button type="button" className="adm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn-primary" disabled={loading}>
              {loading ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
