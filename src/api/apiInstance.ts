import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/state/authStore';

import { API_BASE_URL } from '@/config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Many modules call the default axios directly; only send the token to our own backend.
axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.url?.startsWith(API_BASE_URL) && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Response interceptor to handle token refresh or logout on 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout user
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
