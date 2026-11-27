// Etiqueta: Cliente HTTP Axios con resolucion local/remota e inyeccion automatica de actor para auditoria
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

const obtenerSesionAlmacenada = (): {
  id_user?: string;
  nombres?: string;
  apellidos?: string;
  rol?: string;
} | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw || !raw.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.id_user === 'string' && typeof parsed.rol === 'string') {
        return {
          id_user: parsed.id_user,
          nombres: typeof parsed.nombres === 'string' ? parsed.nombres : '',
          apellidos: typeof parsed.apellidos === 'string' ? parsed.apellidos : '',
          rol: parsed.rol,
        };
      }
    } catch {
      // Ignora entradas que no sean JSON de sesion
    }
  }
  return null;
};

apiClient.interceptors.request.use((config) => {
  const sesion = obtenerSesionAlmacenada();
  if (sesion?.id_user) {
    const nombreCompleto = `${sesion.nombres || ''} ${sesion.apellidos || ''}`.trim();
    config.headers.set('x-user-id', encodeURIComponent(sesion.id_user));
    if (nombreCompleto) {
      config.headers.set('x-user-name', encodeURIComponent(nombreCompleto));
    }
    if (sesion.rol) {
      config.headers.set('x-user-rol', encodeURIComponent(sesion.rol));
    }
  }
  return config;
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