// src/pages/admin/AdminDashboard.tsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import UserManagement from './UserManagement';
import KnowledgeBase from './KnowledgeBase';
import Documents from './Documents';

type Section = 'users' | 'knowledge' | 'documents';

const sectionLabel: Record<Section, string> = {
  users:     'Manage Users',
  knowledge: 'Knowledge Base',
  documents: 'Documents',
};


const AdminDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('users');
  const { user } = useAuth();

  const displayName = user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="adm-root">
      <AdminSidebar activeSection={section} onSectionChange={setSection} />
      <div className="adm-content">
        <header className="adm-topbar">
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
