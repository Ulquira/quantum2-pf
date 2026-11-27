// Etiqueta: Tira superior de tarjetas KPI operativas con filtro rapido por estado
import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export interface ResumenOperacionesKpi {
  total: number;
  pendientes: number;
  en_gestion: number;
  finalizadas: number;
  incidencias: number;
}

interface Props {
  resumen: ResumenOperacionesKpi;
  filtroEstado: string;
  onSelectEstado: (estado: string) => void;
}

export const OperacionesKpiBar: React.FC<Props> = ({
  resumen,
  filtroEstado,
  onSelectEstado,
}) => {
  const porcentaje = (valor: number) =>
    resumen.total > 0 ? Math.round((valor / resumen.total) * 100) : 0;

  const tarjetas = [
    {
      id: 'PENDIENTE',
      label: 'Pendientes',
      valor: resumen.pendientes,
      pct: porcentaje(resumen.pendientes),
      icon: Clock,
      iconBg: 'bg-slate-100 text-slate-600',
      ringActivo: 'ring-2 ring-slate-900 border-slate-900',
      barra: 'bg-slate-400',
    },
    {
      id: 'EN PROCESO',
      label: 'En Gestión',
      valor: resumen.en_gestion,
      pct: porcentaje(resumen.en_gestion),
      icon: Activity,
      iconBg: 'bg-pf-yellow/20 text-slate-900',
      ringActivo: 'ring-2 ring-pf-yellow border-pf-yellow',
      barra: 'bg-pf-yellow',
    },
    {
      id: 'FINALIZADO',
      label: 'Finalizadas',
      valor: resumen.finalizadas,
      pct: porcentaje(resumen.finalizadas),
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      ringActivo: 'ring-2 ring-emerald-500 border-emerald-500',
      barra: 'bg-emerald-500',
    },
    {
      id: 'CANCELADO',
      label: 'Incidencias',
      valor: resumen.incidencias,
      pct: porcentaje(resumen.incidencias),
      icon: AlertTriangle,
      iconBg: 'bg-pf-red/10 text-pf-red',
      ringActivo: 'ring-2 ring-pf-red border-pf-red',
      barra: 'bg-pf-red',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tarjetas.map((t) => {
        const Icon = t.icon;
        const activa = filtroEstado === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectEstado(activa ? 'TODOS' : t.id)}
            className={`pf-card p-4 text-left transition-all cursor-pointer hover:shadow-md ${
              activa ? t.ringActivo : 'hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.label}
              </span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${t.iconBg}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                {t.valor}
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-400 tabular-nums">
                {t.pct}%
              </span>
            </div>

            <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${t.barra}`}
                style={{ width: `${t.pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};