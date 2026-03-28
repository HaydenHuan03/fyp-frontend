// src/pages/admin/AdminDashboard.tsx
import { useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import UserManagement from './UserManagement';

type Section = 'users' | 'knowledge' | 'documents';

const ComingSoon: React.FC<{ name: string }> = ({ name }) => (
  <div className="adm-coming-soon">
    <h2>{name}</h2>
    <p>This section is coming soon.</p>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [section, setSection] = useState<Section>('users');

  return (
    <div className="adm-root">
      <AdminSidebar activeSection={section} onSectionChange={setSection} />
      <main className="adm-main">
        {section === 'users'     && <UserManagement />}
        {section === 'knowledge' && <ComingSoon name="Knowledge Base" />}
        {section === 'documents' && <ComingSoon name="Documents" />}
      </main>
    </div>
  );
};

export default AdminDashboard;
