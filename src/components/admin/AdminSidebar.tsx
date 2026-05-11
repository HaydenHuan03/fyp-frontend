import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, FileText,
  MessageSquare, FileCheck2, ShieldAlert,
  Activity, History, LogOut,
} from 'lucide-react';

type Section =
  | 'overview' | 'users' | 'knowledge' | 'documents'
  | 'conversations' | 'reports' | 'alerts'
  | 'jobs' | 'audit';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  alertCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function getInitials(email: string): string {
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

const GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview'  as Section, label: 'Overview',       Icon: LayoutDashboard },
      { id: 'users'     as Section, label: 'Users',          Icon: Users },
      { id: 'knowledge' as Section, label: 'Knowledge base', Icon: BookOpen },
      { id: 'documents' as Section, label: 'Documents',      Icon: FileText },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'conversations' as Section, label: 'Conversations', Icon: MessageSquare },
      { id: 'reports'       as Section, label: 'Case reports',  Icon: FileCheck2 },
      { id: 'alerts'        as Section, label: 'Alerts',        Icon: ShieldAlert, badge: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'jobs'  as Section, label: 'Background jobs', Icon: Activity },
      { id: 'audit' as Section, label: 'Audit log',       Icon: History },
    ],
  },
];

const AdminSidebar: React.FC<Props> = ({
  activeSection, onSectionChange, alertCount, mobileOpen, onMobileClose,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };
  const initials = user?.email ? getInitials(user.email) : 'AD';
  const displayName = user?.email?.split('@')[0] || 'Admin';
  const go = (s: Section) => { onSectionChange(s); onMobileClose?.(); };

  return (
    <>
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 29,
          }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside className={`side${mobileOpen ? ' is-open' : ''}`}>
        <div className="side__brand">
          <div className="side__mark">F</div>
          <div className="side__brand-name">FinGuardMY</div>
        </div>

        {GROUPS.map(g => (
          <div key={g.label}>
            <div className="side__nav-label">{g.label}</div>
            <nav className="side__nav">
              {g.items.map(({ id, label, Icon, badge }) => (
                <button
                  key={id}
                  className={`side__item${activeSection === id ? ' is-active' : ''}`}
                  onClick={() => go(id)}
                >
                  <Icon size={15} className="ico" />
                  {label}
                  {badge && alertCount != null && alertCount > 0 && (
                    <span className="badge">{alertCount > 99 ? '99+' : alertCount}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="side__spacer" />

        <div className="side__health">
          <span className="dot" />
          <span>All systems operational</span>
        </div>

        <div className="side__user">
          <div className="avatar">{initials}</div>
          <div className="side__user-meta">
            <span className="side__user-name">{displayName}</span>
            <span className="side__user-role">Administrator</span>
          </div>
          <button className="side__signout" title="Sign out" onClick={() => setShowLogout(true)}>
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {showLogout && (
        <div className="adm-modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Sign Out</div>
            <div className="adm-modal-sub">Are you sure you want to sign out of the Admin Console?</div>
            <div className="adm-modal-footer">
              <button className="adm-btn-secondary" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="adm-btn-danger" onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
