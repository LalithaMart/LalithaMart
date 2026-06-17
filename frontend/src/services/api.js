import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
const api = axios.create({
  baseURL: backendUrl ? `${backendUrl}/api` : '/api',
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
