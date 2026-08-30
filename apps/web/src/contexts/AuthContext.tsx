/**
 * Auth Context
 *
 * Provides authentication state and methods to the entire app.
 * Handles login, logout, auto-refresh on mount, and role-based access.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, type AuthUser } from '@/services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  /**
   * Attempt to restore session on mount.
   */
  const initAuth = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    // Restore user from localStorage immediately for fast rendering
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // corrupted data, ignore
      }
    }

    // Validate with the server
    try {
      const profile = await authApi.getProfile();
      const restoredUser: AuthUser = {
        _id: profile._id as string,
        email: profile.email as string,
        role: profile.role as string,
        isActive: profile.isActive as boolean,
        name: profile.name as string,
        profile: profile.profile as Record<string, unknown> | undefined,
      };
      setUser(restoredUser);
      localStorage.setItem('user', JSON.stringify(restoredUser));
    } catch {
      // Token invalid — clear everything
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /**
   * Login and store tokens + user.
   */
  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    setUser(data.user);
  }, []);

  /**
   * Logout — revoke tokens and clear state.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if API call fails, clear local state
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  /**
   * Update user state (e.g., after profile update).
   */
  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
