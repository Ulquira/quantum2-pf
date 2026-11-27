// Etiqueta: Drawer moderno de Operaciones con cabecera limpia, pestañas y modo lectura elegante
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  ClipboardCheck,
  Cpu,
  History,
  Lock,
  Save,
  Users,
  X,
} from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';
import { MesaEstadoSection } from './MesaEstadoSection';
import { OperacionFichaLectura } from './OperacionFichaLectura';
import { OperacionEvidenciasGallery } from './OperacionEvidenciasGallery';
import { OperacionHistorialTimeline } from './OperacionHistorialTimeline';
import { esOrdenCerrada } from '../utils/operacionJson';
import { apiClient } from '../../../lib/apiClient';

interface CuadrillaCatalogo {
  cuadrilla: string;
  partner: string;
  id_user: string;
  nombre_tecnico: string;
}

interface Props {
  orden: OrdenOperacion | null;
  onClose: () => void;
  onActualizado: () => void;
}

type TabDrawer = 'GESTION' | 'TECNICO' | 'EVIDENCIAS' | 'HISTORIAL';

const claseBadgeEstado = (estado: string) => {
  const est = (estado || '').toUpperCase();
  if (est === 'FINALIZADO') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (est === 'CANCELADO' || est === 'SIN FACILIDADES TÉCNICAS' || est === 'INASISTENCIA') {
    return 'bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20';
  }
  if (est === 'PENDIENTE') return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  return 'bg-pf-yellow/20 text-slate-900 ring-1 ring-pf-yellow/40';
};

