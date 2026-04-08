// src/pages/admin/AdminDashboard.tsx
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import UserManagement from './UserManagement';
import KnowledgeBase from './KnowledgeBase';
import Documents from './Documents';

type Section = 'users' | 'knowledge' | 'documents';

const SECTIONS: Section[] = ['users', 'knowledge', 'documents'];
const SESSION_KEY = 'adm_section';

function readSection(): Section {
  const stored = sessionStorage.getItem(SESSION_KEY) as Section | null;
  return stored && SECTIONS.includes(stored) ? stored : 'users';
}

const sectionLabel: Record<Section, string> = {
  users:     'Manage Users',
  knowledge: 'Knowledge Base',
  documents: 'Documents',
};


const AdminDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>(readSection);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSectionChange = (s: Section) => {
    sessionStorage.setItem(SESSION_KEY, s);
    setSection(s);
  };
  const { user } = useAuth();

  const displayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="adm-root">
      <AdminSidebar
        activeSection={section}
        onSectionChange={s => { handleSectionChange(s); setMobileSidebarOpen(false); }}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="adm-content">
        <header className="adm-topbar">
          <button
            className="adm-mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="adm-breadcrumb">
            FinGuardMY
            <span className="adm-breadcrumb-sep">›</span>
            <span className="adm-breadcrumb-current">{sectionLabel[section]}</span>
          </div>
          <div className="adm-topbar-right">
            Welcome, <strong>{displayName}</strong>
            <span className="adm-admin-badge">admin</span>
          </div>
        </header>
        <main className="adm-main">
          {section === 'users'     && <UserManagement />}
          {section === 'knowledge' && <KnowledgeBase />}
          {section === 'documents' && <Documents />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
