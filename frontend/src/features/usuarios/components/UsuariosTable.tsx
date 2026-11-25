// Etiqueta: Tabla minimalista de Usuarios, Partners y Tecnicos con control de acceso rapido
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { UsuarioSistema } from '../types/usuario.types';

interface Props {
  usuarios: UsuarioSistema[];
  onSelectUsuario: (usuario: UsuarioSistema) => void;
  onToggleActivo: (usuario: UsuarioSistema) => void;
}

const badgeRolClase = (rol: string) => {
  if (rol === 'ADMIN') return 'bg-pf-red text-white';
  if (rol === 'SUPERVISOR') return 'bg-pf-yellow/25 text-neutral-900';
  if (rol === 'PARTNER') return 'bg-pf-red/10 text-pf-red';
  if (rol === 'TECNICO') return 'bg-neutral-100 text-neutral-800 border border-neutral-200';
  return 'bg-neutral-100 text-pf-gray';
};

export const UsuariosTable: React.FC<Props> = ({
  usuarios,
  onSelectUsuario,
  onToggleActivo,
}) => {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-pf-gray bg-neutral-50/70">
            <th className="py-3 px-4">DNI / ID</th>
            <th className="py-3 px-4">Nombre Completo</th>
            <th className="py-3 px-4">Rol</th>
            <th className="py-3 px-4">Partner</th>
            <th className="py-3 px-4">Cuadrilla / Zona</th>
            <th className="py-3 px-4">Contacto</th>
            <th className="py-3 px-4">Acceso</th>
            <th className="py-3 px-4 text-right">Editar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {usuarios.map((u) => {
            const esActivo = u.activo === 1;

            return (
              <tr
                key={u.id_user}
                onClick={() => onSelectUsuario(u)}
                className="hover:bg-neutral-50 transition cursor-pointer group"
              >
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="font-bold text-neutral-900">{u.dni}</div>
                  <div className="text-[11px] text-pf-gray">{u.id_user}</div>
                </td>

                <td className="py-3 px-4">
                  <div className="font-bold text-neutral-800">
                    {u.nombres} {u.apellidos}
                  </div>
                </td>

                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeRolClase(
                      u.rol
                    )}`}
                  >
                    {u.rol}
                  </span>
                </td>

                <td className="py-3 px-4 whitespace-nowrap font-bold text-neutral-800 text-xs">
                  {u.contrata || '-'}
                </td>

                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="font-semibold text-neutral-800 text-xs">
                    {u.cuadrilla || '-'}
                  </div>
                  {u.zona_distrito && (
                    <div className="text-[11px] text-pf-gray">{u.zona_distrito}</div>
                  )}
                </td>

                <td className="py-3 px-4 whitespace-nowrap text-xs text-neutral-700">
                  <div>{u.telefono || '-'}</div>
                  {u.correo && <div className="text-[11px] text-pf-gray">{u.correo}</div>}
                </td>

                <td
                  className="py-3 px-4 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleActivo(u)}
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                      esActivo
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-neutral-100 text-pf-gray hover:bg-neutral-200'
                    }`}
                  >
                    {esActivo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>

                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button className="p-1.5 text-pf-gray group-hover:text-pf-red transition cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};