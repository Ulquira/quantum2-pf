// Etiqueta: Drawer SaaS moderno para crear o editar Estados y SubEstados con switches tactiles
import React, { useEffect, useState } from 'react';
import { Save, SlidersHorizontal, X } from 'lucide-react';
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

  const toggles = [
    { label: 'Visible en APK Técnico', value: visibleApk, setter: setVisibleApk },
    { label: 'Obligar Foto Evidencia', value: requiereFoto, setter: setRequiereFoto },
    { label: 'Obligar Comentario', value: requiereComentario, setter: setRequiereComentario },
    { label: 'Estado Final de Visita', value: esFinal, setter: setEsFinal },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#F8F9FA] h-full shadow-2xl border-l border-slate-200/80 flex flex-col overflow-hidden sm:rounded-l-2xl pf-fade-in"
      >
        {/* Etiqueta: Cabecera blanca con acento superior rojo PeruFibra */}
        <div className="bg-white border-b border-slate-200/80 shrink-0">
          <div className="h-1 w-full bg-pf-red" />
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pf-red/10 text-pf-red flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <span className="font-bold text-base text-slate-900">
                {itemEditar ? 'Editar Estado' : 'Nuevo Estado'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Estado Padre
              </label>
              <input
                type="text"
                required
                list="lista-estados-padre"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                placeholder="Ej: REPROGRAMA"
                className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900"
              />
              <datalist id="lista-estados-padre">
                {estadosExistentes.map((est) => (
                  <option key={est} value={est} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                SubEstado
              </label>
              <input
                type="text"
                required
                value={subestado}
                onChange={(e) => setSubestado(e.target.value)}
                placeholder="Ej: CTO SATURADA"
                className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Orden</label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                  className="pf-input w-full px-3 py-2 text-xs font-mono font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vigencia
                </label>
                <select
                  value={activo}
                  onChange={(e) => setActivo(Number(e.target.value))}
                  className="pf-input w-full px-3 py-2 text-xs font-semibold text-slate-900"
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Color Indicador
            </h3>
            <div className="flex items-center gap-2.5">
              {COLORES_SUGERIDOS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorHex(c.hex)}
                  title={c.label}
                  className={`w-9 h-9 rounded-xl transition cursor-pointer ${
                    colorHex === c.hex ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reglas Operativas
            </h3>
            <div className="divide-y divide-slate-100">
              {toggles.map((item) => {
                const activoToggle = item.value === 1;
                return (
                  <div
                    key={item.label}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activoToggle}
                      onClick={() => item.setter(activoToggle ? 0 : 1)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        activoToggle ? 'bg-pf-red' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                          activoToggle ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="pf-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="pf-btn-primary inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};