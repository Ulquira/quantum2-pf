// Etiqueta: Bandeja movil del Tecnico con monitoreo continuo de jornada, cabecera compacta y menu retraible
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  RefreshCw,
  ChevronRight,
  Lock,
  Search,
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
import { TecnicoMenuDrawer, type SeccionMenuApk } from './TecnicoMenuDrawer';
import { useMonitoreoJornada } from '../hooks/useMonitoreoJornada';
import { apiClient } from '../../../lib/apiClient';
import { flushOfflineQueue, getPendingItems } from '../services/offlineQueue';

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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [seccionMenu, setSeccionMenu] = useState<SeccionMenuApk>('ORDENES');
  const [tab, setTab] = useState<'PENDIENTES' | 'CERRADAS'>('PENDIENTES');
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [ordenActivaId, setOrdenActivaId] = useState<string | null>(null);

  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [sincronizandoManual, setSincronizandoManual] = useState(false);

  const {
    data: ordenes = [],
    isFetching: loadingOrdenes,
    isError: errorConexion,
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

  // Etiqueta: Identifica si el tecnico tiene una orden activa en ruta o ejecucion para reportarla en el ping
  const ordenEnCurso = useMemo(
    () =>
      ordenes.find((o) => ['EN PROCESO', 'EN CAMINO'].includes((o.Estado || '').toUpperCase())) ||
      null,
    [ordenes]
  );

  const {
    enJornada,
    jornada,
    cambiandoJornada,
    estadoGps,
    iniciarJornada,
    finalizarJornada,
  } = useMonitoreoJornada({
    idUser: usuario.id_user,
    idOperacionActiva: ordenEnCurso?.IDoperacion || null,
    estadoOperativo: ordenEnCurso?.Estado?.toUpperCase() || 'DISPONIBLE',
  });

  const revisarPendientes = async () => {
    const items = await getPendingItems().catch(() => []);
    setPendientesOffline(items.length);
  };

  const sincronizarTodo = async () => {
    setSincronizandoManual(true);
    try {
      await flushOfflineQueue().catch(() => {});
      await Promise.all([cargarMisOrdenes(), revisarPendientes()]);
    } finally {
      setSincronizandoManual(false);
    }
  };

  // Etiqueta: Cierra la jornada activa en servidor antes de salir de la sesion
  const manejarLogout = async () => {
    await finalizarJornada('LOGOUT');
    onLogout();
  };

  useEffect(() => {
    revisarPendientes();
    const alConectar = () => {
      setEnLinea(true);
      sincronizarTodo();
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
  }, []);

  const conectadoReal = enLinea && !errorConexion;
  const sincronizando = loadingOrdenes || sincronizandoManual;
  const ordenSeleccionada = ordenes.find((o) => o.IDoperacion === ordenActivaId) || null;

  const conteoAsignadas = ordenes.filter((o) => !esOrdenCerrada(o, catalogoApk)).length;
  const conteoCerradas = ordenes.length - conteoAsignadas;

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

  const colorPuntoEstado = !conectadoReal
    ? 'bg-neutral-300'
    : pendientesOffline > 0
    ? 'bg-pf-yellow'
    : enJornada
    ? 'bg-emerald-400'
    : 'bg-white/45';

  const tituloEstadoRed = !conectadoReal
    ? 'Sin conexión'
    : pendientesOffline > 0
    ? `${pendientesOffline} cambio(s) pendiente(s)`
    : enJornada
    ? 'En jornada · GPS activo'
    : 'Fuera de servicio';

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] max-w-lg mx-auto sm:border-x sm:border-neutral-200 flex flex-col overflow-x-hidden">
      {!ordenSeleccionada && (
        <header className="w-full h-12 bg-pf-red text-white px-3 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
          {/* Etiqueta: Izquierda simetrica (Menu + Marca compacta + Indicador con onda periodica) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="w-8 h-8 -ml-1 rounded-lg hover:bg-white/15 active:bg-white/20 flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>

            <PeruFibraLogo variant="on-red" size="sm" />

            <button
              type="button"
              onClick={sincronizarTodo}
              title={tituloEstadoRed}
              aria-label={tituloEstadoRed}
              className="ml-1.5 h-6 px-1.5 rounded-full hover:bg-white/10 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <span className="relative flex w-2 h-2">
                {conectadoReal && enJornada && (
                  <span
                    className={`pf-signal-wave absolute inset-0 rounded-full ${colorPuntoEstado}`}
                  />
                )}
                <span className={`relative w-2 h-2 rounded-full ${colorPuntoEstado}`} />
              </span>
              {pendientesOffline > 0 && (
                <span className="text-[10px] font-bold text-pf-yellow leading-none tabular-nums">
                  {pendientesOffline}
                </span>
              )}
            </button>
          </div>

          {/* Etiqueta: Derecha minimalista (Solo sincronizacion) */}
          <div className="flex items-center shrink-0 -mr-1">
            <button
              type="button"
              onClick={sincronizarTodo}
              disabled={sincronizando}
              title="Sincronizar"
              aria-label="Sincronizar"
              className="w-8 h-8 rounded-lg hover:bg-white/15 active:bg-white/20 flex items-center justify-center transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>
      )}

      <TecnicoMenuDrawer
        abierto={menuAbierto}
        usuario={usuario}
        seccionActiva={seccionMenu}
        enLinea={conectadoReal && enJornada}
        pendientesOffline={pendientesOffline}
        sincronizando={sincronizando}
        onClose={() => setMenuAbierto(false)}
        onSelectSeccion={setSeccionMenu}
        onSincronizar={sincronizarTodo}
        onLogout={manejarLogout}
      />

      <main className="flex-1 p-3">
        {ordenSeleccionada ? (
          <OrdenEjecucionApk
            orden={ordenSeleccionada}
            idTecnico={usuario.id_user}
            catalogoApk={catalogoApk}
            onVolver={() => {
              setOrdenActivaId(null);
              revisarPendientes();
            }}
            onOrdenActualizada={() => {
              cargarMisOrdenes();
              revisarPendientes();
            }}
          />
        ) : (
          <div className="space-y-3">
            {/* Etiqueta: Control de Jornada (Conexion/Desconexion + GPS continuo) */}
            

            {/* Pestañas Asignadas / Cerradas */}
            <div className="grid grid-cols-2 bg-neutral-200/75 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTab('PENDIENTES')}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === 'PENDIENTES' ? 'bg-white text-pf-red shadow-xs' : 'text-neutral-600'
                }`}
              >
                <span>Asignadas</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                  {conteoAsignadas}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('CERRADAS')}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === 'CERRADAS' ? 'bg-white text-pf-red shadow-xs' : 'text-neutral-600'
                }`}
              >
                <span>Cerradas</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                  {conteoCerradas}
                </span>
              </button>
            </div>

            {/* Filtros compactos */}
            <div className="bg-white p-2 rounded-2xl border border-neutral-200 flex items-center gap-2 shadow-xs">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-pf-gray absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Pedido, DNI o cliente"
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-pf-red"
                />
              </div>

              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                aria-label="Filtrar por fecha"
                className="w-[116px] shrink-0 text-[11px] font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-pf-red"
              />

              {(busqueda || filtroFecha) && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setFiltroFecha('');
                  }}
                  aria-label="Limpiar filtros"
                  className="p-1.5 text-pf-red hover:bg-pf-red/10 rounded-lg shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Listado de Tarjetas de Ordenes */}
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