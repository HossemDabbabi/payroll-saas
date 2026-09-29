import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('payroll_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('payroll_token'));
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('payroll_token', authToken);
    localStorage.setItem('payroll_user', JSON.stringify(userData));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('payroll_token');
    localStorage.removeItem('payroll_user');
  }, []);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authAPI.getMe();
        setUser(data.user);
        localStorage.setItem('payroll_user', JSON.stringify(data.user));
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    persistAuth(data.user, data.token);
    return data;
  };

  const register = async (companyName, email, password) => {
    const { data } = await authAPI.register({ companyName, email, password });
    persistAuth(data.user, data.token);
    return data;
  };

  const logout = () => clearAuth();

  const refreshUser = async () => {
    const { data } = await authAPI.getMe();
    setUser(data.user);
    localStorage.setItem('payroll_user', JSON.stringify(data.user));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
