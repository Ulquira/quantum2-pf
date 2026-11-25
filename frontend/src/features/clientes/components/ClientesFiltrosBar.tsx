// Etiqueta: Barra minimalista de filtros con rango de fechas (Desde - Hasta) y estado de validacion
import React from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroDistrito: string;
  onDistritoChange: (val: string) => void;
  distritos: string[];
  filtroValidacion: string;
  onValidacionChange: (val: string) => void;
  estadosValidacion: string[];
  filtroEstado: string;
  onEstadoChange: (val: string) => void;
  fechaDesde: string;
  onFechaDesdeChange: (val: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (val: string) => void;
  onLimpiar: () => void;
}

export const ClientesFiltrosBar: React.FC<Props> = ({
  busqueda,
  onBusquedaChange,
  filtroDistrito,
  onDistritoChange,
  distritos,
  filtroValidacion,
  onValidacionChange,
  estadosValidacion,
  filtroEstado,
  onEstadoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  onLimpiar,
}) => {
  const hayFiltros =
    busqueda !== '' ||
    filtroDistrito !== 'TODOS' ||
    filtroValidacion !== 'TODOS' ||
    filtroEstado !== 'TODOS' ||
    fechaDesde !== '' ||
    fechaHasta !== '';

  return (
    <div className="pf-card p-3 flex flex-wrap items-center gap-2.5">
      {/* Buscador rapido */}
      <div className="relative flex-1 min-w-[230px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar DNI, pedido, cliente o comentario..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="pf-input w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Selector de Distrito */}
      <select
        value={filtroDistrito}
        onChange={(e) => onDistritoChange(e.target.value)}
        className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
      >
        <option value="TODOS">Distrito: Todos</option>
        {distritos.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Selector de Estado de Validacion */}
      <select
        value={filtroValidacion}
        onChange={(e) => onValidacionChange(e.target.value)}
        className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
      >
        <option value="TODOS">Validación: Todas</option>
        {estadosValidacion.map((ev) => (
          <option key={ev} value={ev}>
            {ev}
          </option>
        ))}
      </select>

      {/* Selector de Programacion */}
      <select
        value={filtroEstado}
        onChange={(e) => onEstadoChange(e.target.value)}
        className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
      >
        <option value="TODOS">Despacho: Todos</option>
        <option value="SIN_PROGRAMAR">Pendientes</option>
        <option value="PROGRAMADO">Programados</option>
      </select>

      {/* Rango de fechas Desde - Hasta */}
      <div className="flex items-center gap-1.5 border border-slate-200 rounded-[10px] px-2.5 py-1.5 bg-slate-50/70">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desde</span>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => onFechaDesdeChange(e.target.value)}
          className="text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
        />
        <span className="text-slate-300">|</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</span>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => onFechaHastaChange(e.target.value)}
          className="text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
        />
      </div>

      {hayFiltros && (
        <button
          onClick={onLimpiar}
          className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-pf-red hover:bg-pf-red/8 rounded-lg transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
};