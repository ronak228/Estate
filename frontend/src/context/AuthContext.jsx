import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthToken } from '../utils/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from sessionStorage on app load.
  // Token stored in sessionStorage (not localStorage) to reduce XSS exposure.
  useEffect(() => {
    const storedToken = sessionStorage.getItem('crm_token');
    if (storedToken) {
      setAuthToken(storedToken);
      setToken(storedToken);
      fetchMe(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (currentToken) => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch {
      // Token invalid or expired — clear session
      sessionStorage.removeItem('crm_token');
      setToken(null);
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    sessionStorage.setItem('crm_token', newToken);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Swallow — we always clear client state
    }
    sessionStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  }, []);

  // Browser tab title follows the logged-in company, everywhere — a Super
  // Admin (no single company) or a signed-out visitor sees the product name.
  useEffect(() => {
    document.title = user?.companyName ? `${user.companyName} — Real Estate CRM` : 'Real Estate CRM';
  }, [user?.companyName]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
