// Etiqueta: Tabla minimalista de Estados, SubEstados y reglas operativas (Foto, Comentario, APK, Cierre)
import React from 'react';
import { Camera, MessageSquare, Smartphone, CheckCircle2, ChevronRight } from 'lucide-react';
import type { CatalogoEstado } from '../types/configuracion.types';

interface Props {
  items: CatalogoEstado[];
  onSelect: (item: CatalogoEstado) => void;
  onToggleActivo: (item: CatalogoEstado) => void;
}

export const EstadosTable: React.FC<Props> = ({ items, onSelect, onToggleActivo }) => {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-pf-gray bg-neutral-50/70">
            <th className="py-3 px-4">Orden</th>
            <th className="py-3 px-4">Estado</th>
            <th className="py-3 px-4">SubEstado</th>
            <th className="py-3 px-4">Reglas APK / Flujo</th>
            <th className="py-3 px-4">Vigencia</th>
            <th className="py-3 px-4 text-right">Editar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map((item) => {
            const esActivo = item.activo === 1;

            return (
              <tr
                key={item.id_catalogo}
                onClick={() => onSelect(item)}
                className="hover:bg-neutral-50 transition cursor-pointer group"
              >
                <td className="py-3 px-4 text-xs font-bold text-pf-gray whitespace-nowrap">
                  #{item.orden}
                </td>

                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 font-bold text-xs text-neutral-900">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color_hex || '#7E7E7E' }}
                    />
                    {item.estado}
                  </span>
                </td>

                <td className="py-3 px-4 font-bold text-neutral-800 text-xs whitespace-nowrap">
                  {item.subestado}
                </td>

                <td className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.visible_apk === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] font-semibold">
                        <Smartphone className="w-3 h-3 text-pf-red" /> APK
                      </span>
                    )}
                    {item.requiere_foto === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pf-red/10 text-pf-red text-[11px] font-bold">
                        <Camera className="w-3 h-3" /> Foto
                      </span>
                    )}
                    {item.requiere_comentario === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pf-yellow/25 text-neutral-900 text-[11px] font-bold">
                        <MessageSquare className="w-3 h-3" /> Nota
                      </span>
                    )}
                    {item.es_final === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Cierre
                      </span>
                    )}
                  </div>
                </td>

                <td
                  className="py-3 px-4 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleActivo(item)}
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