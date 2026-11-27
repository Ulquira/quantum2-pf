// Etiqueta: Servicio HTTP, captura GPS/Bateria, Haversine y buffer offline de ubicaciones
import { apiClient } from '../../../lib/apiClient';
import type {
  CoordenadaGps,
  JornadaActivaApk,
  PingUbicacionPayload,
} from '../types/rastreo.types';

const STORAGE_BUFFER_KEY = 'pf_gps_offline_buffer_v1';
const MAX_BUFFER_PUNTOS = 40;

interface BatteryManagerLike {
  level: number;
}

// Etiqueta: Distancia Haversine en metros para distinguir desplazamiento vs quietud
export const calcularDistanciaMetros = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Etiqueta: Lectura de bateria del dispositivo cuando el navegador/WebView lo soporta
export const obtenerNivelBateria = async (): Promise<number | null> => {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (!nav.getBattery) return null;
    const bat = await nav.getBattery();
    return Math.round(bat.level * 100);
  } catch {
    return null;
  }
};

// Etiqueta: Captura puntual GPS con timeout controlado
export const capturarCoordenadaGps = (
  altaPrecision = true,
  timeoutMs = 8000
): Promise<CoordenadaGps> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('GPS no disponible en este dispositivo'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(7)),
          lng: Number(pos.coords.longitude.toFixed(7)),
          precision_m: Number.isFinite(pos.coords.accuracy)
            ? Math.round(pos.coords.accuracy)
            : null,
          velocidad_ms:
            pos.coords.speed !== null && Number.isFinite(pos.coords.speed)
              ? Number(pos.coords.speed.toFixed(2))
              : null,
          capturado_at: new Date().toISOString(),
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: altaPrecision,
        timeout: timeoutMs,
        maximumAge: altaPrecision ? 5000 : 30000,
      }
    );
  });

// Etiqueta: Buffer liviano offline para reenviar coordenadas al recuperar señal
export const guardarPingOffline = (ping: PingUbicacionPayload): void => {
  try {
    const actual = leerPingsOffline();
    const siguiente = [...actual, ping].slice(-MAX_BUFFER_PUNTOS);
    localStorage.setItem(STORAGE_BUFFER_KEY, JSON.stringify(siguiente));
  } catch {
    // Ignora si el almacenamiento esta lleno
  }
};

export const leerPingsOffline = (): PingUbicacionPayload[] => {
  try {
    const raw = localStorage.getItem(STORAGE_BUFFER_KEY);
    return raw ? (JSON.parse(raw) as PingUbicacionPayload[]) : [];
  } catch {
    return [];
  }
};

export const vaciarPingsOffline = (): void => {
  localStorage.removeItem(STORAGE_BUFFER_KEY);
};

// Etiqueta: Llamadas al modulo backend /api/rastreo
export const consultarJornadaActiva = async (
  idUser: string
): Promise<{ en_jornada: boolean; jornada: JornadaActivaApk | null }> => {
  const { data } = await apiClient.get<{
    en_jornada: boolean;
    jornada: JornadaActivaApk | null;
  }>(`/rastreo/jornada/${encodeURIComponent(idUser)}`);
  return data;
};

export const iniciarJornadaApi = async (payload: {
  id_user: string;
  lat?: number | null;
  lng?: number | null;
  precision_m?: number | null;
  bateria?: number | null;
}): Promise<{ en_jornada: boolean; jornada: JornadaActivaApk }> => {
  const { data } = await apiClient.post<{
    en_jornada: boolean;
    jornada: JornadaActivaApk;
  }>('/rastreo/jornada/iniciar', payload);
  return data;
};

export const finalizarJornadaApi = async (payload: {
  id_user: string;
  lat?: number | null;
  lng?: number | null;
  motivo_cierre: 'MANUAL' | 'LOGOUT' | 'HORARIO_20H' | 'GESTOR';
}): Promise<void> => {
  await apiClient.post('/rastreo/jornada/finalizar', payload);
};

export const enviarPingUbicacionApi = async (ping: PingUbicacionPayload): Promise<void> => {
  await apiClient.post('/rastreo/ubicacion', ping);
};

export const enviarLoteUbicacionesApi = async (
  idUser: string,
  puntos: PingUbicacionPayload[]
): Promise<void> => {
  await apiClient.post('/rastreo/ubicacion/lote', { id_user: idUser, puntos });
};