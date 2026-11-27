// Etiqueta: Seccion moderna de Estado en Mesa con vista limpia en modo cerrado
import React from 'react';
import { Calendar, Clock, Lock, SlidersHorizontal } from 'lucide-react';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';

const TRAMOS_REPROGRAMA = ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'];

interface Props {
  catalogo: CatalogoEstado[];
  estado: string;
  subEstado: string;
  motivoMesa: string;
  proximaFecha: string;
  proximoTramo: string;
  bloqueado: boolean;
  onChangeEstado: (nuevoEstado: string) => void;
  onChangeSubEstado: (nuevoSubEstado: string) => void;
  onChangeMotivo: (val: string) => void;
  onChangeProximaFecha: (val: string) => void;
  onChangeProximoTramo: (val: string) => void;
}

export const MesaEstadoSection: React.FC<Props> = ({
  catalogo,
  estado,
  subEstado,
  motivoMesa,
  proximaFecha,
  proximoTramo,
  bloqueado,
  onChangeEstado,
  onChangeSubEstado,
  onChangeMotivo,
  onChangeProximaFecha,
  onChangeProximoTramo,
}) => {
  const estadosPadre = Array.from(new Set(catalogo.map((i) => i.estado)));
  if (estado && !estadosPadre.includes(estado)) {
    estadosPadre.unshift(estado);
  }

  const subEstadosDisponibles = catalogo.filter((i) => i.estado === estado);
  const reglaActual = subEstadosDisponibles.find((i) => i.subestado === subEstado);
  const exigeNota = !bloqueado && reglaActual?.requiere_comentario === 1;
  const esReprograma = !bloqueado && estado.toUpperCase() === 'REPROGRAMA';

  if (bloqueado) {
    return (
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-pf-red" />
            Resolución de Visita
          </h3>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            <Lock className="w-3 h-3" /> Cerrado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Estado</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{estado || '-'}</span>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">SubEstado</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{subEstado || '-'}</span>
          </div>
          {motivoMesa && (
            <div className="col-span-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Nota / Sustento
              </span>
              <span className="font-medium text-slate-800 mt-0.5 block">{motivoMesa}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-pf-red" />
          Estado en Mesa
        </h3>
        {reglaActual?.es_final === 1 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pf-red/10 text-pf-red">
            CIERRE DE VISITA
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => onChangeEstado(e.target.value)}
            className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900"
          >
            {estadosPadre.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">SubEstado</label>
          <select
            value={subEstado}
            onChange={(e) => onChangeSubEstado(e.target.value)}
            className="pf-input w-full px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="">Seleccionar SubEstado...</option>
            {subEstado && !subEstadosDisponibles.some((s) => s.subestado === subEstado) && (
              <option value={subEstado}>{subEstado}</option>
            )}
            {subEstadosDisponibles.map((item) => (
              <option key={item.id_catalogo} value={item.subestado}>
                {item.subestado}
              </option>
            ))}
          </select>
        </div>

        {esReprograma && (
          <div className="col-span-2 grid grid-cols-2 gap-3 bg-pf-yellow/10 p-3 rounded-xl border border-pf-yellow/35">
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pf-red" /> Próxima Fecha *
              </label>
              <input
                type="date"
                required
                value={proximaFecha}
                onChange={(e) => onChangeProximaFecha(e.target.value)}
                className="pf-input w-full px-3 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-pf-red" /> Próximo Tramo *
              </label>
              <select
                value={proximoTramo}
                onChange={(e) => onChangeProximoTramo(e.target.value)}
                className="pf-input w-full px-3 py-1.5 text-xs font-semibold"
              >
                {TRAMOS_REPROGRAMA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Nota / Sustento {exigeNota ? '*' : ''}
          </label>
          <textarea
            rows={2}
            required={exigeNota}
            placeholder="Sustento de gestión..."
            value={motivoMesa}
            onChange={(e) => onChangeMotivo(e.target.value)}
            className="pf-input w-full px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>
    </section>
  );
};