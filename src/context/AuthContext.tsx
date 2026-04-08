import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { apiRefreshToken, roleFromToken } from '../lib/api';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  /** Returns a valid (non-expired) access token, refreshing silently if needed. */
  getValidAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'finguard_auth';

function isTokenExpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() / 1000 >= payload.exp - 30;
  } catch {
    return true;
  }
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef<AuthUser | null>(null);

  /** Persist and broadcast a new auth user. */
  const applyUser = (u: AuthUser) => {
    saveUser(u);
    setUser(u);
    userRef.current = u;
  };

  const login = (u: AuthUser) => applyUser(u);

  const logout = () => {
    clearUser();
    setUser(null);
    userRef.current = null;
  };

  /**
   * Try to refresh using the stored refresh token.
   * Returns the refreshed AuthUser on success, or throws on failure.
   */
  const tryRefresh = async (stored: AuthUser): Promise<AuthUser> => {
    if (isTokenExpired(stored.refreshToken)) {
      throw new Error('Refresh token has expired. Please log in again.');
    }
    try {
      const data = await apiRefreshToken(stored.refreshToken);
      return {
        email: stored.email,
        role: roleFromToken(data.access_token),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Token refresh failed. Please log in again.',
      );
    }
  };

  // On mount: always refresh to validate session against Keycloak.
  // This ensures that if the backend/Keycloak was restarted (invalidating tokens),
  // the user is redirected to login rather than being stuck with stale tokens.
  useEffect(() => {
    (async () => {
      const stored = readStoredUser();

      if (!stored) {
        setIsInitializing(false);
        return;
      }

      // Always attempt a refresh to validate the session server-side.
      try {
        const refreshed = await tryRefresh(stored);
        applyUser(refreshed);
      } catch {
        // Refresh token expired or revoked → force re-login.
        clearUser();
      }

      setIsInitializing(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle 401 responses from API calls while the user is logged in.
  // Try to refresh first; show the modal only if refresh also fails.
  useEffect(() => {
    const handler = async () => {
      const current = userRef.current;
      if (!current) return;

      try {
        // Silently refresh — next API call in the component will succeed.
        const refreshed = await tryRefresh(current);
        applyUser(refreshed);
      } catch {
        // Refresh also failed — ask the user to log in again.
        setSessionExpired(true);
      }
    };

    window.addEventListener('finguard:unauthorized', handler);
    return () => window.removeEventListener('finguard:unauthorized', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRelogin = () => {
    setSessionExpired(false);
    logout();
  };

  const getValidAccessToken = async (): Promise<string> => {
    const current = userRef.current;
    if (!current) throw new Error('Not authenticated');
    if (!isTokenExpired(current.accessToken)) return current.accessToken;
    const refreshed = await tryRefresh(current);
    applyUser(refreshed);
    return refreshed.accessToken;
  };

  return (
    <AuthContext.Provider value={{ user, isInitializing, login, logout, getValidAccessToken }}>
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
