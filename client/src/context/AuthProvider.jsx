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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return applySession(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return applySession(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearCompanySelection();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
