// Etiqueta: Vista principal del modulo Operaciones con paginacion, TanStack Query y filtros en servidor
import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import { OperacionesFiltrosBar } from './OperacionesFiltrosBar';
import { OperacionesTable } from './OperacionesTable';
import { OperacionDetalleDrawer } from './OperacionDetalleDrawer';
import { OperacionesKpiBar, type ResumenOperacionesKpi } from './OperacionesKpiBar';
import { exportarOperacionesCsv } from '../services/exportarOperaciones';
import { apiClient } from '../../../lib/apiClient';

const PAGE_SIZE = 50;

interface OperacionesPaginadasResponse {
  data: OrdenOperacion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  resumen?: ResumenOperacionesKpi;
  filtros?: {
    distritos: string[];
    cuadrillas: string[];
  };
}

export const OperacionesView: React.FC = () => {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDistrito, setFiltroDistrito] = useState('TODOS');
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('TODOS');
  const [soloUltimaVisita, setSoloUltimaVisita] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenOperacion | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    setPage(1);
  }, [
    busquedaDebounced,
    filtroEstado,
    filtroDistrito,
    filtroCuadrilla,
    soloUltimaVisita,
    fechaDesde,
    fechaHasta,
  ]);

  const { data: estadosCatalogo = [] } = useQuery({
    queryKey: ['catalogo-estados', { activos: 1 }],
    queryFn: async () => {
      const { data } = await apiClient.get<{ estado: string }[]>('/configuracion/estados', {
        params: { activos: 1 },
      });
      return Array.from(new Set(data.map((i) => i.estado)));
    },
    staleTime: 5 * 60_000,
  });

  const {
    data: respuesta,
    isFetching: loading,
    refetch: cargarOperaciones,
  } = useQuery({
    queryKey: [
      'operaciones',
      {
        page,
        q: busquedaDebounced,
        estado: filtroEstado,
        distrito: filtroDistrito,
        cuadrilla: filtroCuadrilla,
        soloUltima: soloUltimaVisita,
        fechaDesde,
        fechaHasta,
      },
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
        solo_ultima: soloUltimaVisita ? '1' : '0',
      };
      if (busquedaDebounced) params.q = busquedaDebounced;
      if (filtroEstado !== 'TODOS') params.estado = filtroEstado;
      if (filtroDistrito !== 'TODOS') params.distrito = filtroDistrito;
      if (filtroCuadrilla !== 'TODOS') params.cuadrilla = filtroCuadrilla;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const { data } = await apiClient.get<OperacionesPaginadasResponse>('/operaciones', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const ordenes = respuesta?.data || [];
  const total = respuesta?.pagination?.total || 0;
  const totalPages = respuesta?.pagination?.totalPages || 1;
  const distritosUnicos = respuesta?.filtros?.distritos || [];
  const cuadrillasUnicas = respuesta?.filtros?.cuadrillas || [];
  const resumenKpi: ResumenOperacionesKpi = respuesta?.resumen || {
    total,
    pendientes: 0,
    en_gestion: 0,
    finalizadas: 0,
    incidencias: 0,
  };

  return (
    <div className="p-6 lg:p-8 space-y-5 pf-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operaciones</h1>
          <span className="font-mono tabular-nums bg-slate-900/5 border border-slate-200/80 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => cargarOperaciones()}
            title="Actualizar"
            className="pf-btn-secondary p-2.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pf-red' : ''}`} />
          </button>

          <button
            onClick={() => exportarOperacionesCsv(ordenes)}
            disabled={ordenes.length === 0}
            className="pf-btn-secondary flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl disabled:opacity-40 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <OperacionesKpiBar
        resumen={resumenKpi}
        filtroEstado={filtroEstado}
        onSelectEstado={setFiltroEstado}
      />

      <OperacionesFiltrosBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroEstado={filtroEstado}
        onEstadoChange={setFiltroEstado}
        estadosDisponibles={estadosCatalogo}
        filtroDistrito={filtroDistrito}
        onDistritoChange={setFiltroDistrito}
        distritos={distritosUnicos}
        filtroCuadrilla={filtroCuadrilla}
        onCuadrillaChange={setFiltroCuadrilla}
        cuadrillas={cuadrillasUnicas}
        soloUltimaVisita={soloUltimaVisita}
        onSoloUltimaChange={setSoloUltimaVisita}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        onLimpiar={() => {
          setBusqueda('');
          setFiltroEstado('TODOS');
          setFiltroDistrito('TODOS');
          setFiltroCuadrilla('TODOS');
          setSoloUltimaVisita(true);
          setFechaDesde('');
          setFechaHasta('');
        }}
      />

      <OperacionesTable ordenes={ordenes} onSelectOrden={setOrdenSeleccionada} />

      {totalPages > 1 && (
        <div className="pf-card flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-600 tabular-nums">
            Mostrando <b className="text-slate-900">{ordenes.length}</b> de{' '}
            <b className="text-slate-900">{total}</b> órdenes · Página{' '}
            <b className="text-slate-900">{page}</b> de <b className="text-slate-900">{totalPages}</b>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="pf-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="pf-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <OperacionDetalleDrawer
        orden={ordenSeleccionada}
        onClose={() => setOrdenSeleccionada(null)}
        onActualizado={() => {
          cargarOperaciones();
        }}
      />
    </div>
  );
};