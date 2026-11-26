// Etiqueta: Menu lateral retraible de la APK con perfil del tecnico, estado de red y menu extensible
import React from 'react';
import {
  X,
  ClipboardList,
  LogOut,
  MapPin,
  Building2,
  Users,
  IdCard,
  RefreshCw,
} from 'lucide-react';
import { PeruFibraLogo } from '../../../components/brand/PeruFibraLogo';
import type { SesionUsuario } from '../../auth/types/auth.types';

export type SeccionMenuApk = 'ORDENES';

interface Props {
  abierto: boolean;
  usuario: SesionUsuario;
  seccionActiva: SeccionMenuApk;
  enLinea: boolean;
  pendientesOffline: number;
  sincronizando: boolean;
  onClose: () => void;
  onSelectSeccion: (seccion: SeccionMenuApk) => void;
  onSincronizar: () => void;
  onLogout: () => void;
}

const ITEMS_MENU_APK: {
  id: SeccionMenuApk;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'ORDENES', label: 'Mis Órdenes', icon: ClipboardList },
];

export const TecnicoMenuDrawer: React.FC<Props> = ({
  abierto,
  usuario,
  seccionActiva,
  enLinea,
  pendientesOffline,
  sincronizando,
  onClose,
  onSelectSeccion,
  onSincronizar,
  onLogout,
}) => {
  const iniciales =
    `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase() || 'TC';
  const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim();

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        abierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Fondo oscurecido para cerrar al tocar fuera */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
      />

      {/* Panel lateral deslizable */}
      <aside
        className={`relative w-[280px] max-w-[82vw] h-full bg-white shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-out ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Etiqueta: Cabecera corporativa alineada a 48px con la barra principal */}
          <div className="h-12 px-3 bg-pf-red text-white flex items-center justify-between">
            <PeruFibraLogo variant="on-red" size="sm" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="w-8 h-8 -mr-1 rounded-lg hover:bg-white/15 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tarjeta de Perfil del Tecnico */}
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/70 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-pf-red text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                {iniciales}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-neutral-900 truncate">
                  {nombreCompleto || usuario.nombres}
                </div>
                <div className="text-[11px] font-semibold text-pf-gray flex items-center gap-1">
                  <IdCard className="w-3 h-3 shrink-0" />
                  <span>DNI {usuario.dni}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-neutral-700">
              {usuario.contrata && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200/80">
                  <Building2 className="w-3.5 h-3.5 text-pf-red shrink-0" />
                  <span className="font-semibold truncate">{usuario.contrata}</span>
                </div>
              )}
              {usuario.cuadrilla && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200/80">
                  <Users className="w-3.5 h-3.5 text-pf-red shrink-0" />
                  <span className="font-semibold truncate">{usuario.cuadrilla}</span>
                </div>
              )}
              {usuario.zona_distrito && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200/80">
                  <MapPin className="w-3.5 h-3.5 text-pf-red shrink-0" />
                  <span className="font-semibold truncate">{usuario.zona_distrito}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navegacion extensible */}
          <nav className="p-3 space-y-1">
            {ITEMS_MENU_APK.map((item) => {
              const Icon = item.icon;
              const activo = seccionActiva === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSeccion(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activo
                      ? 'bg-pf-red/10 text-pf-red'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Estado de red y cierre de sesion */}
        <div className="p-3 border-t border-neutral-200 space-y-2">
          <button
            type="button"
            onClick={onSincronizar}
            disabled={sincronizando}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-xs transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  !enLinea
                    ? 'bg-pf-red'
                    : pendientesOffline > 0
                    ? 'bg-pf-yellow'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="font-semibold text-neutral-800">
                {!enLinea
                  ? 'Sin conexión'
                  : pendientesOffline > 0
                  ? `${pendientesOffline} pendiente(s)`
                  : 'En línea'}
              </span>
            </div>
            <RefreshCw
              className={`w-3.5 h-3.5 text-pf-gray ${sincronizando ? 'animate-spin text-pf-red' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-pf-red hover:bg-pf-red/8 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </div>
  );
};