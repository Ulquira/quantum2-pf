import axios from 'axios';

const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const isLocalBrowser =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isLocalBrowser
  ? 'http://localhost:4000/api'
  : envUrl || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage = error?.response?.data?.error;
    const message =
      typeof serverMessage === 'string' && serverMessage.trim()
        ? serverMessage
        : error instanceof Error
        ? error.message
        : 'Error de conexión con el servidor';
    return Promise.reject(new Error(message));
  }
);