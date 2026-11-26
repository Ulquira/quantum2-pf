// Etiqueta: Hook de control de jornada (tipo Uber) y extraccion continua cada 15s con ahorro en quietud
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoordenadaGps, EstadoGpsApk, JornadaActivaApk } from '../types/rastreo.types';
import {
  calcularDistanciaMetros,
  capturarCoordenadaGps,
  consultarJornadaActiva,
  enviarLoteUbicacionesApi,
  enviarPingUbicacionApi,
  finalizarJornadaApi,
  guardarPingOffline,
  iniciarJornadaApi,
  leerPingsOffline,
  obtenerNivelBateria,
  vaciarPingsOffline,
} from '../services/rastreoService';

const INTERVALO_MOVIMIENTO_MS = 15_000;
const INTERVALO_QUIETO_MS = 30_000;
const RADIO_QUIETUD_M = 20;
const UMBRAL_TIEMPO_QUIETUD_MS = 120_000;
const MAX_PRECISION_ACEPTABLE_M = 100;

interface Params {
  idUser: string;
  idOperacionActiva: string | null;
  estadoOperativo: string;
}

export const useMonitoreoJornada = ({
  idUser,
  idOperacionActiva,
  estadoOperativo,
}: Params) => {
  const [enJornada, setEnJornada] = useState(false);
  const [jornada, setJornada] = useState<JornadaActivaApk | null>(null);
  const [cambiandoJornada, setCambiandoJornada] = useState(false);
  const [estadoGps, setEstadoGps] = useState<EstadoGpsApk>('APAGADO');
  const [ultimaCoord, setUltimaCoord] = useState<CoordenadaGps | null>(null);

  const ultimaCoordRef = useRef<CoordenadaGps | null>(null);
  const sinMovimientoDesdeRef = useRef<number>(Date.now());
  const contextoOrdenRef = useRef({ idOperacionActiva, estadoOperativo });
  const jornadaRef = useRef<JornadaActivaApk | null>(null);

  useEffect(() => {
    contextoOrdenRef.current = { idOperacionActiva, estadoOperativo };
  }, [idOperacionActiva, estadoOperativo]);

  useEffect(() => {
    jornadaRef.current = jornada;
  }, [jornada]);

  // Etiqueta: Reenvio en bloque de ubicaciones almacenadas sin señal
  const vaciarColaGps = useCallback(async () => {
    const pendientes = leerPingsOffline();
    if (pendientes.length === 0) return;
    try {
      await enviarLoteUbicacionesApi(idUser, pendientes);
      vaciarPingsOffline();
    } catch {
      // Mantiene buffer hasta recuperar señal
    }
  }, [idUser]);

  // Etiqueta: Ejecucion de un ciclo de extraccion y envio de coordenada
  const ejecutarPingGps = useCallback(async () => {
    const tiempoQuieto = Date.now() - sinMovimientoDesdeRef.current;
    const modoAhorro = tiempoQuieto >= UMBRAL_TIEMPO_QUIETUD_MS;

    try {
      const nueva = await capturarCoordenadaGps(!modoAhorro, 8000);

      if (
        ultimaCoordRef.current &&
        nueva.precision_m !== null &&
        nueva.precision_m > MAX_PRECISION_ACEPTABLE_M
      ) {
        return;
      }

      if (ultimaCoordRef.current) {
        const dist = calcularDistanciaMetros(
          ultimaCoordRef.current.lat,
          ultimaCoordRef.current.lng,
          nueva.lat,
          nueva.lng
        );
        if (dist >= RADIO_QUIETUD_M) {
          sinMovimientoDesdeRef.current = Date.now();
        }
      } else {
        sinMovimientoDesdeRef.current = Date.now();
      }

      ultimaCoordRef.current = nueva;
      setUltimaCoord(nueva);
      setEstadoGps('ACTIVO');

      const bateria = await obtenerNivelBateria();
      const ping = {
        ...nueva,
        id_user: idUser,
        id_jornada: jornadaRef.current?.id_jornada,
        bateria,
        id_operacion_activa: contextoOrdenRef.current.idOperacionActiva,
        estado_operativo: contextoOrdenRef.current.estadoOperativo,
      };

      try {
        await enviarPingUbicacionApi(ping);
        await vaciarColaGps();
      } catch {
        guardarPingOffline(ping);
      }
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === 1) {
        setEstadoGps('SIN_PERMISO');
      } else if (!ultimaCoordRef.current) {
        setEstadoGps('ERROR');
      }
    }
  }, [idUser, vaciarColaGps]);

  // Etiqueta: Recupera estado de jornada al iniciar la app
  useEffect(() => {
    let cancelado = false;
    consultarJornadaActiva(idUser)
      .then((res) => {
        if (cancelado) return;
        setEnJornada(res.en_jornada);
        setJornada(res.jornada);
        setEstadoGps(res.en_jornada ? 'BUSCANDO' : 'APAGADO');
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [idUser]);

  // Etiqueta: Bucle adaptativo 15s (en movimiento) / 30s (quieto >2min) mientras dure la jornada
  useEffect(() => {
    if (!enJornada) {
      setEstadoGps('APAGADO');
      return;
    }

    let activo = true;
    let timerId: number | null = null;

    const programarSiguiente = () => {
      if (!activo) return;
      const quieto = Date.now() - sinMovimientoDesdeRef.current >= UMBRAL_TIEMPO_QUIETUD_MS;
      const espera = quieto ? INTERVALO_QUIETO_MS : INTERVALO_MOVIMIENTO_MS;
      timerId = window.setTimeout(async () => {
        await ejecutarPingGps();
        programarSiguiente();
      }, espera);
    };

    ejecutarPingGps().then(programarSiguiente);

    const alVolverPantalla = () => {
      if (document.visibilityState === 'visible') {
        ejecutarPingGps();
      }
    };
    const alReconectar = () => {
      vaciarColaGps();
      ejecutarPingGps();
    };

    document.addEventListener('visibilitychange', alVolverPantalla);
    window.addEventListener('online', alReconectar);

    return () => {
      activo = false;
      if (timerId !== null) window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', alVolverPantalla);
      window.removeEventListener('online', alReconectar);
    };
  }, [enJornada, ejecutarPingGps, vaciarColaGps]);

  // Etiqueta: Encender jornada (pide GPS inicial y registra inicio en BD)
  const iniciarJornada = useCallback(async () => {
    setCambiandoJornada(true);
    setEstadoGps('BUSCANDO');
    try {
      let coord: CoordenadaGps | null = null;
      try {
        coord = await capturarCoordenadaGps(true, 6000);
        ultimaCoordRef.current = coord;
        setUltimaCoord(coord);
        sinMovimientoDesdeRef.current = Date.now();
      } catch (err) {
        const geoErr = err as GeolocationPositionError;
        if (geoErr?.code === 1) setEstadoGps('SIN_PERMISO');
      }

      const bateria = await obtenerNivelBateria();
      const res = await iniciarJornadaApi({
        id_user: idUser,
        lat: coord?.lat ?? null,
        lng: coord?.lng ?? null,
        precision_m: coord?.precision_m ?? null,
        bateria,
      });

      setJornada(res.jornada);
      setEnJornada(true);
      if (coord) setEstadoGps('ACTIVO');
    } catch (err) {
      setEstadoGps('APAGADO');
      alert((err as Error).message || 'No se pudo iniciar la jornada');
    } finally {
      setCambiandoJornada(false);
    }
  }, [idUser]);

  // Etiqueta: Apagar jornada manualmente o al cerrar sesion
  const finalizarJornada = useCallback(
    async (motivo: 'MANUAL' | 'LOGOUT' = 'MANUAL') => {
      if (!enJornada) return;
      setCambiandoJornada(true);
      try {
        let coord = ultimaCoordRef.current;
        try {
          coord = await capturarCoordenadaGps(false, 2500);
        } catch {
          // Usa la ultima coordenada conocida si no responde en 2.5s
        }

        await finalizarJornadaApi({
          id_user: idUser,
          lat: coord?.lat ?? null,
          lng: coord?.lng ?? null,
          motivo_cierre: motivo,
        });

        setEnJornada(false);
        setJornada(null);
        setEstadoGps('APAGADO');
      } catch (err) {
        if (motivo === 'MANUAL') {
          alert((err as Error).message || 'No se pudo finalizar la jornada');
        }
      } finally {
        setCambiandoJornada(false);
      }
    },
    [enJornada, idUser]
  );

  return {
    enJornada,
    jornada,
    cambiandoJornada,
    estadoGps,
    ultimaCoord,
    iniciarJornada,
    finalizarJornada,
  };
};