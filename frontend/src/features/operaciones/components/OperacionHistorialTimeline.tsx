// Etiqueta: Linea de tiempo minimalista y compacta de movimientos por orden
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, History, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

export interface OperacionLogItem {
  id_log: number;
  IDoperacion: string;
  valida_cod_pedido: string | null;
  Conteo_Operaciones?: number | null;
  origen: 'WEB' | 'APK' | 'SISTEMA';
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  subestado_nuevo: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  detalle: string | null;
  cambios_json: Record<string, unknown> | string | null;
  fecha_evento: string;
}

interface Props {
  idOperacion: string;
}

const ETIQUETA_ACCION: Record<string, string> = {
  PROGRAMACION: 'Programación',
  ASIGNACION: 'Despacho',
  CAMBIO_ESTADO: 'Estado',
  REPROGRAMACION: 'Reprogramación',
  INICIO_ATENCION: 'Inicio en campo',
  DATOS_TECNICOS: 'Datos técnicos',
  CIERRE_ORDEN: 'Cierre',
};

const colorPunto = (accion: string): string => {
  if (accion === 'CIERRE_ORDEN') return 'bg-emerald-500';
  if (accion === 'PROGRAMACION' || accion === 'REPROGRAMACION' || accion === 'INICIO_ATENCION') {
    return 'bg-pf-yellow';
  }
  if (accion === 'DATOS_TECNICOS') return 'bg-slate-400';
  return 'bg-pf-red';
};

const parsearCambios = (raw: OperacionLogItem['cambios_json']): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
};

const formatearFechaCorta = (valor: string): string => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  const diaMes = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
  const hora = fecha.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${diaMes} · ${hora}`;
};

export const OperacionHistorialTimeline: React.FC<Props> = ({ idOperacion }) => {
  const [alcance, setAlcance] = useState<'pedido' | 'visita'>('pedido');
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | 'WEB' | 'APK'>('TODOS');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['operacion-logs', idOperacion, alcance],
    queryFn: async () => {
      const { data } = await apiClient.get<OperacionLogItem[]>(
        `/operaciones/${encodeURIComponent(idOperacion)}/logs`,
        { params: { alcance } }
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(idOperacion),
  });

  const filtrados = useMemo(
    () =>
      logs
        .filter((l) => l.accion !== 'EVIDENCIA_SUBIDA' && l.accion !== 'EVIDENCIA_ELIMINADA')
        .filter((l) =>
          filtroOrigen === 'TODOS'
            ? true
            : filtroOrigen === 'WEB'
            ? l.origen !== 'APK'
            : l.origen === 'APK'
        ),
    [logs, filtroOrigen]
  );

  if (isLoading) {
    return (
      <div className="max-w-lg bg-white rounded-2xl p-8 border border-slate-200/80 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-pf-red" />
      </div>
    );
  }

  return (
    <section className="max-w-lg space-y-3">
      {/* Etiqueta: Controles compactos de alcance y origen */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-200/80 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setAlcance('pedido')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              alcance === 'pedido' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pedido
          </button>
          <button
            type="button"
            onClick={() => setAlcance('visita')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              alcance === 'visita' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Visita
          </button>
        </div>

        <div className="inline-flex items-center gap-1">
          {(['TODOS', 'WEB', 'APK'] as const).map((orig) => (
            <button
              key={orig}
              type="button"
              onClick={() => setFiltroOrigen(orig)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                filtroOrigen === orig
                  ? 'bg-pf-red text-white'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              {orig === 'TODOS' ? 'Todos' : orig === 'WEB' ? 'Mesa' : 'APK'}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 text-slate-400">
          <History className="w-5 h-5" />
          <span className="text-xs font-medium">Sin movimientos</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <ol className="relative border-l border-slate-200 ml-1.5 divide-y divide-slate-100">
            {filtrados.map((item) => {
              const cambioEstado =
                Boolean(item.estado_nuevo) && item.estado_anterior !== item.estado_nuevo;
              const cambiosTecnicos =
                item.accion === 'DATOS_TECNICOS'
                  ? Object.entries(parsearCambios(item.cambios_json))
                  : [];

              return (
                <li key={item.id_log} className="pl-4 py-2.5 first:pt-0.5 last:pb-0.5 relative">
                  <span
                    className={`absolute -left-[4.5px] top-3.5 first:top-1.5 w-2 h-2 rounded-full ring-4 ring-white ${colorPunto(
                      item.accion
                    )}`}
                  />

                  {/* Linea 1: Evento o transicion + metadatos cortos + hora */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {cambioEstado ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-800">
                          <span className="text-slate-500">
                            {item.estado_anterior || 'NUEVO'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-pf-red shrink-0" />
                          <span className="text-slate-900">{item.estado_nuevo}</span>
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800">
                          {ETIQUETA_ACCION[item.accion] || item.accion}
                        </span>
                      )}

                      {item.Conteo_Operaciones && (
                        <span className="text-[10px] font-mono font-semibold text-slate-400">
                          V{item.Conteo_Operaciones}
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          item.origen === 'APK'
                            ? 'bg-pf-yellow/20 text-slate-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.origen === 'APK' ? 'APK' : 'MESA'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                      {formatearFechaCorta(item.fecha_evento)}
                    </span>
                  </div>

                  {/* Linea 2: Detalle conciso + autor en una sola linea */}
                  <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="text-slate-600 truncate">
                      {item.detalle || ETIQUETA_ACCION[item.accion] || '-'}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[140px]">
                      {item.usuario_nombre || 'Sistema'}
                    </span>
                  </div>

                  {/* Linea opcional: solo para parametros opticos / equipos modificados */}
                  {cambiosTecnicos.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cambiosTecnicos.map(([k, v]) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/80 text-[10px] font-mono text-slate-600"
                        >
                          <b className="text-slate-800">{k}:</b> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};