export const OperacionDetalleDrawer: React.FC<Props> = ({
  orden,
  onClose,
  onActualizado,
}) => {
  const [tabActiva, setTabActiva] = useState<TabDrawer>('GESTION');
  const [partners, setPartners] = useState<string[]>([]);
  const [cuadrillasCatalogo, setCuadrillasCatalogo] = useState<CuadrillaCatalogo[]>([]);
  const [catalogoEstados, setCatalogoEstados] = useState<CatalogoEstado[]>([]);

  const [partnerSeleccionado, setPartnerSeleccionado] = useState('');
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState('');
  const [estadoMesa, setEstadoMesa] = useState('PENDIENTE');
  const [subEstadoMesa, setSubEstadoMesa] = useState('');
  const [motivoMesa, setMotivoMesa] = useState('');
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximoTramo, setProximoTramo] = useState('08:00 - 12:00');
  const [guardando, setGuardando] = useState(false);

  const { data: evidencias = [] } = useQuery({
    queryKey: ['operacion-evidencias', orden?.IDoperacion || ''],
    queryFn: async () => {
      if (!orden?.IDoperacion) return [];
      const { data } = await apiClient.get<unknown[]>(
        `/apk/ordenes/${encodeURIComponent(orden.IDoperacion)}/evidencias`
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(orden?.IDoperacion),
  });

  useEffect(() => {
    if (!orden) return;

    const estInicial =
      orden.Estado === 'PROGRAMADA' ? 'PENDIENTE' : orden.Estado || 'PENDIENTE';
    const subInicial =
      orden.SubEstado === 'SIN_PARTNER'
        ? 'SIN ASIGNACIÓN DE PARTNER'
        : orden.SubEstado || '';

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    setTabActiva('GESTION');
    setEstadoMesa(estInicial);
    setSubEstadoMesa(subInicial);
    setMotivoMesa(orden.Motivo || '');
    setProximaFecha(manana.toISOString().slice(0, 10));
    setProximoTramo(orden.Tramo_Atencio || '08:00 - 12:00');
    setPartnerSeleccionado(orden.Partner || '');
    setCuadrillaSeleccionada(orden.Cuadrilla || '');

    Promise.all([
      apiClient
        .get<{ partners?: string[]; cuadrillas?: CuadrillaCatalogo[] }>('/usuarios/catalogo')
        .then((r) => r.data)
        .catch(() => ({ partners: [], cuadrillas: [] })),
      apiClient
        .get<CatalogoEstado[]>('/configuracion/estados', { params: { activos: 1 } })
        .then((r) => r.data)
        .catch(() => [] as CatalogoEstado[]),
    ])
      .then(([catUser, catEst]) => {
        setPartners(catUser.partners || []);
        setCuadrillasCatalogo(catUser.cuadrillas || []);
        setCatalogoEstados(Array.isArray(catEst) ? catEst : []);
      })
      .catch(() => {});
  }, [orden]);

  if (!orden) return null;

  const bloqueado = esOrdenCerrada(orden, catalogoEstados);

  const cuadrillasFiltradas = cuadrillasCatalogo.filter(
    (c) => c.partner.toUpperCase() === partnerSeleccionado.toUpperCase()
  );

  const tecnicoDeCuadrilla = cuadrillasFiltradas.find(
    (c) => c.cuadrilla === cuadrillaSeleccionada
  );

  const cambiarPartner = (nuevoPartner: string) => {
    setPartnerSeleccionado(nuevoPartner);
    const primeraCuadrilla = cuadrillasCatalogo.find(
      (c) => c.partner.toUpperCase() === nuevoPartner.toUpperCase()
    );
    const cuad = primeraCuadrilla?.cuadrilla || '';
    setCuadrillaSeleccionada(cuad);

    if (nuevoPartner && cuad && ['PENDIENTE', 'PROGRAMADA'].includes(estadoMesa)) {
      setEstadoMesa('PROGRAMADO');
      setSubEstadoMesa('ASIGNADO A PARTNER');
    }
  };

  const cambiarCuadrilla = (nuevaCuadrilla: string) => {
    setCuadrillaSeleccionada(nuevaCuadrilla);
    if (partnerSeleccionado && nuevaCuadrilla && ['PENDIENTE', 'PROGRAMADA'].includes(estadoMesa)) {
      setEstadoMesa('PROGRAMADO');
      setSubEstadoMesa('ASIGNADO A PARTNER');
    }
  };

  const cambiarEstadoMesa = (nuevoEstado: string) => {
    setEstadoMesa(nuevoEstado);
    const primerSub = catalogoEstados.find((c) => c.estado === nuevoEstado);
    setSubEstadoMesa(primerSub?.subestado || '');
  };

  const guardarGestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;

    const esReprograma = estadoMesa.toUpperCase() === 'REPROGRAMA';
    if (!esReprograma && partnerSeleccionado && !cuadrillaSeleccionada) {
      alert('Selecciona la Cuadrilla correspondiente al Partner elegido.');
      return;
    }
    if (esReprograma && !proximaFecha) {
      alert('Indica la próxima fecha de reprogramación.');
      return;
    }

    setGuardando(true);
    try {
      await apiClient.patch(`/operaciones/${orden.IDoperacion}`, {
        Partner: partnerSeleccionado || null,
        Cuadrilla: cuadrillaSeleccionada || null,
        id_tecnico: tecnicoDeCuadrilla?.id_user || null,
        Estado: estadoMesa,
        SubEstado: subEstadoMesa,
        Motivo: motivoMesa,
        proxima_fecha: esReprograma ? proximaFecha : null,
        proximo_tramo: esReprograma ? proximoTramo : null,
      });
      onActualizado();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <form
        onSubmit={guardarGestion}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#F8F9FA] h-full shadow-2xl border-l border-slate-200/80 flex flex-col overflow-hidden sm:rounded-l-2xl pf-fade-in"
      >
        {/* Etiqueta: Cabecera SaaS blanca con acento rojo PeruFibra */}
        <div className="bg-white border-b border-slate-200/80 shrink-0">
          <div className="h-1 w-full bg-pf-red" />

          <div className="px-6 pt-4 pb-3 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  #{orden.valida_cod_pedido}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  V{orden.Conteo_Operaciones}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${claseBadgeEstado(
                    orden.Estado
                  )}`}
                >
                  {bloqueado && <Lock className="w-3 h-3" />}
                  {orden.Estado}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                <span className="font-semibold text-slate-800 truncate">
                  {orden.nom_cliente || 'Sin titular'}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[11px] text-slate-400 shrink-0">
                  {orden.IDoperacion}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Etiqueta: Navegacion interna por pestañas */}
          <div className="px-6 flex items-center gap-1">
            {(
              [
                { id: 'GESTION', label: 'Gestión', icon: ClipboardCheck },
                { id: 'TECNICO', label: 'Técnico', icon: Cpu },
                { id: 'EVIDENCIAS', label: 'Evidencias', icon: Camera, count: evidencias.length },
                { id: 'HISTORIAL', label: 'Historial', icon: History },
              ] as {
                id: TabDrawer;
                label: string;
                icon: React.FC<{ className?: string }>;
                count?: number;
              }[]
            ).map((tab) => {
              const Icon = tab.icon;
              const activa = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabActiva(tab.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    activa ? 'text-pf-red' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                        activa ? 'bg-pf-red/10 text-pf-red' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {activa && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-pf-red" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Etiqueta: Cuerpo scrolleable por pestaña activa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {tabActiva === 'GESTION' && (
            <>
              <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-pf-red" />
                    Despacho
                  </h3>
                  {orden.F_Asignacion && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Asig: {orden.F_Asignacion.slice(0, 10)}
                    </span>
                  )}
                </div>

                {bloqueado ? (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Partner
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate">
                        {orden.Partner || 'Sin asignar'}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Cuadrilla
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate">
                        {orden.Cuadrilla || 'Sin cuadrilla'}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Técnico
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block truncate">
                        {orden.nombre_tecnico?.trim() || orden.id_tecnico || '-'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Partner
                      </label>
                      <select
                        value={partnerSeleccionado}
                        onChange={(e) => cambiarPartner(e.target.value)}
                        className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900"
                      >
                        <option value="">Sin asignar</option>
                        {partners.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Cuadrilla
                      </label>
                      <select
                        value={cuadrillaSeleccionada}
                        onChange={(e) => cambiarCuadrilla(e.target.value)}
                        disabled={!partnerSeleccionado}
                        className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">Sin cuadrilla</option>
                        {cuadrillaSeleccionada &&
                          !cuadrillasFiltradas.some((c) => c.cuadrilla === cuadrillaSeleccionada) && (
                            <option value={cuadrillaSeleccionada}>{cuadrillaSeleccionada}</option>
                          )}
                        {cuadrillasFiltradas.map((c) => (
                          <option key={`${c.partner}-${c.cuadrilla}`} value={c.cuadrilla}>
                            {c.cuadrilla} — {c.nombre_tecnico}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </section>

              <MesaEstadoSection
                catalogo={catalogoEstados}
                estado={estadoMesa}
                subEstado={subEstadoMesa}
                motivoMesa={motivoMesa}
                proximaFecha={proximaFecha}
                proximoTramo={proximoTramo}
                bloqueado={bloqueado}
                onChangeEstado={cambiarEstadoMesa}
                onChangeSubEstado={setSubEstadoMesa}
                onChangeMotivo={setMotivoMesa}
                onChangeProximaFecha={setProximaFecha}
                onChangeProximoTramo={setProximoTramo}
              />

              <OperacionFichaLectura orden={orden} seccion="AGENDA" />
            </>
          )}

          {tabActiva === 'TECNICO' && <OperacionFichaLectura orden={orden} seccion="TECNICO" />}

          {tabActiva === 'EVIDENCIAS' && (
            <OperacionEvidenciasGallery idOperacion={orden.IDoperacion} />
          )}

          {tabActiva === 'HISTORIAL' && (
            <OperacionHistorialTimeline idOperacion={orden.IDoperacion} />
          )}
        </div>

        {/* Etiqueta: Footer fijo limpio */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {orden.H_Fin ? `Cerrado ${orden.H_Fin.slice(0, 16).replace('T', ' ')}` : orden.Estado}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="pf-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
            {!bloqueado && (
              <button
                type="submit"
                disabled={guardando}
                className="pf-btn-primary inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {guardando ? 'Guardando...' : 'Guardar Gestión'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};