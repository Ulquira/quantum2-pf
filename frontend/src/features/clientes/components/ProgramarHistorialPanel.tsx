// Etiqueta: Panel amplio de trazabilidad para el programador (altura completa sin cortes)
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, History, Layers, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

interface VisitaPreviaItem {
  IDoperacion: string;
  Conteo_Operaciones: number;
  Estado: string;
  SubEstado: string | null;
  Partner: string | null;
  Cuadrilla: string | null;
  Fecha_Gestion: string | null;
  Tramo_Atencio: string | null;
  Motivo: string | null;
  Observaciones: string | null;
}

interface LogPedidoItem {
  id_log: number;
  Conteo_Operaciones?: number | null;
  origen: 'WEB' | 'APK' | 'SISTEMA';
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario_nombre: string | null;
  detalle: string | null;
  fecha_evento: string;
}

interface HistorialPedidoResponse {
  total_programaciones: number;
  visitas: VisitaPreviaItem[];
  logs: LogPedidoItem[];
}

interface Props {
  codPedido: string;
  onTotalCargado?: (total: number) => void;
  onEstadoCargado?: (estado: string | null) => void;
}

const ETIQUETA_ACCION: Record<string, string> = {
  PROGRAMACION: 'Programación',
  ASIGNACION: 'Despacho',
  CAMBIO_ESTADO: 'Estado',
  REPROGRAMACION: 'Reprogramación',
  INICIO_ATENCION: 'Inicio campo',
  DATOS_TECNICOS: 'Datos técnicos',
  CIERRE_ORDEN: 'Cierre',
};

const formatearFechaCorta = (valor: string): string => {
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return valor;
  return `${f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })} · ${f.toLocaleTimeString(
    'es-PE',
    { hour: '2-digit', minute: '2-digit', hour12: false }
  )}`;
};

export const ProgramarHistorialPanel: React.FC<Props> = ({
  codPedido,
  onTotalCargado,
  onEstadoCargado,
}) => {
  const [vista, setVista] = useState<'LOGS' | 'VISITAS'>('LOGS');

  const { data, isLoading } = useQuery({
    queryKey: ['cliente-historial', codPedido],
    queryFn: async () => {
      const res = await apiClient.get<HistorialPedidoResponse>(
        `/clientes/${encodeURIComponent(codPedido)}/historial`
      );
      return res.data;
    },
    enabled: Boolean(codPedido),
  });

  const visitas = data?.visitas || [];
  const logs = data?.logs || [];
  const total = data?.total_programaciones ?? visitas.length;

  useEffect(() => {
    if (data && onTotalCargado) onTotalCargado(data.total_programaciones);
    if (data && onEstadoCargado) onEstadoCargado(data.visitas[0]?.Estado || null);
    if (data && data.logs.length === 0 && data.visitas.length > 0) {
      setVista('VISITAS');
    }
  }, [data, onTotalCargado, onEstadoCargado]);

  return (
    <div className="flex flex-col h-full min-h-[420px] bg-[#F8F9FA] p-7 gap-4 overflow-hidden">
      {/* Etiqueta: KPIs limpios de recurrencia y estado actual */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Veces programado
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums mt-0.5 block">
            {total} {total === 1 ? 'vez' : 'veces'}
          </span>
        </div>
        <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Último Estado
          </span>
          <span className="text-base font-bold text-slate-900 truncate block mt-1">
            {visitas[0]?.Estado || 'SIN PROGRAMAR'}
          </span>
        </div>
      </div>

      {/* Etiqueta: Conmutador entre Logs y Visitas */}
      <div className="flex items-center justify-between shrink-0">
        <div className="inline-flex bg-white rounded-xl p-1 border border-slate-200/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setVista('LOGS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              vista === 'LOGS' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Logs ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setVista('VISITAS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              vista === 'VISITAS' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Visitas ({visitas.length})
          </button>
        </div>
      </div>

      {/* Etiqueta: Lista scrolleable a altura completa */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="h-full min-h-[260px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-pf-red" />
          </div>
        ) : vista === 'LOGS' ? (
          logs.length === 0 ? (
            <div className="h-full min-h-[260px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-2 text-slate-400">
              <History className="w-6 h-6" />
              <span className="text-sm font-medium">Sin logs previos</span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <ol className="relative border-l border-slate-200 ml-2 divide-y divide-slate-100">
                {logs.map((item) => {
                  const cambioEst =
                    Boolean(item.estado_nuevo) && item.estado_anterior !== item.estado_nuevo;
                  return (
                    <li key={item.id_log} className="pl-4 py-3 first:pt-1 last:pb-1 relative">
                      <span className="absolute -left-[4.5px] top-4 first:top-2 w-2 h-2 rounded-full bg-pf-red ring-4 ring-white" />
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          {cambioEst ? (
                            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900">
                              <span className="text-slate-400">{item.estado_anterior || 'NUEVO'}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-pf-red shrink-0" />
                              <span>{item.estado_nuevo}</span>
                            </span>
                          ) : (
                            <span className="font-bold text-slate-900">
                              {ETIQUETA_ACCION[item.accion] || item.accion}
                            </span>
                          )}
                          {item.Conteo_Operaciones ? (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              V{item.Conteo_Operaciones}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                          {formatearFechaCorta(item.fecha_evento)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-4 text-xs">
                        <span className="text-slate-600 leading-relaxed">
                          {item.detalle || ETIQUETA_ACCION[item.accion] || '-'}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {item.usuario_nombre || 'Sistema'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )
        ) : visitas.length === 0 ? (
          <div className="h-full min-h-[260px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Calendar className="w-6 h-6" />
            <span className="text-sm font-medium">1ra programación del pedido</span>
          </div>
        ) : (
          <div className="space-y-3">
            {visitas.map((v) => (
              <div
                key={v.IDoperacion}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-1.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white">
                      V{v.Conteo_Operaciones}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{v.Estado}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {v.Fecha_Gestion ? v.Fecha_Gestion.slice(0, 10) : '-'}
                    {v.Tramo_Atencio ? ` · ${v.Tramo_Atencio}` : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {v.Cuadrilla || v.Partner || 'Sin cuadrilla'}
                  {v.SubEstado ? ` · ${v.SubEstado}` : ''}
                </div>
                {(v.Motivo || v.Observaciones) && (
                  <div className="text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    {v.Motivo || v.Observaciones}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};