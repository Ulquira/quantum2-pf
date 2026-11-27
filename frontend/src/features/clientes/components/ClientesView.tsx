// Etiqueta: Contenedor principal modular del modulo Clientes con paginacion, TanStack Query y filtros en servidor
import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Upload, Download, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import { ProgramarOrdenModal } from './ProgramarOrdenModal';
import { ClienteDetalleDrawer } from './ClienteDetalleDrawer';
import { ClientesFiltrosBar } from './ClientesFiltrosBar';
import { ClientesTable } from './ClientesTable';
import { exportarClientesCsv } from '../services/exportarClientes';
import { leerArchivoExcelClientes } from '../utils/leerExcelClientes';
import { apiClient } from '../../../lib/apiClient';

const PAGE_SIZE = 50;

interface ClientesPaginadosResponse {
  data: ClienteUnico[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filtros?: {
    distritos: string[];
    estadosValidacion: string[];
    estadosOperacion?: string[];
  };
}

interface Props {
  onOrdenProgramada: () => void;
}

export const ClientesView: React.FC<Props> = ({ onOrdenProgramada }) => {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroDistrito, setFiltroDistrito] = useState('TODOS');
  const [filtroValidacion, setFiltroValidacion] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [importando, setImportando] = useState(false);
  const [clienteDetalle, setClienteDetalle] = useState<ClienteUnico | null>(null);
  const [clienteAProgramar, setClienteAProgramar] = useState<ClienteUnico | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    setPage(1);
  }, [busquedaDebounced, filtroDistrito, filtroValidacion, filtroEstado, fechaDesde, fechaHasta]);

  const {
    data: respuesta,
    isFetching: loading,
    refetch: cargarClientes,
  } = useQuery({
    queryKey: [
      'clientes',
      {
        page,
        q: busquedaDebounced,
        distrito: filtroDistrito,
        validacion: filtroValidacion,
        estado: filtroEstado,
        fechaDesde,
        fechaHasta,
      },
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (busquedaDebounced) params.q = busquedaDebounced;
      if (filtroDistrito !== 'TODOS') params.distrito = filtroDistrito;
      if (filtroValidacion !== 'TODOS') params.validacion = filtroValidacion;
      if (filtroEstado !== 'TODOS') params.estado = filtroEstado;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const { data } = await apiClient.get<ClientesPaginadosResponse>('/clientes', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const clientes = respuesta?.data || [];
  const total = respuesta?.pagination?.total || 0;
  const totalPages = respuesta?.pagination?.totalPages || 1;
  const distritosUnicos = respuesta?.filtros?.distritos || [];
  const estadosValidacionUnicos = respuesta?.filtros?.estadosValidacion || [];
  const estadosOperacionUnicos = respuesta?.filtros?.estadosOperacion || [];

  const importarArchivoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    try {
      const registros = await leerArchivoExcelClientes(file);
      if (registros.length === 0) {
        throw new Error('No se encontraron filas válidas en el archivo Excel.');
      }

      const TAMANO_LOTE = 250;
      for (let i = 0; i < registros.length; i += TAMANO_LOTE) {
        const lote = registros.slice(i, i + TAMANO_LOTE);
        await apiClient.post('/clientes/importar', { registros: lote });
      }

      setPage(1);
      await cargarClientes();
    } catch (err) {
      alert(`Error al importar: ${(err as Error).message}`);
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-5 pf-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <span className="font-mono tabular-nums bg-slate-900/5 border border-slate-200/80 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => cargarClientes()}
            title="Actualizar"
            className="pf-btn-secondary p-2.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pf-red' : ''}`} />
          </button>

          <button
            onClick={() => exportarClientesCsv(clientes)}
            disabled={clientes.length === 0}
            className="pf-btn-secondary flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl disabled:opacity-40 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <label className="pf-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer">
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{importando ? 'Importando...' : 'Importar Excel'}</span>
            <input
              type="file"
              accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onClick={(e) => {
                e.currentTarget.value = '';
              }}
              onChange={importarArchivoExcel}
              className="hidden"
              disabled={importando}
            />
          </label>
        </div>
      </div>

      <ClientesFiltrosBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroDistrito={filtroDistrito}
        onDistritoChange={setFiltroDistrito}
        distritos={distritosUnicos}
        filtroValidacion={filtroValidacion}
        onValidacionChange={setFiltroValidacion}
        estadosValidacion={estadosValidacionUnicos}
        filtroEstado={filtroEstado}
        onEstadoChange={setFiltroEstado}
        estadosOperacion={estadosOperacionUnicos}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        onLimpiar={() => {
          setBusqueda('');
          setFiltroDistrito('TODOS');
          setFiltroValidacion('TODOS');
          setFiltroEstado('TODOS');
          setFechaDesde('');
          setFechaHasta('');
        }}
      />

      <ClientesTable
        clientes={clientes}
        onSelectDetalle={setClienteDetalle}
        onProgramar={setClienteAProgramar}
      />

      {totalPages > 1 && (
        <div className="pf-card flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-600 tabular-nums">
            Mostrando <b className="text-slate-900">{clientes.length}</b> de{' '}
            <b className="text-slate-900">{total}</b> clientes · Página{' '}
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

      <ClienteDetalleDrawer
        cliente={clienteDetalle}
        onClose={() => setClienteDetalle(null)}
        onProgramar={(c) => {
          setClienteDetalle(null);
          setClienteAProgramar(c);
        }}
      />

      <ProgramarOrdenModal
        cliente={clienteAProgramar}
        onClose={() => setClienteAProgramar(null)}
        onSuccess={() => {
          cargarClientes();
          onOrdenProgramada();
        }}
      />
    </div>
  );
};