import { useCallback, useEffect, useState } from 'react';
import CompanyContext from './CompanyContext';
import api from '../utils/api';

export function CompanyProvider({ children }) {
  const [company, setCompanyState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentCompany')) || null;
    } catch {
      return null;
    }
  });
  const [financialYears, setFinancialYears] = useState([]);
  const currentFinancialYear = financialYears.find((year) => year.isActive) || null;

  const clearCompany = useCallback(() => {
    localStorage.removeItem('currentCompany');
    setCompanyState(null);
    setFinancialYears([]);
  }, []);

  const setCompany = (nextCompany) => {
    setCompanyState(nextCompany);
    if (nextCompany) localStorage.setItem('currentCompany', JSON.stringify(nextCompany));
    else localStorage.removeItem('currentCompany');
  };

  const refreshFinancialYears = useCallback(async () => {
    if (!company?._id) {
      setFinancialYears([]);
      return [];
    }
    const res = await api.get(`/companies/${company._id}/financial-years`);
    const years = res.data.data || [];
    setFinancialYears(years);
    return years;
  }, [company]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      refreshFinancialYears().catch(() => {
        if (active) clearCompany();
      });
    });
    return () => { active = false; };
  }, [clearCompany, refreshFinancialYears]);

  useEffect(() => {
    window.addEventListener('company:clear', clearCompany);
    return () => window.removeEventListener('company:clear', clearCompany);
  }, [clearCompany]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const mode = company?.appearanceMode || 'system';
    const applyTheme = () => {
      const resolvedTheme = mode === 'system' && media ? (media.matches ? 'dark' : 'light') : mode;
      root.dataset.appearanceMode = mode;
      root.dataset.appTheme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    if (mode !== 'system' || !media) return undefined;

    media.addEventListener?.('change', applyTheme);
    media.addListener?.(applyTheme);
    return () => {
      media.removeEventListener?.('change', applyTheme);
      media.removeListener?.(applyTheme);
    };
  }, [company?.appearanceMode]);

  return (
    <CompanyContext.Provider value={{ company, setCompany, financialYears, currentFinancialYear, refreshFinancialYears }}>
      {children}
    </CompanyContext.Provider>
  );
}
