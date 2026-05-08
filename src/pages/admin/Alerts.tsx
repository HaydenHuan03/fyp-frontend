import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Trash2, CheckCircle, AlertCircle, Loader, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiListAlerts, apiDeleteAlert, type AlertItem } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../lib/utils';

const Alerts: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toasts, toast } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await apiListAlerts(user!.accessToken);
      setAlerts(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiDeleteAlert(user!.accessToken, id);
      setAlerts(p => p.filter(a => a.id !== id));
      toast('Alert dismissed.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to dismiss alert', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const total = alerts.length;

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Alerts</div>
          <div className="adm-page-sub">Flagged user queries matching prompt injection or jailbreak patterns.</div>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-stats">
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: 'var(--adm-danger-tint)' }}>
            <ShieldAlert size={18} color="var(--adm-danger)" />
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value" style={{ color: 'var(--adm-danger)' }}>{total}</div>
            <div className="adm-stat-label">Active Alert{total !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-toolbar">
          <span className="adm-user-count">{total} alert{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="kb-empty-state"><Loader size={20} className="kb-spin" /></div>
        ) : alerts.length === 0 ? (
          <div className="kb-empty-state">
            <ShieldAlert size={32} color="var(--adm-text-sub)" />
            <p>No alerts. All user queries look clean.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="adm-table-wrap adm-hide-mobile">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Flagged Query</th>
                    <th>User</th>
                    <th>Context</th>
                    <th>Detected At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr key={alert.id}>
                      <td style={{ maxWidth: '340px' }}>
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--adm-text)',
                          background: 'var(--adm-danger-tint)',
                          border: '1px solid var(--adm-danger)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontFamily: 'monospace',
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                        }}>
                          {alert.query}
                        </div>
                      </td>
                      <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px' }}>
                        {alert.user_id}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--adm-text-muted)' }}>
                        {alert.conversation_id != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={11} />
                            Conv #{alert.conversation_id}
                          </div>
                        )}
                        {alert.chat_message_id != null && (
                          <div style={{ color: 'var(--adm-text-sub)', fontSize: '11px' }}>
                            Msg #{alert.chat_message_id}
                          </div>
                        )}
                        {alert.conversation_id == null && '—'}
                      </td>
                      <td style={{ color: 'var(--adm-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatDateTime(alert.created_at)}
                      </td>
                      <td>
                        <div className="adm-row-actions">
                          <button
                            className="adm-row-btn adm-row-btn--danger"
                            title="Dismiss alert"
                            disabled={deletingId === alert.id}
                            onClick={() => handleDelete(alert.id)}
                            aria-label="Dismiss alert"
                          >
                            {deletingId === alert.id
                              ? <Loader size={14} className="kb-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="adm-mobile-cards adm-show-mobile">
              {alerts.map(alert => (
                <div key={alert.id} className="adm-mobile-card">
                  <div className="adm-mobile-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--adm-danger)',
                        background: 'var(--adm-danger-tint)',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-word',
                        lineHeight: 1.5,
                        border: '1px solid var(--adm-danger)',
                      }}>
                        {alert.query}
                      </div>
                    </div>
                    <div className="adm-row-actions" style={{ flexShrink: 0 }}>
                      <button
                        className="adm-row-btn adm-row-btn--danger"
                        title="Dismiss alert"
                        disabled={deletingId === alert.id}
                        onClick={() => handleDelete(alert.id)}
                        aria-label="Dismiss alert"
                      >
                        {deletingId === alert.id
                          ? <Loader size={14} className="kb-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="adm-mobile-card-details">
                    <div className="adm-mobile-card-detail">
                      <span className="adm-mobile-card-label">User</span>
                      <span className="adm-mobile-card-value">{alert.user_id}</span>
                    </div>
                    {alert.conversation_id != null && (
                      <div className="adm-mobile-card-detail">
                        <span className="adm-mobile-card-label">Conv</span>
                        <span className="adm-mobile-card-value">#{alert.conversation_id}</span>
                      </div>
                    )}
                    <div className="adm-mobile-card-detail">
                      <span className="adm-mobile-card-label">Detected</span>
                      <span className="adm-mobile-card-value">{formatDateTime(alert.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toasts */}
      {toasts.map(t => (
        <div key={t.id} className={`adm-toast ${t.type}`} role="status" aria-live="polite">
          {t.type === 'success'
            ? <CheckCircle size={16} color="var(--adm-success)" />
            : <AlertCircle size={16} color="var(--adm-danger)" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
};

export default Alerts;
