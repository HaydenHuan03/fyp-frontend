import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const login = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  useEffect(() => {
    const handler = () => setSessionExpired(true);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Session Expired</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Your session has expired. Please log in again to continue.
            </p>
            <button
              onClick={handleRelogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
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
