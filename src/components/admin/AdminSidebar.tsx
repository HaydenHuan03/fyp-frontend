import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

type Section = 'users' | 'knowledge' | 'documents';

interface Props {
  activeSection: Section;
  onSectionChange: (s: Section) => void;
}

const AdminSidebar: React.FC<Props> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="adm-sidebar">
      {/* Logo */}
      <div className="adm-logo">
        <div className="adm-logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 6l9-3 9 3M3 6v6c0 4.97 4.03 9 9 9s9-4.03 9-9V6" />
          </svg>
        </div>
        <span className="adm-logo-text">FinGuardMY</span>
      </div>

      {/* Nav */}
      <div className="adm-nav-label">Management</div>

      <button
        className={`adm-nav-item${activeSection === 'users' ? ' active' : ''}`}
        onClick={() => onSectionChange('users')}
      >
        Users
      </button>
      <button
        className={`adm-nav-item${activeSection === 'knowledge' ? ' active' : ''}`}
        onClick={() => onSectionChange('knowledge')}
      >
        Knowledge Base
      </button>
      <button
        className={`adm-nav-item${activeSection === 'documents' ? ' active' : ''}`}
        onClick={() => onSectionChange('documents')}
      >
        Documents
      </button>

      {/* Bottom */}
      <div className="adm-sidebar-bottom">
        <div className="adm-user-email">{user?.email}</div>
        <button className="adm-theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
        </button>
        <button className="adm-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
