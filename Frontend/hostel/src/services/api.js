import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000/api';

// 1. Create instances
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const studentApi = axios.create({
  baseURL: `${API_BASE_URL}/student`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export const hostelApi = axios.create({
  baseURL: `${API_BASE_URL}/app`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// 2. Create a helper function to attach the auth token to ANY instance
const setupInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login/student';
      }
      return Promise.reject(error);
    }
  );
};

// 3. Apply the security interceptors to ALL instances
setupInterceptors(api);
setupInterceptors(studentApi);
setupInterceptors(hostelApi);

export default api;