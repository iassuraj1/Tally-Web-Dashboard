import { useCallback, useEffect, useState } from 'react';
import AuthContext from './AuthContext';
import api from '../utils/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  const clearCompanySelection = useCallback(() => {
    localStorage.removeItem('currentCompany');
    window.dispatchEvent(new Event('company:clear'));
  }, []);

  const applySession = useCallback((data) => {
    if (!data?.token) return data;
    localStorage.setItem('token', data.token);
    clearCompanySelection();
    setUser(data.user);
    return data;
  }, [clearCompanySelection]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        clearCompanySelection();
      })
      .finally(() => setLoading(false));
  }, [clearCompanySelection]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return applySession(data);
  }, [applySession]);

  const register = useCallback(async (name, email, password, company) => {
    const { data } = await api.post('/auth/register', { name, email, password, company });
    return applySession(data);
  }, [applySession]);

  const verifyEmail = useCallback(async (token, email = '') => {
    const { data } = await api.post('/auth/verify-email', { token, email });
    return data;
  }, []);

  const resendVerification = useCallback(async (email) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    clearCompanySelection();
    setUser(null);
  }, [clearCompanySelection]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, resendVerification, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
