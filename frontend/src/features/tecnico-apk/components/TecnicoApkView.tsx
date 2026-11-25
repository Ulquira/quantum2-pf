// Etiqueta: Bandeja movil moderna del Tecnico con TanStack Query y filtros por Codigo y Fecha
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  RefreshCw,
  ChevronRight,
  Lock,
  Search,
  Calendar,
  MapPin,
  Clock,
  X,
} from 'lucide-react';
import { PeruFibraLogo } from '../../../components/brand/PeruFibraLogo';
import type { SesionUsuario } from '../../auth/types/auth.types';
import type { OrdenOperacion } from '../../operaciones/types/operacion.types';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';
import { esOrdenCerrada } from '../../operaciones/utils/operacionJson';
import { OrdenEjecucionApk } from './OrdenEjecucionApk';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  usuario: SesionUsuario;
  onLogout: () => void;
}

const badgeEstadoMovil = (estado: string) => {
  const e = (estado || '').toUpperCase();
  if (e === 'FINALIZADO') return 'bg-emerald-100 text-emerald-800';
  if (e === 'EN PROCESO') return 'bg-pf-red text-white';
  if (e === 'EN CAMINO') return 'bg-pf-yellow text-neutral-900';
  return 'bg-neutral-100 text-neutral-800';
};

export const TecnicoApkView: React.FC<Props> = ({ usuario, onLogout }) => {
  const [tab, setTab] = useState<'PENDIENTES' | 'CERRADAS'>('PENDIENTES');
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [ordenActivaId, setOrdenActivaId] = useState<string | null>(null);

  const {
    data: ordenes = [],
    isFetching: loadingOrdenes,
    refetch: cargarMisOrdenes,
  } = useQuery({
    queryKey: ['apk-ordenes', usuario.id_user, usuario.cuadrilla, usuario.contrata],
    queryFn: async () => {
      const { data } = await apiClient.get<OrdenOperacion[]>('/apk/ordenes', {
        params: {
          id_tecnico: usuario.id_user,
          cuadrilla: usuario.cuadrilla || '',
          partner: usuario.contrata || '',
        },
      });
      return data;
    },
  });

  const { data: catalogoApk = [] } = useQuery({
    queryKey: ['catalogo-estados', 'apk'],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogoEstado[]>('/configuracion/estados', {
        params: { activos: 1 },
      });
      return data.filter((c) => c.visible_apk === 1);
    },
    staleTime: 5 * 60_000,
  });

  const loading = loadingOrdenes;

  const ordenSeleccionada = ordenes.find((o) => o.IDoperacion === ordenActivaId) || null;

  const ordenesFiltradas = ordenes.filter((o) => {
    const cerrada = esOrdenCerrada(o, catalogoApk);
    const cumpleTab = tab === 'CERRADAS' ? cerrada : !cerrada;
    if (!cumpleTab) return false;

    const q = busqueda.trim().toLowerCase();
    const cumpleCodigo =
      !q ||
      o.valida_cod_pedido?.toLowerCase().includes(q) ||
      o.dni_cliente?.toLowerCase().includes(q) ||
      o.nom_cliente?.toLowerCase().includes(q);

    const fechaOrden = (o.Fecha_Gestion || '').slice(0, 10);
    const cumpleFecha = !filtroFecha || fechaOrden === filtroFecha;

    return cumpleCodigo && cumpleFecha;
  });

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] max-w-lg mx-auto border-x border-neutral-200 flex flex-col">
      {!ordenSeleccionada && (
        <header className="w-full h-14 bg-pf-red text-white px-4 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-sm shrink-0">
          <PeruFibraLogo variant="on-red" className="h-6" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-right min-w-0">
              <div className="text-xs font-bold leading-tight truncate">{usuario.nombres}</div>
              <div className="text-[10px] text-white/85 font-medium truncate">
                {usuario.cuadrilla || usuario.contrata}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg bg-white/15 hover:bg-white/25 shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 p-3">
        {ordenSeleccionada ? (
          <OrdenEjecucionApk
            orden={ordenSeleccionada}
            idTecnico={usuario.id_user}
            catalogoApk={catalogoApk}
            onVolver={() => setOrdenActivaId(null)}
            onOrdenActualizada={() => {
              cargarMisOrdenes();
            }}
          />
        ) : (
          <div className="space-y-3">
            {/* Pestañas En Curso / Cerradas + Refrescar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 bg-neutral-200/75 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setTab('PENDIENTES')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    tab === 'PENDIENTES' ? 'bg-white text-pf-red shadow-xs' : 'text-neutral-600'
                  }`}
                >
                  Asignadas
                </button>
                <button
                  onClick={() => setTab('CERRADAS')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    tab === 'CERRADAS' ? 'bg-white text-pf-red shadow-xs' : 'text-neutral-600'
                  }`}
                >
                  Cerradas
                </button>
              </div>

              <button
                onClick={() => cargarMisOrdenes()}
                className="p-2.5 rounded-xl bg-white border border-neutral-200 text-neutral-700 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filtros compactos: Codigo de Pedido y Fecha */}
            <div className="bg-white p-2.5 rounded-2xl border border-neutral-200 flex items-center gap-2 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-pf-gray absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Código, DNI o cliente..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-pf-red"
                />
              </div>

              <div className="relative flex items-center border border-neutral-200 rounded-xl px-2 py-1.5 bg-neutral-50">
                <Calendar className="w-3.5 h-3.5 text-pf-red mr-1.5 shrink-0" />
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="text-xs bg-transparent text-neutral-800 font-semibold focus:outline-none w-[108px]"
                />
              </div>

              {(busqueda || filtroFecha) && (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setFiltroFecha('');
                  }}
                  className="p-1.5 text-pf-red hover:bg-pf-red/10 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Listado moderno de Tarjetas de Ordenes */}
            <div className="space-y-2.5">
              {ordenesFiltradas.map((o) => {
                const cerrada = esOrdenCerrada(o, catalogoApk);
                const fechaCorta = o.Fecha_Gestion ? o.Fecha_Gestion.slice(0, 10) : '-';

                return (
                  <div
                    key={o.IDoperacion}
                    onClick={() => setOrdenActivaId(o.IDoperacion)}
                    className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs active:scale-[0.99] transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-neutral-900">
                          #{o.valida_cod_pedido}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${badgeEstadoMovil(
                            o.Estado
                          )}`}
                        >
                          {cerrada && <Lock className="w-2.5 h-2.5" />}
                          {o.Estado}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-pf-red shrink-0" />
                    </div>

                    <div className="font-bold text-xs text-neutral-800 truncate">
                      {o.nom_cliente}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-pf-gray">
                      <MapPin className="w-3.5 h-3.5 text-pf-red shrink-0" />
                      <span className="truncate">
                        <b className="text-neutral-700">{o.Distrito}:</b> {o.direccion_cliente}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-pf-gray" />
                        {fechaCorta} • {o.Tramo_Atencio || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold text-neutral-800">
                        {o.Mesh_modo || 'SIN MESH'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {ordenesFiltradas.length === 0 && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-xs font-semibold text-pf-gray">
                  No se encontraron órdenes con este filtro
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};