// Etiqueta: Seccion modular de Estado en Mesa con bloqueo estricto cuando el caso esta cerrado
import React from 'react';
import { Calendar, Clock, Lock } from 'lucide-react';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';

const TRAMOS_REPROGRAMA = [
  '08:00 - 12:00',
  '12:00 - 16:00',
  '16:00 - 20:00',
];

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

  return (
    <section className="bg-white rounded-xl p-4 border border-neutral-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
          Gestión de Estado en Mesa
        </h3>
        {bloqueado ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
            <Lock className="w-3 h-3" /> CERRADO
          </span>
        ) : (
          reglaActual?.es_final === 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pf-red/10 text-pf-red">
              CIERRE DE VISITA
            </span>
          )
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Estado</label>
          <select
            value={estado}
            disabled={bloqueado}
            onChange={(e) => onChangeEstado(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-neutral-100 disabled:text-neutral-600 font-semibold text-neutral-900 focus:outline-none focus:border-pf-red"
          >
            {estadosPadre.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">SubEstado</label>
          <select
            value={subEstado}
            disabled={bloqueado}
            onChange={(e) => onChangeSubEstado(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-neutral-100 disabled:text-neutral-600 text-neutral-800 focus:outline-none focus:border-pf-red"
          >
            <option value="">Seleccionar SubEstado...</option>
            {subEstado &&
              !subEstadosDisponibles.some((s) => s.subestado === subEstado) && (
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
          <div className="col-span-2 grid grid-cols-2 gap-3 bg-pf-yellow/10 p-3 rounded-lg border border-pf-yellow/40">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pf-red" /> Próxima Fecha *
              </label>
              <input
                type="date"
                required={esReprograma}
                value={proximaFecha}
                onChange={(e) => onChangeProximaFecha(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-pf-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-pf-red" /> Próximo Tramo *
              </label>
              <select
                value={proximoTramo}
                onChange={(e) => onChangeProximoTramo(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-pf-red"
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
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Nota / Sustento de Mesa {exigeNota ? '*' : ''}
          </label>
          <textarea
            rows={2}
            disabled={bloqueado}
            required={exigeNota}
            placeholder={bloqueado ? '-' : 'Detalle del cierre o gestión en mesa...'}
            value={motivoMesa}
            onChange={(e) => onChangeMotivo(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm disabled:bg-neutral-100 disabled:text-neutral-600 focus:outline-none focus:border-pf-red"
          />
        </div>
      </div>
    </section>
  );
};