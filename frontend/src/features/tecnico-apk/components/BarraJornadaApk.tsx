// Etiqueta: Control compacto de inicio y fin de jornada con estado GPS en la APK
import React from 'react';
import { Loader2, LocateFixed, LocateOff } from 'lucide-react';
import type { EstadoGpsApk, JornadaActivaApk } from '../types/rastreo.types';

interface Props {
  enJornada: boolean;
  jornada: JornadaActivaApk | null;
  cambiando: boolean;
  estadoGps: EstadoGpsApk;
  onToggle: () => void;
}

const formatearHoraInicio = (iso?: string | null): string => {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export const BarraJornadaApk: React.FC<Props> = ({
  enJornada,
  jornada,
  cambiando,
  estadoGps,
  onToggle,
}) => {
  const horaInicio = formatearHoraInicio(jornada?.inicio_at);
  const sinPermiso = estadoGps === 'SIN_PERMISO';

  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xs transition ${
        enJornada ? 'bg-white border-emerald-200' : 'bg-white border-neutral-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            sinPermiso
              ? 'bg-pf-red/10 text-pf-red'
              : enJornada
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-neutral-100 text-pf-gray'
          }`}
        >
          {sinPermiso ? <LocateOff className="w-4 h-4" /> : <LocateFixed className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-900">
              {enJornada ? 'En jornada' : 'Fuera de servicio'}
            </span>
            {enJornada && horaInicio && (
              <span className="text-[10px] font-semibold text-pf-gray tabular-nums">
                · {horaInicio}
              </span>
            )}
          </div>
          {sinPermiso && (
            <div className="text-[10px] font-bold text-pf-red truncate">
              Activa el permiso de GPS
            </div>
          )}
        </div>
      </div>

      {/* Etiqueta: Switch tactil tipo Uber/inDrive */}
      <button
        type="button"
        role="switch"
        aria-checked={enJornada}
        disabled={cambiando}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
          enJornada ? 'bg-emerald-500' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-xs transition-transform ${
            enJornada ? 'translate-x-6' : 'translate-x-1'
          }`}
        >
          {cambiando && <Loader2 className="w-3 h-3 animate-spin text-pf-red" />}
        </span>
      </button>
    </div>
  );
};