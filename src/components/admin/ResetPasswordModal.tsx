import { useState } from 'react';
import type { User } from '../../lib/api';

interface Props {
  user: User;
  onConfirm: (newPassword: string) => Promise<void>;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<Props> = ({ user, onConfirm, onClose }) => {
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirm]     = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(newPassword);
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
        <div className="adm-modal-title">Reset Password</div>
        <div className="adm-modal-sub">
          Set a new password for <span>{user.fullName}</span>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <div className="adm-field-label">New Password</div>
            <input
              className="adm-input"
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              required
            />
          </div>
          <div style={{ marginBottom: '6px' }}>
            <div className="adm-field-label">Confirm Password</div>
            <input
              className="adm-input"
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="adm-field-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <div className="adm-modal-footer">
            <button type="button" className="adm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn-primary" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
