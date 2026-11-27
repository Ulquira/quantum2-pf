// Etiqueta: Tabla modular de Clientes con Ultimo Estado Operativo en vivo, SubEstado y Cuadrilla
import React from 'react';
import { CalendarPlus, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import {
  obtenerComercialCliente,
  obtenerModoMeshCliente,
  obtenerResumenCliente,
} from '../utils/clienteJson';

interface Props {
  clientes: ClienteUnico[];
  onSelectDetalle: (cliente: ClienteUnico) => void;
  onProgramar: (cliente: ClienteUnico) => void;
}

const claseBadgeOperacion = (estado: string) => {
  const est = estado.toUpperCase();
  if (est === 'FINALIZADO') {
    return {
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
      dot: 'bg-emerald-500',
    };
  }
  if (est === 'CANCELADO' || est === 'SIN FACILIDADES TÉCNICAS' || est === 'INASISTENCIA') {
    return {
      pill: 'bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20',
      dot: 'bg-pf-red',
    };
  }
  if (
    est === 'PROGRAMADO' ||
    est === 'EN CAMINO' ||
    est === 'EN PROCESO' ||
    est === 'REPROGRAMA' ||
    est === 'REGESTION' ||
    est === 'RESCATE' ||
    est === 'AUSENTE'
  ) {
    return {
      pill: 'bg-pf-yellow/20 text-slate-900 ring-1 ring-pf-yellow/40',
      dot: 'bg-pf-yellow',
    };
  }
  return {
    pill: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80',
    dot: 'bg-slate-400',
  };
};

const limpiarHorario = (tramo?: string | null): string => {
  if (!tramo) return '';
  const t = tramo.trim();
  if (t === '00:00' || t === '00:00:00') return '';
  return t;
};

export const ClientesTable: React.FC<Props> = ({
  clientes,
  onSelectDetalle,
  onProgramar,
}) => {
  return (
    <div className="pf-card overflow-x-auto">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400 bg-slate-50/80">
            <th className="py-3.5 px-4">Pedido</th>
            <th className="py-3.5 px-4">Agenda</th>
            <th className="py-3.5 px-4">Cliente / DNI</th>
            <th className="py-3.5 px-4">Distrito</th>
            <th className="py-3.5 px-4">Plan / Mesh</th>
            <th className="py-3.5 px-4">Validación</th>
            <th className="py-3.5 px-4">Comentario / Validador</th>
            <th className="py-3.5 px-4">Último Estado</th>
            <th className="py-3.5 px-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clientes.length === 0 && (
            <tr>
              <td colSpan={9} className="py-14 text-center text-xs font-medium text-slate-400">
                Sin resultados para los filtros seleccionados.
              </td>
            </tr>
          )}
          {clientes.map((c) => {
            const com = obtenerComercialCliente(c);
            const resumen = obtenerResumenCliente(c);
            const modoMesh = obtenerModoMeshCliente(c);

            const conteoVisitas = Number(c.total_visitas ?? resumen.conteo_operaciones ?? 0);
            const ultimoEstado = (c.ultimo_estado_op || '').trim().toUpperCase();
            const ultimoSubEstado = (c.ultimo_subestado_op || '').trim();
            const esFinalizado = ultimoEstado === 'FINALIZADO';
            const enCampo = ultimoEstado === 'EN CAMINO' || ultimoEstado === 'EN PROCESO';
            const enCurso = ['PENDIENTE', 'PROGRAMADO', 'REGESTION'].includes(ultimoEstado);

            const estadoVal = (com.estado_validacion || '-').toUpperCase();
            const esAprobado = estadoVal.includes('APROBADO');

            const fechaMostrar = (c.ultima_fecha_gestion || c.fecha_programacion || '').slice(0, 10) || '-';
            const tramoMostrar = limpiarHorario(c.ultimo_tramo) || limpiarHorario(c.horario);
            const badgeOp = claseBadgeOperacion(ultimoEstado);

            return (
              <tr
                key={c.valida_cod_pedido}
                onClick={() => onSelectDetalle(c)}
                className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                  {c.valida_cod_pedido}
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                  <div className="font-mono font-semibold text-slate-800 text-xs">{fechaMostrar}</div>
                  {tramoMostrar && (
                    <div className="text-[11px] font-mono text-slate-400">{tramoMostrar}</div>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{c.nom_cliente}</div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    {c.dni_cliente}
                    {c.telefono ? ` · ${c.telefono}` : ''}
                  </div>
                </td>

                <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs whitespace-nowrap">
                  {c.Distrito}
                </td>

                <td className="py-3.5 px-4">
                  <div
                    className="text-xs font-medium text-slate-700 truncate max-w-[175px]"
                    title={c.Paquete || c.Campaña || ''}
                  >
                    {c.Paquete || c.Campaña || '-'}
                  </div>
                  <span
                    className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      modoMesh === 'MESH CABLEADO'
                        ? 'bg-pf-yellow/20 text-slate-900'
                        : modoMesh === 'MESH'
                        ? 'bg-pf-red/10 text-pf-red'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {modoMesh}
                  </span>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      esAprobado
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
                        : estadoVal === '-'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        esAprobado ? 'bg-emerald-500' : estadoVal === '-' ? 'bg-slate-400' : 'bg-pf-red'
                      }`}
                    />
                    {estadoVal}
                  </span>
                </td>

                <td className="py-3.5 px-4 max-w-[215px]">
                  {com.comentario_validador && (
                    <div
                      className="text-xs font-medium text-slate-800 truncate"
                      title={com.comentario_validador}
                    >
                      Val: {com.comentario_validador}
                    </div>
                  )}
                  {com.comentario && (
                    <div className="text-xs text-slate-500 truncate" title={com.comentario}>
                      Com: {com.comentario}
                    </div>
                  )}
                  {!com.comentario_validador && !com.comentario && (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  {ultimoEstado ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeOp.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeOp.dot}`} />
                          {ultimoEstado}
                        </span>
                        {conteoVisitas > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            V{conteoVisitas}
                          </span>
                        )}
                      </div>
                      {(c.ultima_cuadrilla || ultimoSubEstado) && (
                        <div
                          className="text-[11px] text-slate-400 max-w-[195px] truncate"
                          title={
                            [c.ultima_cuadrilla, ultimoSubEstado].filter(Boolean).join(' · ')
                          }
                        >
                          {c.ultima_cuadrilla ? (
                            <span className="font-semibold text-slate-600">
                              {c.ultima_cuadrilla}
                              {ultimoSubEstado ? ' · ' : ''}
                            </span>
                          ) : null}
                          {ultimoSubEstado}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      SIN PROGRAMAR
                    </span>
                  )}
                </td>

                <td
                  className="py-3.5 px-4 text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center gap-1.5">
                    {esFinalizado ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Instalado
                      </span>
                    ) : enCampo ? (
                      <button
                        type="button"
                        onClick={() => onProgramar(c)}
                        title="Ver historial (bloqueado en campo)"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-pf-yellow/20 hover:bg-pf-yellow/30 px-3 py-1.5 rounded-lg border border-pf-yellow/40 transition cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-pf-red" />
                        En campo
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onProgramar(c)}
                        className={`${
                          enCurso ? 'pf-btn-secondary' : 'pf-btn-primary'
                        } inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        {conteoVisitas > 0 ? 'Reprogramar' : 'Programar'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectDetalle(c)}
                      className="p-1.5 text-slate-400 group-hover:text-pf-red group-hover:translate-x-0.5 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};