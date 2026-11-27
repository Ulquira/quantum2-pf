// Etiqueta: Hook automatico de jornada (auto-inicio, corte 20:00 sin ordenes activas y control de gestor)
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
const INTERVALO_VALIDACION_GESTOR_MS = 60_000;
const RADIO_QUIETUD_M = 20;
const UMBRAL_TIEMPO_QUIETUD_MS = 120_000;
const MAX_PRECISION_ACEPTABLE_M = 100;
const HORA_INICIO_JORNADA = 6;
const HORA_CORTE_JORNADA = 20;

interface RespuestaJornadaExtendida {
  en_jornada: boolean;
  jornada: JornadaActivaApk | null;
  apagado_por_gestor?: boolean;
  tiene_ordenes_activas?: boolean;
  puede_iniciar_auto?: boolean;
}

interface Params {
  idUser: string;
  idOperacionActiva: string | null;
  estadoOperativo: string;
  tieneOrdenesActivas?: boolean;
}

const estaEnHorarioLaboral = (): boolean => {
  const hora = new Date().getHours();
  return hora >= HORA_INICIO_JORNADA && hora < HORA_CORTE_JORNADA;
};

export const useMonitoreoJornada = ({
  idUser,
  idOperacionActiva,
  estadoOperativo,
  tieneOrdenesActivas = false,
}: Params) => {
  const [enJornada, setEnJornada] = useState(false);
  const [jornada, setJornada] = useState<JornadaActivaApk | null>(null);
  const [cambiandoJornada, setCambiandoJornada] = useState(false);
  const [estadoGps, setEstadoGps] = useState<EstadoGpsApk>('APAGADO');
  const [ultimaCoord, setUltimaCoord] = useState<CoordenadaGps | null>(null);
  const [apagadoPorGestor, setApagadoPorGestor] = useState(false);

  const ultimaCoordRef = useRef<CoordenadaGps | null>(null);
  const sinMovimientoDesdeRef = useRef<number>(Date.now());
  const contextoOrdenRef = useRef({ idOperacionActiva, estadoOperativo, tieneOrdenesActivas });
  const jornadaRef = useRef<JornadaActivaApk | null>(null);

  useEffect(() => {
    contextoOrdenRef.current = { idOperacionActiva, estadoOperativo, tieneOrdenesActivas };
  }, [idOperacionActiva, estadoOperativo, tieneOrdenesActivas]);

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

  // Etiqueta: Auto-encendido de jornada
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
      const res = (await iniciarJornadaApi({
        id_user: idUser,
        lat: coord?.lat ?? null,
        lng: coord?.lng ?? null,
        precision_m: coord?.precision_m ?? null,
        bateria,
      })) as RespuestaJornadaExtendida;

      if (res.apagado_por_gestor) {
        setApagadoPorGestor(true);
        setEnJornada(false);
        setJornada(null);
        setEstadoGps('APAGADO');
        return;
      }

      setJornada(res.jornada);
      setEnJornada(Boolean(res.en_jornada));
      if (res.en_jornada && coord) setEstadoGps('ACTIVO');
    } catch {
      setEstadoGps('APAGADO');
    } finally {
      setCambiandoJornada(false);
    }
  }, [idUser]);

  // Etiqueta: Apagado por horario 20:00 (sin ordenes) o al cerrar sesion
  const finalizarJornada = useCallback(
    async (motivo: 'MANUAL' | 'LOGOUT' | 'HORARIO_20H' = 'HORARIO_20H') => {
      if (!enJornada) return;
      setCambiandoJornada(true);
      try {
        let coord = ultimaCoordRef.current;
        try {
          coord = await capturarCoordenadaGps(false, 2500);
        } catch {
          // Usa la ultima coordenada conocida
        }

        await finalizarJornadaApi({
          id_user: idUser,
          lat: coord?.lat ?? null,
          lng: coord?.lng ?? null,
          motivo_cierre: motivo === 'MANUAL' ? 'HORARIO_20H' : motivo,
        });

        setEnJornada(false);
        setJornada(null);
        setEstadoGps('APAGADO');
      } catch {
        // Silencioso en cierres automaticos
      } finally {
        setCambiandoJornada(false);
      }
    },
    [enJornada, idUser]
  );

  // Etiqueta: Sincroniza con backend para auto-activar o acatar apagado de gestion interna
  const sincronizarEstadoJornada = useCallback(async () => {
    try {
      const res = (await consultarJornadaActiva(idUser)) as RespuestaJornadaExtendida;
      const bloqueadoGestor = Boolean(res.apagado_por_gestor);
      setApagadoPorGestor(bloqueadoGestor);

      if (bloqueadoGestor) {
        setEnJornada(false);
        setJornada(null);
        setEstadoGps('APAGADO');
        return;
      }

      if (res.en_jornada) {
        setEnJornada(true);
        setJornada(res.jornada);
        setEstadoGps((prev) => (prev === 'APAGADO' ? 'BUSCANDO' : prev));
        return;
      }

      const debeActivar =
        res.puede_iniciar_auto ??
        (estaEnHorarioLaboral() || contextoOrdenRef.current.tieneOrdenesActivas);

      if (debeActivar) {
        await iniciarJornada();
      } else {
        setEnJornada(false);
        setJornada(null);
        setEstadoGps('APAGADO');
      }
    } catch {
      // Mantiene estado actual si no hay red temporalmente
    }
  }, [idUser, iniciarJornada]);

  // Etiqueta: Evaluacion inicial al abrir la APK y al cambiar disponibilidad de ordenes
  useEffect(() => {
    sincronizarEstadoJornada();
  }, [sincronizarEstadoJornada, tieneOrdenesActivas]);

  // Etiqueta: Chequeo periodico cada 60s para acatar apagado del gestor o corte 20:00
  useEffect(() => {
    const idIntervalo = window.setInterval(() => {
      sincronizarEstadoJornada();
    }, INTERVALO_VALIDACION_GESTOR_MS);
    return () => window.clearInterval(idIntervalo);
  }, [sincronizarEstadoJornada]);

  // Etiqueta: Ejecucion de un ciclo de extraccion y envio de coordenada
  const ejecutarPingGps = useCallback(async () => {
    if (!estaEnHorarioLaboral() && !contextoOrdenRef.current.tieneOrdenesActivas) {
      await finalizarJornada('HORARIO_20H');
      return;
    }

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
  }, [finalizarJornada, idUser, vaciarColaGps]);

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
        sincronizarEstadoJornada();
      }
    };
    const alReconectar = () => {
      vaciarColaGps();
      sincronizarEstadoJornada();
    };

    document.addEventListener('visibilitychange', alVolverPantalla);
    window.addEventListener('online', alReconectar);

    return () => {
      activo = false;
      if (timerId !== null) window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', alVolverPantalla);
      window.removeEventListener('online', alReconectar);
    };
  }, [enJornada, ejecutarPingGps, sincronizarEstadoJornada, vaciarColaGps]);

  return {
    enJornada,
    jornada,
    cambiandoJornada,
    estadoGps,
    ultimaCoord,
    apagadoPorGestor,
    iniciarJornada,
    finalizarJornada,
  };
};