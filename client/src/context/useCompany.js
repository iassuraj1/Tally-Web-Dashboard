import { useContext } from 'react';
import CompanyContext from './CompanyContext';

export const useCompany = () => useContext(CompanyContext);
