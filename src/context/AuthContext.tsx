import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'finguard_auth';

function isTokenExpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() / 1000 >= payload.exp;
  } catch {
    return true;
  }
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    if (isTokenExpired(user.accessToken)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef(user);

  const login = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    userRef.current = u;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    userRef.current = null;
  };

  useEffect(() => {
    // Only show the modal when a 401 arrives while the user was actively logged in.
    // On page refresh with an expired token, loadUser() already returns null so
    // userRef.current is null and ProtectedRoute handles the redirect silently.
    const handler = () => {
      if (userRef.current) setSessionExpired(true);
    };
    window.addEventListener('finguard:unauthorized', handler);
    return () => window.removeEventListener('finguard:unauthorized', handler);
  }, []);

  const handleRelogin = () => {
    setSessionExpired(false);
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
      {sessionExpired && (
        <div className="sess-overlay" role="dialog" aria-modal="true" aria-labelledby="sess-title">
          <div className="sess-card">
            <div className="sess-icon-wrap" aria-hidden="true">
              <Lock size={22} />
            </div>
            <h2 id="sess-title" className="sess-title">Session Expired</h2>
            <p className="sess-body">
              Your session has timed out for security. Please log in again to continue.
            </p>
            <button className="sess-btn" onClick={handleRelogin}>
              Log In Again
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
