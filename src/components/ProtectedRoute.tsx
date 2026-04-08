import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  role: UserRole;
}

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  user:  '/dashboard',
};

const ProtectedRoute: React.FC<Props> = ({ children, role }) => {
  const { user, isInitializing } = useAuth();

  if (isInitializing) return null; // wait until localStorage is checked
  if (!user) return <Navigate to="/" replace />;

  // Authenticated but wrong role → send to their own dashboard
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
