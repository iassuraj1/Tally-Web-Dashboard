import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getApiError = (err, fallback = 'Something went wrong') => (
  err?.userMessage ||
  (typeof err?.response?.data === 'string' ? err.response.data : '') ||
  err?.response?.data?.errors?.map?.((item) => item.msg || item.message || item).join(' ') ||
  err?.response?.data?.message ||
  err?.message ||
  fallback
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    err.userMessage = getApiError(err);
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url || '';
      const isAuthSubmit = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      const isAuthPage = window.location.pathname === '/app/login' || window.location.pathname === '/app/register';

      localStorage.removeItem('token');
      localStorage.removeItem('currentCompany');
      window.dispatchEvent(new Event('company:clear'));

      if (!isAuthSubmit && !isAuthPage) window.location.href = '/app/login';
    }
    return Promise.reject(err);
  }
);

export default api;
