// Etiqueta: Barra minimalista de filtros por Rol, Partner y Estado de acceso
import React from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  filtroRol: string;
  onRolChange: (val: string) => void;
  filtroPartner: string;
  onPartnerChange: (val: string) => void;
  partners: string[];
  filtroEstado: string;
  onEstadoChange: (val: string) => void;
  onLimpiar: () => void;
}

export const UsuariosFiltrosBar: React.FC<Props> = ({
  busqueda,
  onBusquedaChange,
  filtroRol,
  onRolChange,
  filtroPartner,
  onPartnerChange,
  partners,
  filtroEstado,
  onEstadoChange,
  onLimpiar,
}) => {
  const hayFiltros =
    busqueda !== '' ||
    filtroRol !== 'TODOS' ||
    filtroPartner !== 'TODOS' ||
    filtroEstado !== 'TODOS';

  return (
    <div className="bg-white p-3 rounded-xl border border-neutral-200 flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 text-pf-gray absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="DNI, nombre, cuadrilla o usuario..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-pf-red"
        />
      </div>

      <select
        value={filtroRol}
        onChange={(e) => onRolChange(e.target.value)}
        className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white text-neutral-700 focus:outline-none focus:border-pf-red"
      >
        <option value="TODOS">Rol: Todos</option>
        <option value="ADMIN">ADMIN</option>
        <option value="SUPERVISOR">SUPERVISOR</option>
        <option value="DESPACHO">DESPACHO</option>
        <option value="VALIDADOR">VALIDADOR</option>
        <option value="TECNICO">TÉCNICO</option>
      </select>

      <select
        value={filtroPartner}
        onChange={(e) => onPartnerChange(e.target.value)}
        className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white text-neutral-700 focus:outline-none focus:border-pf-red"
      >
        <option value="TODOS">Partner: Todos</option>
        {partners.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={filtroEstado}
        onChange={(e) => onEstadoChange(e.target.value)}
        className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white text-neutral-700 focus:outline-none focus:border-pf-red"
      >
        <option value="TODOS">Acceso: Todos</option>
        <option value="ACTIVOS">Activos</option>
        <option value="INACTIVOS">Inactivos</option>
      </select>

      {hayFiltros && (
        <button
          onClick={onLimpiar}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-pf-red hover:bg-pf-red/5 rounded-lg cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
};