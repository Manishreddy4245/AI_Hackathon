import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, portalRole?: UserRole) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  registerStudent: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerRecruiter: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerPlacementOfficer: (data: any) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string, portalRole?: UserRole) => Promise<{ success: boolean; message: string }>;
  getPortalDashboardUrl: (role?: UserRole) => string;
  getPortalLoginUrl: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getPortalDashboardUrl = (role?: UserRole): string => {
  if (!role) return '/login';
  switch (role) {
    case 'student':
      return '/student/dashboard';
    case 'recruiter':
      return '/recruiter/dashboard';
    case 'placement_officer':
      return '/admin/dashboard';
    default:
      return '/login';
  }
};

export const getPortalLoginUrl = (role?: UserRole): string => {
  if (!role) return '/login';
  switch (role) {
    case 'student':
      return '/login/student';
    case 'recruiter':
      return '/login/recruiter';
    case 'placement_officer':
      return '/login/placement-officer';
    default:
      return '/login';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('placemind_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('placemind_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser && currentUser.id) {
          setUser({
            id: currentUser.id || currentUser.sub,
            name: currentUser.name || 'User',
            email: currentUser.email,
            role: currentUser.role,
            companyId: currentUser.companyId,
          });
        } else {
          localStorage.removeItem('placemind_token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Session verification failed, resetting token.');
        localStorage.removeItem('placemind_token');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    portalRole?: UserRole
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    try {
      const res = await apiService.login({
        email: email.trim(),
        password,
        portalRole: portalRole,
      });

      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
        setToken(res.access_token);
      }

      const authUser: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        companyId: res.user.companyId,
      };

      setUser(authUser);
      return { success: true, user: authUser };
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      return { success: false, error: msg };
    }
  };

  const registerStudent = async (data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiService.registerStudent(data);
      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.detail || 'Registration failed.' };
    }
  };

  const registerRecruiter = async (data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiService.registerRecruiter(data);
      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.detail || 'Corporate registration failed.' };
    }
  };

  const registerPlacementOfficer = async (data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiService.registerPlacementOfficer(data);
      if (res.access_token) {
        localStorage.setItem('placemind_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.detail || 'Placement Officer registration failed.' };
    }
  };

  const forgotPassword = async (email: string, portalRole?: UserRole): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiService.forgotPassword({
        email,
        portalRole: portalRole,
      });
      return { success: true, message: res.message || 'Password reset link sent.' };
    } catch (err: any) {
      return {
        success: true,
        message: `If an account matching '${email}' exists in this portal, reset instructions have been sent.`,
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('placemind_token');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        registerStudent,
        registerRecruiter,
        registerPlacementOfficer,
        forgotPassword,
        getPortalDashboardUrl,
        getPortalLoginUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
