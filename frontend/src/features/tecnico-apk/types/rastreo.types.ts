// Etiqueta: Tipos para control de jornada y pings continuos de geolocalizacion en la APK
export type EstadoGpsApk = 'APAGADO' | 'BUSCANDO' | 'ACTIVO' | 'SIN_PERMISO' | 'ERROR';

export interface JornadaActivaApk {
  id_jornada: number;
  id_user: string;
  estado: 'ACTIVA' | 'FINALIZADA';
  inicio_at: string;
  inicio_lat: number | null;
  inicio_lng: number | null;
}

export interface CoordenadaGps {
  lat: number;
  lng: number;
  precision_m: number | null;
  velocidad_ms: number | null;
  capturado_at: string;
}

export interface PingUbicacionPayload extends CoordenadaGps {
  id_user: string;
  id_jornada?: number;
  bateria: number | null;
  id_operacion_activa: string | null;
  estado_operativo: string;
}