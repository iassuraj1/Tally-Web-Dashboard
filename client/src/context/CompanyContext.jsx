import { createContext, useContext, useState, useEffect } from 'react';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [company, setCompanyState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentCompany')) || null; }
    catch { return null; }
  });

  const setCompany = (c) => {
    setCompanyState(c);
    if (c) localStorage.setItem('currentCompany', JSON.stringify(c));
    else   localStorage.removeItem('currentCompany');
  };

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
