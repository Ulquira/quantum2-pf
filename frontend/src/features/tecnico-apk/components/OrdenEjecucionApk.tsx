// Etiqueta: Controlador de Orden en APK separado en 2 vistas (RESUMEN vs WIZARD FASES) con Autoguardado
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  AlertTriangle,
  Clock,
  KeyRound,
  ListChecks,
  ChevronRight,
} from 'lucide-react';
import type { OrdenOperacion } from '../../operaciones/types/operacion.types';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';
import type { EvidenciaItem, SeccionApkId, TipoAtencionTitular } from '../types/apk.types';
import {
  esOrdenCerrada,
  obtenerCandidatasOrden,
  obtenerDatosCto,
  obtenerDatosEquipos,
  obtenerTokensOrden,
} from '../../operaciones/utils/operacionJson';
import { construirFasesOrdenApk } from '../utils/fasesApk';
import { MapaOrdenCtosApk } from './MapaOrdenCtosApk';
import { StepperEstadoApk } from './StepperEstadoApk';
import { FaseWizardViewApk } from './FaseWizardViewApk';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CerrarOrdenApkModal } from './CerrarOrdenApkModal';
import { apiClient } from '../../../lib/apiClient';
import {
  enqueuePatchCampos,
  enqueueUploadFoto,
  flushOfflineQueue,
  getPendingItems,
  isNetworkError,
  pendingPhotosToEvidencias,
} from '../services/offlineQueue';

interface Props {
  orden: OrdenOperacion;
  idTecnico: string;
  catalogoApk: CatalogoEstado[];
  onVolver: () => void;
  onOrdenActualizada: () => void;
}

