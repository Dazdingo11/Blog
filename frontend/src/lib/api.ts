import axios from 'axios';

// Accept both NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_API_BASE for flexibility.
const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://localhost:3001/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Carry the stored access token on every request when available.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
