import React, { createContext, useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { apiRefreshToken, registerAuthBridge, roleFromToken } from '../lib/api';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  /** Returns a valid (non-expired) access token, refreshing silently if needed. */
  getValidAccessToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = readStoredUser();
    return stored && !isTokenExpired(stored.accessToken) ? stored : null;
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    const stored = readStoredUser();
    return stored !== null && isTokenExpired(stored.accessToken);
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef<AuthUser | null>(user);

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

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) return;

    if (!isTokenExpired(stored.accessToken)) {
      // Token already valid — state initialised from localStorage above.
      // Fire background refresh to rotate tokens silently.
      tryRefresh(stored)
        .then(refreshed => applyUser(refreshed))
        .catch(() => {
          if (isTokenExpired(stored.refreshToken)) {
            clearUser();
            setUser(null);
            userRef.current = null;
          }
        })
        .finally(() => setIsInitializing(false));
      return;
    }

    // Access token expired — must refresh before allowing navigation.
    tryRefresh(stored)
      .then(refreshed => applyUser(refreshed))
      .catch(() => clearUser())
      .finally(() => setIsInitializing(false));
  }, []);

  // Register the fetch interceptor bridge so api.ts can transparently refresh
  // the access token on 401 and retry the failing request.
  useEffect(() => {
    return registerAuthBridge({
      refresh: async () => {
        const current = userRef.current;
        if (!current) throw new Error('Not authenticated');
        const refreshed = await tryRefresh(current);
        applyUser(refreshed);
        return refreshed.accessToken;
      },
      onUnauthorized: () => setSessionExpired(true),
    });
  }, []);

  // Fallback for non-fetch code paths (e.g. WebSocket auth failures) that
  // dispatch `finguard:unauthorized` directly.
  useEffect(() => {
    const handler = async () => {
      const current = userRef.current;
      if (!current) return;
      try {
        const refreshed = await tryRefresh(current);
        applyUser(refreshed);
      } catch {
        setSessionExpired(true);
      }
    };
    window.addEventListener('finguard:unauthorized', handler);
    return () => window.removeEventListener('finguard:unauthorized', handler);
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

