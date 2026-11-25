// Etiqueta: Formulario lateral con roles oficiales y condicionamiento estricto Tecnico -> Partner
import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { RolUsuario, UsuarioPayload, UsuarioSistema } from '../types/usuario.types';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  abierto: boolean;
  usuarioEditar: UsuarioSistema | null;
  partnersExistentes: string[];
  cuadrillasExistentes: string[];
  onClose: () => void;
  onGuardado: () => void;
}

export const UsuarioFormDrawer: React.FC<Props> = ({
  abierto,
  usuarioEditar,
  partnersExistentes,
  cuadrillasExistentes,
  onClose,
  onGuardado,
}) => {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState<RolUsuario>('TECNICO');
  const [contrata, setContrata] = useState('');
  const [cuadrilla, setCuadrilla] = useState('');
  const [zonaDistrito, setZonaDistrito] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [activo, setActivo] = useState(1);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (usuarioEditar) {
      setDni(usuarioEditar.dni || '');
      setNombres(usuarioEditar.nombres || '');
      setApellidos(usuarioEditar.apellidos || '');
      setRol(usuarioEditar.rol || 'TECNICO');
      setContrata(usuarioEditar.contrata || '');
      setCuadrilla(usuarioEditar.cuadrilla || '');
      setZonaDistrito(usuarioEditar.zona_distrito || '');
      setTelefono(usuarioEditar.telefono || '');
      setCorreo(usuarioEditar.correo || '');
      setPassword('');
      setActivo(usuarioEditar.activo ?? 1);
    } else {
      setDni('');
      setNombres('');
      setApellidos('');
      setRol('PARTNER');
      setContrata('');
      setCuadrilla('');
      setZonaDistrito('');
      setTelefono('');
      setCorreo('');
      setPassword('');
      setActivo(1);
    }
  }, [usuarioEditar, abierto]);

  if (!abierto) return null;

  const esRolInterno = rol === 'ADMIN' || rol === 'SUPERVISOR' || rol === 'ASESOR';

  const cambiarRol = (nuevoRol: RolUsuario) => {
    setRol(nuevoRol);
    if (nuevoRol === 'ADMIN' || nuevoRol === 'SUPERVISOR' || nuevoRol === 'ASESOR') {
      setContrata('PERUFIBRA');
      setCuadrilla('');
    } else if (nuevoRol === 'TECNICO') {
      const partnersValidos = partnersExistentes.filter((p) => p !== 'PERUFIBRA');
      setContrata(partnersValidos[0] || partnersExistentes[0] || '');
    } else if (nuevoRol === 'PARTNER') {
      setContrata('');
      setCuadrilla('');
    }
  };

  const guardarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rol === 'TECNICO' && (!contrata || !cuadrilla.trim())) {
      alert('El técnico debe tener un Partner asignado y una Cuadrilla.');
      return;
    }

    setGuardando(true);
    const payload: UsuarioPayload = {
      dni,
      nombres,
      apellidos,
      rol,
      contrata: esRolInterno ? 'PERUFIBRA' : contrata,
      cuadrilla: rol === 'TECNICO' ? cuadrilla : '',
      zona_distrito: zonaDistrito,
      telefono,
      correo,
      activo,
    };
    if (password.trim() !== '') {
      payload.password = password.trim();
    }

    try {
      if (usuarioEditar) {
        await apiClient.patch(`/usuarios/${usuarioEditar.id_user}`, payload);
      } else {
        await apiClient.post('/usuarios', payload);
      }

      onGuardado();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-[1px]" onClick={onClose}>
      <form
        onSubmit={guardarFormulario}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 bg-pf-red text-white flex items-center justify-between shrink-0">
          <div className="font-bold text-base">
            {usuarioEditar ? `Editar ${usuarioEditar.id_user}` : 'Nuevo Usuario'}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* 1. Rol y Condicionamiento Partner -> Tecnico */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Rol y Empresa</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className={esRolInterno ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Rol</label>
                <select
                  value={rol}
                  onChange={(e) => cambiarRol(e.target.value as RolUsuario)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-pf-red"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="ASESOR">ASESOR</option>
                  <option value="PARTNER">PARTNER</option>
                  <option value="TECNICO">TÉCNICO</option>
                </select>
              </div>

              {rol === 'PARTNER' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Nombre del Partner
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: SOLUCIONES FTTH"
                    value={contrata}
                    onChange={(e) => setContrata(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                  />
                </div>
              )}

              {rol === 'TECNICO' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Partner Asignado
                  </label>
                  <select
                    required
                    value={contrata}
                    onChange={(e) => setContrata(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-pf-red"
                  >
                    <option value="">Seleccionar Partner...</option>
                    {partnersExistentes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {rol === 'TECNICO' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Cuadrilla
                    </label>
                    <input
                      type="text"
                      required
                      list="lista-cuadrillas"
                      placeholder="CUADRILLA-01"
                      value={cuadrilla}
                      onChange={(e) => setCuadrilla(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                    />
                    <datalist id="lista-cuadrillas">
                      {cuadrillasExistentes.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Zona / Distrito
                    </label>
                    <input
                      type="text"
                      value={zonaDistrito}
                      onChange={(e) => setZonaDistrito(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 2. Datos Personales */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Identificación</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">DNI / RUC</label>
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Nombres</label>
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Apellidos</label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Correo</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
            </div>
          </section>

          {/* 3. Credenciales */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Acceso</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  {usuarioEditar ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={usuarioEditar ? 'Sin cambios' : 'Por defecto: DNI'}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Estado</label>
                <select
                  value={activo}
                  onChange={(e) => setActivo(Number(e.target.value))}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-pf-red"
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 bg-white border-t border-neutral-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-1.5 bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};