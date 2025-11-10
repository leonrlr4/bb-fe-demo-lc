import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, apiService } from '../services';
import { User, AuthResponse } from '../types';
import { getErrorMessage } from '../utils';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = authService.getToken();
    const savedUser = authService.getUser();

    setIsAuthenticated(!!token);

    if (token && savedUser) {
      setUser(savedUser);
    } else {
      setUser(null);
    }
    setIsLoading(false);

    apiService.setOnUnauthorized(() => {
      setUser(null);
      setIsAuthenticated(false);
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'user') {
        const newToken = authService.getToken();
        const newUser = authService.getUser();

        if (!newToken) {
          setUser(null);
          setIsAuthenticated(false);
        } else if (newUser) {
          setUser(newUser);
          setIsAuthenticated(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    const response: AuthResponse = await authService.login({ email, password });
    const authUser = response.user ?? authService.getUser();
    setUser(authUser);
    setIsAuthenticated(true);
  };

  const register = async (username: string, email: string, password: string) => {
    const response: AuthResponse = await authService.register({ username, email, password });
    const authUser = response.user ?? authService.getUser();
    setUser(authUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
