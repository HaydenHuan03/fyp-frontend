import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Overview from './Overview';
import UserManagement from './UserManagement';
import KnowledgeBase from './KnowledgeBase';
import Documents from './Documents';
import Conversations from './Conversations';
import CaseReports from './CaseReports';
import Alerts from './Alerts';
import AuditLog from './AuditLog';
import RagAnalytics from './RagAnalytics';
import RagEvaluation from './RagEvaluation';
import { apiListAlerts } from '../../lib/api';

type Section =
  | 'overview' | 'users' | 'knowledge' | 'documents'
  | 'conversations' | 'reports' | 'alerts' | 'audit'
  | 'rag-analytics' | 'rag-evaluation';

const SECTIONS: Section[] = [
  'overview', 'users', 'knowledge', 'documents',
  'conversations', 'reports', 'alerts', 'audit',
  'rag-analytics', 'rag-evaluation',
];

const LABELS: Record<Section, string> = {
  overview: 'Overview', users: 'Users', knowledge: 'Knowledge base',
  documents: 'Documents', conversations: 'Conversations', reports: 'Case reports',
  alerts: 'Alerts', audit: 'Audit log',
  'rag-analytics': 'RAG Analytics', 'rag-evaluation': 'RAG Evaluation',
};

const SESSION_KEY = 'adm_section';
const THEME_KEY   = 'adm_theme';

function readSection(): Section {
  const s = sessionStorage.getItem(SESSION_KEY) as Section | null;
  return s && SECTIONS.includes(s) ? s : 'overview';
}
function readTheme(): 'light' | 'dark' {
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
}
function initials(email: string): string {
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

const AdminDashboard: React.FC = () => {
  const [section, setSection]           = useState<Section>(readSection);
  const [mobileSidebarOpen, setMobile]  = useState(false);
  const [theme, setTheme]               = useState<'light' | 'dark'>(readTheme);
  const [alertCount, setAlertCount]     = useState(0);
  const { user } = useAuth();

  const userInitials = user?.email ? initials(user.email) : 'AD';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const fetchAlertCount = useCallback(async () => {
    if (!user) return;
    try { setAlertCount((await apiListAlerts(user.accessToken)).length); }
    catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchAlertCount(); }, [fetchAlertCount]);

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

          <div className="top__cmd" role="search">
            <Search size={14} />
            <span>Search…</span>
            <span className="kbd">⌘K</span>
          </div>

          <button
            className="top__icon"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button className="top__icon" title="Notifications">
            <Bell size={15} />
            {alertCount > 0 && <span className="top__icon-dot" />}
          </button>

          <div className="avatar" title={user?.email}>{userInitials}</div>
        </header>

        {section === 'overview'      && <Overview />}
        {section === 'users'         && <UserManagement />}
        {section === 'knowledge'     && <KnowledgeBase />}
        {section === 'documents'     && <Documents />}
        {section === 'conversations' && <Conversations />}
        {section === 'reports'       && <CaseReports />}
        {section === 'alerts'        && <Alerts />}
{section === 'audit'          && <AuditLog />}
        {section === 'rag-analytics'  && <RagAnalytics />}
        {section === 'rag-evaluation' && <RagEvaluation />}
      </div>
    </div>
  );
};

export default AdminDashboard;
