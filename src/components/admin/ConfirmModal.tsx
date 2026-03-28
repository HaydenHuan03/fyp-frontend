import { useState } from 'react';

type Variant = 'suspend' | 'activate' | 'delete';

interface Props {
  variant: Variant;
  userName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const CONFIG: Record<Variant, {
  title: string;
  body: (name: string) => string;
  notice: string;
  noticeVariant: 'warning' | 'success' | 'danger';
  btnLabel: string;
  btnClass: string;
}> = {
  suspend: {
    title: 'Suspend Account',
    body: name => `Are you sure you want to suspend ${name}? They will lose access immediately.`,
    notice: 'The user will not be able to log in while suspended.',
    noticeVariant: 'warning',
    btnLabel: 'Suspend',
    btnClass: 'adm-btn-warning',
  },
  activate: {
    title: 'Activate Account',
    body: name => `Are you sure you want to activate ${name}? They will regain access immediately.`,
    notice: 'The user will be able to log in once activated.',
    noticeVariant: 'success',
    btnLabel: 'Activate',
    btnClass: 'adm-btn-success',
  },
  delete: {
    title: 'Delete User',
    body: name => `Are you sure you want to permanently delete ${name}? This cannot be undone.`,
    notice: 'All data associated with this account will be permanently removed.',
    noticeVariant: 'danger',
    btnLabel: 'Delete',
    btnClass: 'adm-btn-danger',
  },
};

const ConfirmModal: React.FC<Props> = ({ variant, userName, onConfirm, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const cfg = CONFIG[variant];

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
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
        <div className="adm-modal-title">{cfg.title}</div>
        <div className="adm-modal-sub">{cfg.body(userName)}</div>
        <div className={`adm-notice ${cfg.noticeVariant}`}>{cfg.notice}</div>

        {error && <div className="adm-field-error" style={{ marginBottom: '12px' }}>{error}</div>}

        <div className="adm-modal-footer">
          <button className="adm-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={cfg.btnClass} onClick={handleConfirm} disabled={loading}>
            {loading ? 'Please wait…' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
