import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Gauge, Users, Library, Files,
  MessagesSquare, ClipboardList, TriangleAlert,
  ScrollText, LogOut, ChartLine, Microscope,
} from 'lucide-react';
import { type Section } from '../../types/admin';
import { getInitials } from '../../lib/utils';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
  alertCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}


const GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview'  as Section, label: 'Overview',       Icon: Gauge   },
      { id: 'users'     as Section, label: 'Users',          Icon: Users   },
      { id: 'knowledge' as Section, label: 'Knowledge base', Icon: Library },
      { id: 'documents' as Section, label: 'Documents',      Icon: Files   },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'conversations' as Section, label: 'Conversations', Icon: MessagesSquare,  },
      { id: 'reports'       as Section, label: 'Case reports',  Icon: ClipboardList,   },
      { id: 'alerts'        as Section, label: 'Alerts',        Icon: TriangleAlert, badge: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'rag-analytics'  as Section, label: 'RAG Analytics',  Icon: ChartLine  },
      { id: 'rag-evaluation' as Section, label: 'RAG Evaluation', Icon: Microscope },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'audit' as Section, label: 'Audit log', Icon: ScrollText },
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
