// Etiqueta: Contenedor principal del modulo Tecnicos, Partners y Usuarios con TanStack Query
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, UserPlus } from 'lucide-react';
import type { UsuarioSistema } from '../types/usuario.types';
import { UsuariosFiltrosBar } from './UsuariosFiltrosBar';
import { UsuariosTable } from './UsuariosTable';
import { UsuarioFormDrawer } from './UsuarioFormDrawer';
import { exportarUsuariosCsv } from '../services/exportarUsuarios';
import { apiClient } from '../../../lib/apiClient';

export const UsuariosView: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroPartner, setFiltroPartner] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<UsuarioSistema | null>(null);

  const {
    data: usuarios = [],
    isFetching: loading,
    refetch: cargarUsuarios,
  } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await apiClient.get<UsuarioSistema[]>('/usuarios');
      return data;
    },
  });

  const cambiarEstadoActivo = async (u: UsuarioSistema) => {
    const nuevoEstado = u.activo === 1 ? 0 : 1;
    await apiClient.patch(`/usuarios/${u.id_user}`, { activo: nuevoEstado });
    cargarUsuarios();
  };

  const partnersUnicos = Array.from(
    new Set(
      usuarios
        .filter((u) => u.rol === 'PARTNER' || u.rol === 'TECNICO')
        .map((u) => u.contrata?.trim())
        .filter((p): p is string => Boolean(p) && p !== 'PERUFIBRA')
    )
  ).sort();

  const cuadrillasUnicas = Array.from(
    new Set(usuarios.map((u) => u.cuadrilla?.trim()).filter((c): c is string => Boolean(c)))
  ).sort();

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    const nombreCompleto = `${u.nombres} ${u.apellidos}`.toLowerCase();

    const coincideTexto =
      !q ||
      u.dni?.toLowerCase().includes(q) ||
      u.id_user?.toLowerCase().includes(q) ||
      nombreCompleto.includes(q) ||
      u.cuadrilla?.toLowerCase().includes(q) ||
      u.contrata?.toLowerCase().includes(q);

    const coincideRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    const coincidePartner = filtroPartner === 'TODOS' || u.contrata === filtroPartner;
    const coincideEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'ACTIVOS' && u.activo === 1) ||
      (filtroEstado === 'INACTIVOS' && u.activo === 0);

    return coincideTexto && coincideRol && coincidePartner && coincideEstado;
  });

  return (
    <div className="p-6 lg:p-8 space-y-5 pf-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Técnicos y Usuarios</h1>
            <span className="font-mono tabular-nums bg-slate-900/5 border border-slate-200/80 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {usuariosFiltrados.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de personal interno, partners y cuadrillas técnicas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => cargarUsuarios()}
            title="Actualizar"
            className="pf-btn-secondary p-2.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pf-red' : ''}`} />
          </button>

          <button
            onClick={() => exportarUsuariosCsv(usuariosFiltrados)}
            disabled={usuariosFiltrados.length === 0}
            className="pf-btn-secondary flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl disabled:opacity-40 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              setUsuarioEditar(null);
              setDrawerAbierto(true);
            }}
            className="pf-btn-primary flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <UsuariosFiltrosBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroRol={filtroRol}
        onRolChange={setFiltroRol}
        filtroPartner={filtroPartner}
        onPartnerChange={setFiltroPartner}
        partners={partnersUnicos}
        filtroEstado={filtroEstado}
        onEstadoChange={setFiltroEstado}
        onLimpiar={() => {
          setBusqueda('');
          setFiltroRol('TODOS');
          setFiltroPartner('TODOS');
          setFiltroEstado('TODOS');
        }}
      />

      <UsuariosTable
        usuarios={usuariosFiltrados}
        onSelectUsuario={(u) => {
          setUsuarioEditar(u);
          setDrawerAbierto(true);
        }}
        onToggleActivo={cambiarEstadoActivo}
      />

      <UsuarioFormDrawer
        abierto={drawerAbierto}
        usuarioEditar={usuarioEditar}
        partnersExistentes={partnersUnicos}
        cuadrillasExistentes={cuadrillasUnicas}
        onClose={() => setDrawerAbierto(false)}
        onGuardado={() => {
          cargarUsuarios();
        }}
      />
    </div>
  );
};