// src/pages/admin/AdminDashboard.tsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import UserManagement from './UserManagement';

type Section = 'users' | 'knowledge' | 'documents';

const sectionLabel: Record<Section, string> = {
  users:     'Manage Users',
  knowledge: 'Knowledge Base',
  documents: 'Documents',
};

const ComingSoon: React.FC<{ name: string }> = ({ name }) => (
  <div className="adm-coming-soon">
    <h2>{name}</h2>
    <p>This section is coming soon.</p>
  </div>
);

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
          {section === 'knowledge' && <ComingSoon name="Knowledge Base" />}
          {section === 'documents' && <ComingSoon name="Documents" />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
