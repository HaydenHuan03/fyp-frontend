import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserDashboard from './pages/user/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const BackButtonSignOut: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    window.history.pushState({}, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState({}, '', window.location.href);
      setShowModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  if (!showModal) return null;

  const handleStay = () => setShowModal(false);

  const handleSignOut = () => {
    setShowModal(false);
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" style={{ maxWidth: 400 }}>
        <div className="adm// When the user presses the browser back button while authenticated, prompt
// them with a Sign Out / Stay confirmation modal. The pushState sentinel
// ensures the back press is captured inside the SPA instead of exiting to
// the browser homepage when the dashboard is the only history entry.-modal-title">Sign Out?</div>
        <div className="adm-modal-sub">
          You are about to leave the dashboard. This will sign you out of your current session.
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-secondary" onClick={handleStay}>Stay</button>
          <button className="adm-btn-danger" onClick={handleSignOut}>Sign Out</button>
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
