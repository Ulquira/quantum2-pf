// Etiqueta: Barra minimalista de filtros para Operaciones con estados dinamicos y rango Desde - Hasta
import React from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroEstado: string;
  onEstadoChange: (val: string) => void;
  estadosDisponibles: string[];
  filtroDistrito: string;
  onDistritoChange: (val: string) => void;
  distritos: string[];
  filtroCuadrilla: string;
  onCuadrillaChange: (val: string) => void;
  cuadrillas: string[];
  soloUltimaVisita: boolean;
  onSoloUltimaChange: (val: boolean) => void;
  fechaDesde: string;
  onFechaDesdeChange: (val: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (val: string) => void;
  onLimpiar: () => void;
}

export const OperacionesFiltrosBar: React.FC<Props> = ({
  busqueda,
  onBusquedaChange,
  filtroEstado,
  onEstadoChange,
  estadosDisponibles,
  filtroDistrito,
  onDistritoChange,
  distritos,
  filtroCuadrilla,
  onCuadrillaChange,
  cuadrillas,
  soloUltimaVisita,
  onSoloUltimaChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  onLimpiar,
}) => {
  const hayFiltros =
    busqueda !== '' ||
    filtroEstado !== 'TODOS' ||
    filtroDistrito !== 'TODOS' ||
    filtroCuadrilla !== 'TODOS' ||
    !soloUltimaVisita ||
    fechaDesde !== '' ||
    fechaHasta !== '';

  return (
    <div className="pf-card p-3 flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[230px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar ID orden, pedido, DNI, cliente o cuadrilla..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="pf-input w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <select
        value={filtroEstado}
        onChange={(e) => onEstadoChange(e.target.value)}
        className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
      >
        <option value="TODOS">Estado: Todos</option>
        {estadosDisponibles.map((est) => (
          <option key={est} value={est}>
            {est}
          </option>
        ))}
      </select>

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

      <select
        value={filtroCuadrilla}
        onChange={(e) => onCuadrillaChange(e.target.value)}
        className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
      >
        <option value="TODOS">Cuadrilla: Todas</option>
        {cuadrillas.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

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

      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={soloUltimaVisita}
          onChange={(e) => onSoloUltimaChange(e.target.checked)}
          className="accent-pf-red rounded cursor-pointer"
        />
        Última visita
      </label>

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