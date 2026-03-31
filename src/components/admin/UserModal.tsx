import { useState, useEffect, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const titleId = useId();
  const [form, setForm] = useState<FormState>({
    username:  '',
    full_name: user?.full_name ?? '',
    email:     user?.email    ?? '',
    password:  '',
    role:      user?.role     ?? 'user',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div
      className="adm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="adm-modal">
        <div id={titleId} className="adm-modal-title">
          {mode === 'create' ? 'Add New User' : 'Edit User'}
        </div>
        <div className="adm-modal-sub">
          {mode === 'create'
            ? 'Fill in the details to create an account.'
            : `Editing details for ${user?.full_name}.`}
        </div>

        <form onSubmit={onSubmit}>
          <div className="adm-form-grid">
            <div>
              <label htmlFor="modal-full_name" className="adm-field-label">
                Full Name<span className="adm-required">*</span>
              </label>
              <input
                id="modal-full_name"
                className="adm-input"
                name="full_name"
                value={form.full_name}
                onChange={onChange}
                placeholder="e.g. Alice Tan"
                autoComplete="name"
                required
              />
            </div>
            {mode === 'create' && (
              <div>
                <label htmlFor="modal-username" className="adm-field-label">
                  Username<span className="adm-required">*</span>
                </label>
                <input
                  id="modal-username"
                  className="adm-input"
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="e.g. alicetan"
                  autoComplete="username"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="modal-email" className="adm-field-label">
                Email{mode === 'create' && <span className="adm-required">*</span>}
              </label>
              <input
                id="modal-email"
                className="adm-input"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="email@example.com"
                autoComplete="email"
                required={mode === 'create'}
                disabled={mode === 'edit'}
              />
              {mode === 'edit' && (
                <div className="adm-field-hint">Email cannot be changed after creation.</div>
              )}
            </div>

            {mode === 'create' && (
              <div>
                <label htmlFor="modal-password" className="adm-field-label">
                  Password<span className="adm-required">*</span>
                </label>
                <div className="adm-input-wrap">
                  <input
                    id="modal-password"
                    className="adm-input"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="adm-pwd-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="modal-role" className="adm-field-label">Role</label>
              <select id="modal-role" className="adm-select" name="role" value={form.role} onChange={onChange}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="adm-field-error" role="alert" style={{ marginBottom: '12px' }}>
              {error}
            </div>
          )}

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
