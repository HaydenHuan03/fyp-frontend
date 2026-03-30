import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Section = 'users' | 'knowledge' | 'documents';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
}

function getInitials(email: string): string {
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const AdminSidebar: React.FC<Props> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const initials = user?.email ? getInitials(user.email) : 'AD';

  return (
    <aside className="adm-sidebar">
      {/* Logo */}
      <div className="adm-logo-section">
        <div className="adm-logo">
          <div className="adm-logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="adm-logo-wordmark">
            <span className="adm-logo-text">FinGuardMY</span>
            <span className="adm-logo-sub">Admin Console</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="adm-nav">
        <div className="adm-nav-label">Management</div>

        <button
          className={`adm-nav-item${activeSection === 'users' ? ' active' : ''}`}
          onClick={() => onSectionChange('users')}
        >
          <UsersIcon />
          Users
        </button>
        <button
          className={`adm-nav-item${activeSection === 'knowledge' ? ' active' : ''}`}
          onClick={() => onSectionChange('knowledge')}
        >
          <BookIcon />
          Knowledge Base
        </button>
        <button
          className={`adm-nav-item${activeSection === 'documents' ? ' active' : ''}`}
          onClick={() => onSectionChange('documents')}
        >
          <FileTextIcon />
          Documents
        </button>
      </nav>

      {/* User strip */}
      <div className="adm-user-strip">
        <div className="adm-user-info">
          <div className="adm-user-avatar">{initials}</div>
          <div className="adm-user-meta">
            <div className="adm-user-email-text">{user?.email}</div>
            <div className="adm-user-role-label">Administrator</div>
          </div>
        </div>
        <button className="adm-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
