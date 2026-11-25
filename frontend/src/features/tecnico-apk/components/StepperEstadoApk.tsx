// Etiqueta: Barra segmentada progresiva de estados del tecnico (PROGRAMADO -> EN CAMINO -> EN PROCESO)
import React from 'react';
import { Truck, Wrench, CheckCircle2 } from 'lucide-react';

interface Props {
  estadoActual: string;
  bloqueado: boolean;
  cambiando: boolean;
  onCambiarEstado: (nuevoEstado: 'EN CAMINO' | 'EN PROCESO') => void;
}

const PASOS = [
  { id: 'PROGRAMADO', label: 'Programado' },
  { id: 'EN CAMINO', label: 'En Camino' },
  { id: 'EN PROCESO', label: 'En Proceso' },
];

export const StepperEstadoApk: React.FC<Props> = ({
  estadoActual,
  bloqueado,
  cambiando,
  onCambiarEstado,
}) => {
  const estNorm = (estadoActual || 'PROGRAMADO').toUpperCase();
  const indiceActual =
    estNorm === 'EN PROCESO' ? 2 : estNorm === 'EN CAMINO' ? 1 : bloqueado ? 3 : 0;

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
      {/* Indicador visual de 3 segmentos */}
      <div className="grid grid-cols-3 gap-1.5">
        {PASOS.map((paso, idx) => {
          const completado = idx <= indiceActual;
          const esActual = idx === indiceActual;
          return (
            <div key={paso.id} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  completado ? 'bg-pf-red' : 'bg-neutral-200'
                }`}
              />
              <div
                className={`text-[11px] font-bold text-center flex items-center justify-center gap-1 ${
                  esActual
                    ? 'text-pf-red'
                    : completado
                    ? 'text-neutral-800'
                    : 'text-pf-gray'
                }`}
              >
                {idx < indiceActual && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{paso.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accion directa del siguiente paso operativo */}
      {!bloqueado && estNorm === 'PROGRAMADO' && (
        <button
          type="button"
          disabled={cambiando}
          onClick={() => onCambiarEstado('EN CAMINO')}
          className="w-full bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Truck className="w-4 h-4" />
          {cambiando ? 'Actualizando...' : 'Iniciar Ruta (Marcar EN CAMINO)'}
        </button>
      )}

      {!bloqueado && estNorm === 'EN CAMINO' && (
        <button
          type="button"
          disabled={cambiando}
          onClick={() => onCambiarEstado('EN PROCESO')}
          className="w-full bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Wrench className="w-4 h-4" />
          {cambiando ? 'Actualizando...' : 'Llegué al Predio (Marcar EN PROCESO)'}
        </button>
      )}
    </div>
  );
};