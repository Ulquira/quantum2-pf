// Etiqueta: Sidebar SaaS minimalista de alto contraste con identidad PeruFibra y colapso suave
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  UserCog,
  SlidersHorizontal,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { PeruFibraLogo } from '../brand/PeruFibraLogo';
import type { SesionUsuario } from '../../features/auth/types/auth.types';

export type ModuloSistema = 'CLIENTES' | 'OPERACIONES' | 'USUARIOS' | 'CONFIGURACION';

interface Props {
  usuario: SesionUsuario;
  onLogout: () => void;
}

const ITEMS_MENU: {
  id: ModuloSistema;
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: string[];
}[] = [
  { id: 'CLIENTES', to: '/clientes', label: 'Clientes', icon: Users, roles: ['ADMIN', 'SUPERVISOR', 'ASESOR'] },
  {
    id: 'OPERACIONES',
    to: '/operaciones',
    label: 'Operaciones',
    icon: ClipboardList,
    roles: ['ADMIN', 'SUPERVISOR', 'PARTNER'],
  },
  { id: 'USUARIOS', to: '/usuarios', label: 'Técnicos y Usuarios', icon: UserCog, roles: ['ADMIN', 'SUPERVISOR'] },
  {
    id: 'CONFIGURACION',
    to: '/configuracion',
    label: 'Configuración',
    icon: SlidersHorizontal,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
];

export const Sidebar: React.FC<Props> = ({ usuario, onLogout }) => {
  const [colapsado, setColapsado] = useState(false);
  const itemsPermitidos = ITEMS_MENU.filter((item) => item.roles.includes(usuario.rol));
  const iniciales = `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase() || 'PF';

  return (
    <aside
      className={`${
        colapsado ? 'w-[76px]' : 'w-[252px]'
      } shrink-0 bg-[#0F1117] text-white flex flex-col justify-between min-h-screen sticky top-0 h-screen border-r border-white/[0.06] transition-all duration-200`}
    >
      <div>
        {/* Cabecera de marca con acento sutil rojo PeruFibra */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.07]">
          {!colapsado ? (
            <div className="flex items-center gap-2 min-w-0">
              <PeruFibraLogo variant="on-red" className="h-7" />
            </div>
          ) : (
            <div className="w-9 h-9 mx-auto rounded-xl bg-pf-red flex items-center justify-center font-extrabold text-xs tracking-tight shadow-sm">
              <span className="text-white">P</span>
              <span className="text-pf-yellow">F</span>
            </div>
          )}

          {!colapsado && (
            <button
              type="button"
              onClick={() => setColapsado(true)}
              title="Colapsar menú"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.07] transition cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {colapsado && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setColapsado(false)}
              title="Expandir menú"
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.07] transition cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Seccion de navegacion */}
        <div className="px-3 pt-5">
          {!colapsado && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              Gestión Operativa
            </div>
          )}

          <nav className="space-y-1">
            {itemsPermitidos.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  title={colapsado ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center ${
                      colapsado ? 'justify-center px-2.5' : 'gap-3 px-3'
                    } py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-pf-red text-white font-semibold shadow-[0_4px_14px_-4px_rgba(216,3,25,0.65)]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.06] font-medium'
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!colapsado && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer de usuario */}
      <div className="p-3 border-t border-white/[0.07]">
        <div
          className={`flex items-center ${
            colapsado ? 'flex-col gap-2' : 'justify-between gap-2.5'
          } p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pf-red to-[#9E0212] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-1 ring-white/15">
              {iniciales}
            </div>
            {!colapsado && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{usuario.nombres}</div>
                <div className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pf-yellow inline-block shrink-0" />
                  {usuario.rol}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-pf-yellow hover:bg-white/[0.08] transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
