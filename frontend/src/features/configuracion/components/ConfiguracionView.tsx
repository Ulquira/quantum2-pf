// Etiqueta: Vista principal de Configuracion con TanStack Query
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import type { CatalogoEstado } from '../types/configuracion.types';
import { EstadosTable } from './EstadosTable';
import { EstadoFormDrawer } from './EstadoFormDrawer';
import { apiClient } from '../../../lib/apiClient';

type TabParametro = 'ESTADOS';

export const ConfiguracionView: React.FC = () => {
  const [tabActiva] = useState<TabParametro>('ESTADOS');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [itemEditar, setItemEditar] = useState<CatalogoEstado | null>(null);

  const {
    data: items = [],
    isFetching: loading,
    refetch: cargarCatalogo,
  } = useQuery({
    queryKey: ['catalogo-estados', 'todos'],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogoEstado[]>('/configuracion/estados');
      return data;
    },
  });

  const toggleActivo = async (item: CatalogoEstado) => {
    await apiClient.patch(`/configuracion/estados/${item.id_catalogo}`, {
      activo: item.activo === 1 ? 0 : 1,
    });
    cargarCatalogo();
  };

  const estadosPadreUnicos = Array.from(new Set(items.map((i) => i.estado))).sort();

  const itemsFiltrados = items.filter((i) => {
    const q = busqueda.toLowerCase();
    const coincideTexto =
      !q || i.estado.toLowerCase().includes(q) || i.subestado.toLowerCase().includes(q);
    const coincideEstado = filtroEstado === 'TODOS' || i.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  return (
    <div className="p-6 lg:p-8 space-y-5 pf-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración</h1>
            <span className="font-mono tabular-nums bg-slate-900/5 border border-slate-200/80 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {itemsFiltrados.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Catálogo maestro de estados, subestados y reglas de cierre
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => cargarCatalogo()}
            title="Actualizar"
            className="pf-btn-secondary p-2.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pf-red' : ''}`} />
          </button>

          <button
            onClick={() => {
              setItemEditar(null);
              setDrawerAbierto(true);
            }}
            className="pf-btn-primary flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Estado</span>
          </button>
        </div>
      </div>

      {/* Pestañas preparadas para sumar mas tablas de control en el futuro */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            tabActiva === 'ESTADOS'
              ? 'border-pf-red text-pf-red'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Estados y SubEstados
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="pf-card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar estado o subestado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pf-input w-full pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="pf-input px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="TODOS">Estado Padre: Todos</option>
          {estadosPadreUnicos.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>

        {(busqueda !== '' || filtroEstado !== 'TODOS') && (
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('TODOS');
            }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-pf-red hover:bg-pf-red/8 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      <EstadosTable
        items={itemsFiltrados}
        onSelect={(item) => {
          setItemEditar(item);
          setDrawerAbierto(true);
        }}
        onToggleActivo={toggleActivo}
      />

      <EstadoFormDrawer
        abierto={drawerAbierto}
        itemEditar={itemEditar}
        estadosExistentes={estadosPadreUnicos}
        onClose={() => setDrawerAbierto(false)}
        onGuardado={() => {
          cargarCatalogo();
        }}
      />
    </div>
  );
};