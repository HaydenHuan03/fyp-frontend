import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Overview from './Overview';
import UserManagement from './UserManagement';
import KnowledgeBase from './KnowledgeBase';
import Documents from './Documents';
import Conversations from './Conversations';
import Alerts from './Alerts';
import AuditLog from './AuditLog';
import RagAnalytics from './RagAnalytics';
import RagEvaluation from './RagEvaluation';
import { apiListAlerts } from '../../lib/api';
import { type Section } from '../../types/admin';
import { getInitials } from '../../lib/utils';

const SECTIONS: Section[] = [
  'overview', 'users', 'knowledge', 'documents',
  'conversations', 'alerts', 'audit',
  'rag-analytics', 'rag-evaluation',
];

const LABELS: Record<Section, string> = {
  overview: 'Overview', users: 'Users', knowledge: 'Knowledge base',
  documents: 'Documents', conversations: 'Conversations',
  alerts: 'Alerts', audit: 'Audit log',
  'rag-analytics': 'RAG Analytics', 'rag-evaluation': 'RAG Evaluation',
};

const SESSION_KEY = 'adm_section';

function readSection(): Section {
  const s = sessionStorage.getItem(SESSION_KEY) as Section | null;
  return s && SECTIONS.includes(s) ? s : 'overview';
}

const AdminDashboard: React.FC = () => {
  const [section, setSection]           = useState<Section>(readSection);
  const [mobileSidebarOpen, setMobile]  = useState(false);
  const [alertCount, setAlertCount]     = useState(0);
  const { user } = useAuth();

  const userInitials = user?.email ? getInitials(user.email) : 'AD';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiListAlerts(user.accessToken)
      .then(alerts => { if (!cancelled) setAlertCount(alerts.length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const go = (s: Section) => {
    sessionStorage.setItem(SESSION_KEY, s);
    setSection(s);
  };

  return (
    <div className="app">
      <AdminSidebar
        activeSection={section}
        onSectionChange={go}
        alertCount={alertCount}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobile(false)}
      />

      <div className="adm-shell-body">
        <header className="top">
          {/* Mobile hamburger — hidden on desktop via CSS */}
          <button
            className="adm-mobile-menu-btn"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
            style={{ marginRight: 4 }}
          >
            <Menu size={18} />
          </button>

          <div className="top__crumb">
            <span>Admin</span>
            <span className="sep">/</span>
            <span className="here">{LABELS[section]}</span>
          </div>

          <div className="avatar" title={user?.email} style={{ marginLeft: 'auto' }}>{userInitials}</div>
        </header>

        {section === 'overview'      && <Overview />}
        {section === 'users'         && <UserManagement />}
        {section === 'knowledge'     && <KnowledgeBase />}
        {section === 'documents'     && <Documents />}
        {section === 'conversations' && <Conversations />}
        {section === 'alerts'        && <Alerts />}
        {section === 'audit'          && <AuditLog />}
        {section === 'rag-analytics'  && <RagAnalytics />}
        {section === 'rag-evaluation' && <RagEvaluation />}
      </div>
    </div>
  );
};

export default AdminDashboard;
