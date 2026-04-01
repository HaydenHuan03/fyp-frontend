import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, FileText, Shield } from 'lucide-react';

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
            <Shield size={14} color="#fff" strokeWidth={2.5} />
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
          <Users size={16} />
          Users
        </button>
        <button
          className={`adm-nav-item${activeSection === 'knowledge' ? ' active' : ''}`}
          onClick={() => onSectionChange('knowledge')}
        >
          <BookOpen size={16} />
          Knowledge Base
        </button>
        <button
          className={`adm-nav-item${activeSection === 'documents' ? ' active' : ''}`}
          onClick={() => onSectionChange('documents')}
        >
          <FileText size={16} />
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
