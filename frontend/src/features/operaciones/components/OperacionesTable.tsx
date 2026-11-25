// Etiqueta: Tabla principal de Operaciones con datos vitales de despacho y ejecucion
import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import { esOrdenCerrada, obtenerDatosCto, obtenerDatosEquipos } from '../utils/operacionJson';

interface Props {
  ordenes: OrdenOperacion[];
  onSelectOrden: (orden: OrdenOperacion) => void;
}

const badgeEstadoClase = (estado: string) => {
  const est = (estado || '').toUpperCase();
  if (est === 'FINALIZADO') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80';
  if (
    est === 'PROGRAMADO' ||
    est === 'EN CAMINO' ||
    est === 'EN PROCESO' ||
    est === 'REPROGRAMA' ||
    est === 'REGESTION' ||
    est === 'RESCATE' ||
    est === 'AUSENTE'
  ) {
    return 'bg-pf-yellow/20 text-slate-900 ring-1 ring-pf-yellow/40';
  }
  if (
    est === 'CANCELADO' ||
    est === 'SIN FACILIDADES TÉCNICAS' ||
    est === 'INASISTENCIA'
  ) {
    return 'bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20';
  }
  return 'bg-slate-100 text-slate-600';
};

export const OperacionesTable: React.FC<Props> = ({ ordenes, onSelectOrden }) => {
  return (
    <div className="pf-card overflow-x-auto">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400 bg-slate-50/80">
            <th className="py-3.5 px-4">Pedido / Visita</th>
            <th className="py-3.5 px-4">Fecha / Tramo</th>
            <th className="py-3.5 px-4">Cliente / DNI</th>
            <th className="py-3.5 px-4">Distrito</th>
            <th className="py-3.5 px-4">Plan / Mesh</th>
            <th className="py-3.5 px-4">Cuadrilla / Técnico</th>
            <th className="py-3.5 px-4">CTO</th>
            <th className="py-3.5 px-4">Estado</th>
            <th className="py-3.5 px-4 text-right">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ordenes.length === 0 && (
            <tr>
              <td colSpan={9} className="py-14 text-center text-xs font-medium text-slate-400">
                No se encontraron órdenes con los filtros seleccionados.
              </td>
            </tr>
          )}
          {ordenes.map((o) => {
            const cto = obtenerDatosCto(o);
            const eq = obtenerDatosEquipos(o);
            const fechaGest = o.Fecha_Gestion ? o.Fecha_Gestion.slice(0, 10) : '-';
            const mesh = o.Mesh_modo || eq.mesh_modo || 'SIN MESH';

            return (
              <tr
                key={o.IDoperacion}
                onClick={() => onSelectOrden(o)}
                className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {o.valida_cod_pedido}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      V{o.Conteo_Operaciones}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{o.IDoperacion}</div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                  <div className="font-mono font-semibold text-slate-800 text-xs">{fechaGest}</div>
                  <div className="text-[11px] text-slate-400">{o.Tramo_Atencio || '-'}</div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{o.nom_cliente || '-'}</div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    {o.dni_cliente || '-'}
                    {o.telefono ? ` · ${o.telefono}` : ''}
                  </div>
                </td>

                <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs whitespace-nowrap">
                  {o.Distrito || '-'}
                </td>

                <td className="py-3.5 px-4">
                  <div className="text-xs font-medium text-slate-700 truncate max-w-[165px]">
                    {o.Paquete || o.Campaña || '-'}
                  </div>
                  <span
                    className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      mesh === 'MESH CABLEADO'
                        ? 'bg-pf-yellow/20 text-slate-900'
                        : mesh === 'MESH'
                        ? 'bg-pf-red/10 text-pf-red'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {mesh}
                  </span>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-semibold text-slate-800 text-xs">
                    {o.Cuadrilla || 'SIN CUADRILLA'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {o.nombre_tecnico?.trim() || o.Partner || 'Sin técnico'}
                  </div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono font-semibold text-slate-700">
                  {cto.cto_uso || '—'}
                  {cto.puerto_utilizado ? ` (P${cto.puerto_utilizado})` : ''}
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeEstadoClase(
                      o.Estado
                    )}`}
                  >
                    {esOrdenCerrada(o) && <Lock className="w-3 h-3" />}
                    {o.Estado}
                  </span>
                  {o.SubEstado && (
                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-[190px] truncate" title={o.SubEstado}>
                      {o.SubEstado}
                    </div>
                  )}
                </td>

                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button className="p-1.5 text-slate-400 group-hover:text-pf-red group-hover:translate-x-0.5 transition cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};