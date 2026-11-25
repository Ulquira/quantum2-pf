// Etiqueta: Panel lateral para crear o editar Estados, SubEstados y sus banderas de control
import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { CatalogoEstado, CatalogoEstadoPayload } from '../types/configuracion.types';
import { apiClient } from '../../../lib/apiClient';

const COLORES_SUGERIDOS = [
  { hex: '#D80319', label: 'Rojo PerúFibra' },
  { hex: '#F4BA00', label: 'Amarillo PerúFibra' },
  { hex: '#7E7E7E', label: 'Gris Corporativo' },
  { hex: '#10B981', label: 'Verde Conforme' },
];

interface Props {
  abierto: boolean;
  itemEditar: CatalogoEstado | null;
  estadosExistentes: string[];
  onClose: () => void;
  onGuardado: () => void;
}

export const EstadoFormDrawer: React.FC<Props> = ({
  abierto,
  itemEditar,
  estadosExistentes,
  onClose,
  onGuardado,
}) => {
  const [estado, setEstado] = useState('');
  const [subestado, setSubestado] = useState('');
  const [requiereFoto, setRequiereFoto] = useState(0);
  const [requiereComentario, setRequiereComentario] = useState(0);
  const [visibleApk, setVisibleApk] = useState(1);
  const [esFinal, setEsFinal] = useState(0);
  const [colorHex, setColorHex] = useState('#D80319');
  const [orden, setOrden] = useState(10);
  const [activo, setActivo] = useState(1);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (itemEditar) {
      setEstado(itemEditar.estado);
      setSubestado(itemEditar.subestado);
      setRequiereFoto(itemEditar.requiere_foto);
      setRequiereComentario(itemEditar.requiere_comentario);
      setVisibleApk(itemEditar.visible_apk);
      setEsFinal(itemEditar.es_final);
      setColorHex(itemEditar.color_hex || '#7E7E7E');
      setOrden(itemEditar.orden || 10);
      setActivo(itemEditar.activo ?? 1);
    } else {
      setEstado(estadosExistentes[0] || 'QUIEBRE');
      setSubestado('');
      setRequiereFoto(0);
      setRequiereComentario(1);
      setVisibleApk(1);
      setEsFinal(0);
      setColorHex('#D80319');
      setOrden(10);
      setActivo(1);
    }
  }, [itemEditar, abierto, estadosExistentes]);

  if (!abierto) return null;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const payload: CatalogoEstadoPayload = {
      modulo: 'OPERACION',
      estado,
      subestado,
      requiere_foto: requiereFoto,
      requiere_comentario: requiereComentario,
      visible_apk: visibleApk,
      es_final: esFinal,
      color_hex: colorHex,
      orden,
      activo,
    };

    try {
      if (itemEditar) {
        await apiClient.patch(`/configuracion/estados/${itemEditar.id_catalogo}`, payload);
      } else {
        await apiClient.post('/configuracion/estados', payload);
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
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 bg-pf-red text-white flex items-center justify-between shrink-0">
          <span className="font-bold text-base">
            {itemEditar ? 'Editar Parámetro' : 'Nuevo Estado / SubEstado'}
          </span>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Estado Padre</label>
              <input
                type="text"
                required
                list="lista-estados-padre"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                placeholder="Ej: QUIEBRE"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
              />
              <datalist id="lista-estados-padre">
                {estadosExistentes.map((est) => (
                  <option key={est} value={est} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">SubEstado</label>
              <input
                type="text"
                required
                value={subestado}
                onChange={(e) => setSubestado(e.target.value)}
                placeholder="Ej: CTO_SATURADA"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Orden</label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Vigencia</label>
                <select
                  value={activo}
                  onChange={(e) => setActivo(Number(e.target.value))}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-pf-red"
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Color Indicador</h3>
            <div className="flex items-center gap-2">
              {COLORES_SUGERIDOS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorHex(c.hex)}
                  title={c.label}
                  className={`w-8 h-8 rounded-lg border-2 transition cursor-pointer ${
                    colorHex === c.hex ? 'border-neutral-900 scale-105' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Condiciones de Control</h3>
            <div className="space-y-2 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-800">Visible en APK Técnico</span>
                <input
                  type="checkbox"
                  checked={visibleApk === 1}
                  onChange={(e) => setVisibleApk(e.target.checked ? 1 : 0)}
                  className="accent-pf-red w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-800">Obligar Foto Evidencia</span>
                <input
                  type="checkbox"
                  checked={requiereFoto === 1}
                  onChange={(e) => setRequiereFoto(e.target.checked ? 1 : 0)}
                  className="accent-pf-red w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-800">Obligar Comentario</span>
                <input
                  type="checkbox"
                  checked={requiereComentario === 1}
                  onChange={(e) => setRequiereComentario(e.target.checked ? 1 : 0)}
                  className="accent-pf-red w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-800">Estado Final de Visita</span>
                <input
                  type="checkbox"
                  checked={esFinal === 1}
                  onChange={(e) => setEsFinal(e.target.checked ? 1 : 0)}
                  className="accent-pf-red w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
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