import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('omniops_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint && window.location.pathname !== '/login') {
        Cookies.remove('omniops_token');
        Cookies.remove('omniops_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);