export const OrdenEjecucionApk: React.FC<Props> = ({
  orden,
  idTecnico,
  catalogoApk,
  onVolver,
  onOrdenActualizada,
}) => {
  const ctoInicial = obtenerDatosCto(orden);
  const eqInicial = obtenerDatosEquipos(orden) as Record<string, string | null | undefined>;
  const tokens = obtenerTokensOrden(orden);
  const candidatas = obtenerCandidatasOrden(orden).filter((c) => c.cto);
  const bloqueado = esOrdenCerrada(orden, catalogoApk);

  const [vistaInterna, setVistaInterna] = useState<'RESUMEN' | 'TAREAS'>('RESUMEN');
  const [indiceFase, setIndiceFase] = useState(0);

  const [estadoLocal, setEstadoLocal] = useState(orden.Estado || 'PROGRAMADO');
  const [cambiandoPaso, setCambiandoPaso] = useState(false);
  const [estadoSync, setEstadoSync] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'OFFLINE_PENDING'>('IDLE');
  const [pendientesOffline, setPendientesOffline] = useState(0);

  const [atTitular, setAtTitular] = useState<TipoAtencionTitular>(
    eqInicial.at_titular === 'ENCARGADO' ? 'ENCARGADO' : 'TITULAR'
  );
  const fases = construirFasesOrdenApk(atTitular, orden.Mesh_modo || eqInicial.mesh_modo);

  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([]);
  const [ctoUso, setCtoUso] = useState(ctoInicial.cto_uso || '');
  const [puerto, setPuerto] = useState(ctoInicial.puerto_utilizado || '');
  const [rxCto, setRxCto] = useState(ctoInicial.rx_cto || '');
  const [rxRoseta, setRxRoseta] = useState(ctoInicial.rx_roseta || '');
  const [snOnt, setSnOnt] = useState(eqInicial.sn_ont || '');
  const [snMesh, setSnMesh] = useState(eqInicial.sn_mesh || '');
  const [metraje, setMetraje] = useState(eqInicial.metraje_cable || '');

  const [scannerTarget, setScannerTarget] = useState<'ONT' | 'MESH' | null>(null);
  const [modoModalCierre, setModoModalCierre] = useState<'FINALIZAR' | 'INCIDENCIA' | null>(null);
  const cargaInicialRef = useRef(true);

  const cargarEvidencias = async () => {
    const pendientes = await getPendingItems(orden.IDoperacion).catch(() => []);
    const fotosOffline = pendingPhotosToEvidencias(pendientes);
    setPendientesOffline(pendientes.length);

    try {
      const { data } = await apiClient.get<EvidenciaItem[]>(
        `/apk/ordenes/${orden.IDoperacion}/evidencias`
      );
      setEvidencias([...data, ...fotosOffline]);
    } catch {
      if (fotosOffline.length > 0) {
        setEvidencias((prev) => {
          const soloRemotas = prev.filter((ev) => Boolean(ev.id_evidencia));
          return [...soloRemotas, ...fotosOffline];
        });
      }
    }
  };

  const sincronizarColaOffline = async () => {
    const { synced, remaining } = await flushOfflineQueue(orden.IDoperacion);
    setPendientesOffline(remaining);
    if (remaining > 0) {
      setEstadoSync('OFFLINE_PENDING');
    } else if (synced > 0) {
      setEstadoSync('SAVED');
      await cargarEvidencias();
      onOrdenActualizada();
    }
  };

  useEffect(() => {
    cargaInicialRef.current = true;
    setEstadoLocal(orden.Estado || 'PROGRAMADO');
    cargarEvidencias();
    sincronizarColaOffline();

    const handleOnline = () => {
      sincronizarColaOffline();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [orden.IDoperacion]);

  // Autoguardado automatico con debounce de 600ms y cola offline en IndexedDB si se pierde señal
  useEffect(() => {
    if (bloqueado) return;
    if (cargaInicialRef.current) {
      cargaInicialRef.current = false;
      return;
    }

    setEstadoSync('SAVING');
    const payload = {
      at_titular: atTitular,
      cto_uso: ctoUso,
      puerto_utilizado: puerto,
      rx_cto: rxCto,
      rx_roseta: rxRoseta,
      sn_ont: snOnt,
      sn_mesh: snMesh,
      metraje_cable: metraje,
    };

    const timer = window.setTimeout(async () => {
      try {
        await apiClient.patch(`/apk/ordenes/${orden.IDoperacion}/gestionar`, payload);
        setEstadoSync(pendientesOffline > 0 ? 'OFFLINE_PENDING' : 'SAVED');
        onOrdenActualizada();
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueuePatchCampos(orden.IDoperacion, payload);
          const pending = await getPendingItems(orden.IDoperacion);
          setPendientesOffline(pending.length);
          setEstadoSync('OFFLINE_PENDING');
        } else {
          setEstadoSync('IDLE');
        }
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [atTitular, ctoUso, puerto, rxCto, rxRoseta, snOnt, snMesh, metraje]);

  const avanzarEstadoProgresivo = async (nuevoEstado: 'EN CAMINO' | 'EN PROCESO') => {
    setCambiandoPaso(true);
    const sub =
      nuevoEstado === 'EN CAMINO'
        ? 'TÉCNICO EN RUTA AL PREDIO'
        : 'INSTALACIÓN EN EJECUCIÓN';
    try {
      await apiClient.patch(`/apk/ordenes/${orden.IDoperacion}/gestionar`, {
        Estado: nuevoEstado,
        SubEstado: sub,
      });
      setEstadoLocal(nuevoEstado);
      onOrdenActualizada();
      if (nuevoEstado === 'EN PROCESO') {
        abrirWizardEnPrimeraPendiente();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCambiandoPaso(false);
    }
  };

  const subirFoto = async (seccion: SeccionApkId, tipoFoto: string, dataUrl: string) => {
    setEstadoSync('SAVING');
    try {
      await apiClient.post(`/apk/ordenes/${orden.IDoperacion}/evidencia`, {
        seccion,
        tipo_foto: tipoFoto,
        data_url: dataUrl,
        id_tecnico: idTecnico,
      });
      await cargarEvidencias();
      setEstadoSync(pendientesOffline > 0 ? 'OFFLINE_PENDING' : 'SAVED');
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueUploadFoto(orden.IDoperacion, seccion, tipoFoto, dataUrl, idTecnico);
        await cargarEvidencias();
        setEstadoSync('OFFLINE_PENDING');
        return;
      }
      throw err;
    }
  };

  const eliminarFoto = async (idEvidencia: number) => {
    setEstadoSync('SAVING');
    await apiClient.delete(`/apk/evidencias/${idEvidencia}`);
    await cargarEvidencias();
    setEstadoSync('SAVED');
  };

  const confirmarCierreOrden = async (cierre: {
    Estado: string;
    SubEstado: string;
    Motivo: string;
    token_ingresado?: string;
  }) => {
    try {
      await apiClient.patch(`/apk/ordenes/${orden.IDoperacion}/gestionar`, {
        ...cierre,
        at_titular: atTitular,
        cto_uso: ctoUso,
        puerto_utilizado: puerto,
        rx_cto: rxCto,
        rx_roseta: rxRoseta,
        sn_ont: snOnt,
        sn_mesh: snMesh,
        metraje_cable: metraje,
      });
      setModoModalCierre(null);
      onOrdenActualizada();
      onVolver();
    } catch (err) {
      alert((err as Error).message || 'No se pudo cerrar la orden');
    }
  };

  const totalRequeridas = fases.reduce((acc, f) => acc + f.tareasFoto.length, 0);
  const totalCargadas = fases.reduce(
    (acc, f) =>
      acc +
      f.tareasFoto.filter((t) =>
        evidencias.some((ev) => ev.seccion === f.id && ev.tipo_foto === t)
      ).length,
    0
  );

  const abrirWizardEnPrimeraPendiente = () => {
    const idxPendiente = fases.findIndex((f) =>
      f.tareasFoto.some(
        (t) => !evidencias.some((ev) => ev.seccion === f.id && ev.tipo_foto === t)
      )
    );
    setIndiceFase(idxPendiente >= 0 ? idxPendiente : 0);
    setVistaInterna('TAREAS');
  };

  const enProcesoOCerrada = estadoLocal.toUpperCase() === 'EN PROCESO' || bloqueado;

  return (
    <>
      {vistaInterna === 'TAREAS' ? (
        <FaseWizardViewApk
          fases={fases}
          indiceFase={indiceFase}
          evidencias={evidencias}
          bloqueado={bloqueado}
          estadoSync={estadoSync}
          pendientesOffline={pendientesOffline}
          onReintentarSync={sincronizarColaOffline}
          atTitular={atTitular}
          candidatas={candidatas}
          ctoUso={ctoUso}
          puerto={puerto}
          rxCto={rxCto}
          rxRoseta={rxRoseta}
          metraje={metraje}
          snOnt={snOnt}
          snMesh={snMesh}
          onCambiarIndice={setIndiceFase}
          onVolverResumen={() => setVistaInterna('RESUMEN')}
          onAbrirFinalizar={() => setModoModalCierre('FINALIZAR')}
          onAbrirScanner={(target) => setScannerTarget(target)}
          onSubirFoto={subirFoto}
          onEliminarFoto={eliminarFoto}
          onChangeAtTitular={setAtTitular}
          onChangeCtoUso={setCtoUso}
          onChangePuerto={setPuerto}
          onChangeRxCto={setRxCto}
          onChangeRxRoseta={setRxRoseta}
          onChangeMetraje={setMetraje}
          onChangeSnOnt={setSnOnt}
          onChangeSnMesh={setSnMesh}
        />
      ) : (
        <div className="pb-24 space-y-3">
          {/* Vista 1: Ficha limpia de la orden */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <button
                onClick={onVolver}
                className="inline-flex items-center gap-1 text-xs font-bold text-pf-red cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Órdenes
              </button>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pf-red/10 text-pf-red">
                {estadoLocal}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-neutral-900">
                  #{orden.valida_cod_pedido}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-pf-yellow/25 text-neutral-900">
                  {orden.Mesh_modo || 'SIN MESH'}
                </span>
              </div>
              <div className="font-bold text-sm text-neutral-800 mt-0.5">{orden.nom_cliente}</div>
              <div className="text-xs text-pf-gray">
                DNI: <b className="text-neutral-800">{orden.dni_cliente || '-'}</b> •{' '}
                {orden.Paquete || orden.Campaña || '-'}
              </div>
            </div>

            <div className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 space-y-1">
              <div className="font-bold text-neutral-900">{orden.Distrito}</div>
              <div>{orden.direccion_cliente}</div>
              {orden.Observaciones && (
                <div className="pt-1 border-t border-neutral-200 text-pf-red font-semibold">
                  Nota: {orden.Observaciones}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {orden.telefono && (
                <a
                  href={`tel:${orden.telefono}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 font-bold text-neutral-900"
                >
                  <Phone className="w-3.5 h-3.5 text-pf-red" /> {orden.telefono}
                </a>
              )}
              {orden.telefono_alternativo && (
                <a
                  href={`tel:${orden.telefono_alternativo}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 font-bold text-neutral-900"
                >
                  <Phone className="w-3.5 h-3.5 text-pf-gray" /> {orden.telefono_alternativo}
                </a>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 font-semibold text-neutral-700">
                <Clock className="w-3.5 h-3.5 text-pf-red" /> {orden.Tramo_Atencio || '-'}
              </span>
              {tokens.token_inicio && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 font-bold text-neutral-800">
                  <KeyRound className="w-3.5 h-3.5 text-pf-red" /> Inicio: {tokens.token_inicio}
                </span>
              )}
            </div>
          </div>

          {/* Mapa Google Maps con Cliente + Pines CTOs */}
          <MapaOrdenCtosApk
            coordenadasCliente={orden.coordenadas_direccion}
            nombreCliente={orden.nom_cliente}
            ctos={candidatas}
          />

          {/* Stepper PROGRAMADO -> EN CAMINO -> EN PROCESO */}
          <StepperEstadoApk
            estadoActual={estadoLocal}
            bloqueado={bloqueado}
            cambiando={cambiandoPaso}
            onCambiarEstado={avanzarEstadoProgresivo}
          />

          {/* Tarjeta de acceso al Wizard Secuencial cuando ya esta EN PROCESO */}
          {enProcesoOCerrada && (
            <button
              type="button"
              onClick={abrirWizardEnPrimeraPendiente}
              className="w-full bg-white p-4 rounded-2xl border-2 border-pf-red/25 hover:border-pf-red flex items-center justify-between shadow-xs transition cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-pf-red/10 text-pf-red flex items-center justify-center shrink-0">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900">
                    {bloqueado ? 'Ver Evidencias por Fase' : 'Continuar Fases de Instalación'}
                  </div>
                  <div className="text-xs text-pf-gray font-semibold">
                    {totalCargadas} de {totalRequeridas} evidencias completadas
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-pf-red shrink-0" />
            </button>
          )}

          {/* Barra inferior en vista Resumen */}
          {!bloqueado && (
            <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xs border-t border-neutral-200 p-3 flex items-center gap-2 max-w-lg mx-auto z-30">
              <button
                type="button"
                onClick={() => setModoModalCierre('INCIDENCIA')}
                className="flex-1 py-2.5 rounded-xl border border-pf-red/30 text-pf-red font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" /> Reportar Incidencia / Ausente
              </button>

              {enProcesoOCerrada && (
                <button
                  type="button"
                  onClick={abrirWizardEnPrimeraPendiente}
                  className="flex-1 bg-pf-red text-white font-bold text-xs py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ListChecks className="w-4 h-4" /> Ir a Tareas
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <BarcodeScannerModal
        abierto={scannerTarget !== null}
        titulo={scannerTarget === 'MESH' ? 'Escanear Serial Mesh' : 'Escanear Serial ONT'}
        valorInicial={scannerTarget === 'MESH' ? snMesh : snOnt}
        onScan={(codigo) => {
          if (scannerTarget === 'MESH') setSnMesh(codigo);
          else setSnOnt(codigo);
        }}
        onClose={() => setScannerTarget(null)}
      />

      {modoModalCierre && (
        <CerrarOrdenApkModal
          abierto={true}
          modoInicial={modoModalCierre}
          catalogoApk={catalogoApk}
          fotosPendientes={totalRequeridas - totalCargadas}
          onClose={() => setModoModalCierre(null)}
          onSubirEvidenciaIncidencia={subirFoto}
          onConfirmar={confirmarCierreOrden}
        />
      )}
    </>
  );
};