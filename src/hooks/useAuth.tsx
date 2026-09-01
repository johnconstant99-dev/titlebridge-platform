import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import {
  getStoredUser,
  login as authLogin,
  staffLogin as authStaffLogin,
  register as authRegister,
  logout as authLogout,
  hasStaffAccess,
  type LoginCredentials,
  type RegisterData,
} from '../services/authService';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  staffLogin: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const u = await authLogin(credentials);
    setUser(u);
    return u;
  }, []);

  const staffLogin = useCallback(async (credentials: LoginCredentials) => {
    const u = await authStaffLogin(credentials);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const u = await authRegister(data);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isStaff: hasStaffAccess(user),
      login,
      staffLogin,
      register,
      logout,
    }),
    [user, isLoading, login, staffLogin, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
