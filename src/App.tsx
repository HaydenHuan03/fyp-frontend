import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserDashboard from './pages/user/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Global guard: any browser back navigation while authenticated triggers
// sign-out. Combined with ProtectedRoute, this also ensures the forward
// button cannot re-enter the dashboard without re-login.
const BackButtonSignOut: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [signedOutNotice, setSignedOutNotice] = useState(false);

  useEffect(() => {
    if (!user) return;

    const handlePopState = () => {
      logout();
      setSignedOutNotice(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, logout]);

  // Only show the notice while the user is actually on the login page.
  if (!signedOutNotice || location.pathname !== '/') return null;

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" style={{ maxWidth: 400 }}>
        <div className="adm-modal-title">Signed out</div>
        <div className="adm-modal-sub">
          You've been signed out of your session. Please log in again to continue.
        </div>
        <div className="adm-modal-footer">
          <button
            className="adm-btn-primary"
            onClick={() => setSignedOutNotice(false)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/chat'} replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <>
    <BackButtonSignOut />
    <Routes>
      <Route path="/" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
