// Etiqueta: Lista minimalista de tareas con boton lateral de camara y tira desplegable de miniaturas + burbuja
import React, { useState } from 'react';
import { Camera, CheckCircle2, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { EvidenciaItem, SeccionApkId } from '../types/apk.types';
import { comprimirImagenCamara } from '../utils/fasesApk';

// Etiqueta: Formateador visual a tipo oracion conservando siglas tecnicas FTTH
const SIGLAS_TECNICAS: Record<string, string> = {
  cto: 'CTO',
  ont: 'ONT',
  pm: 'PM',
  sn: 'SN',
  mesh: 'Mesh',
};

const formatearNombreTarea = (texto: string): string => {
  const limpio = texto
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim();

  if (!limpio) return texto;

  const conSiglas = limpio.replace(/\b(cto|ont|pm|sn|mesh)\b/g, (m) => SIGLAS_TECNICAS[m] || m);
  return conSiglas.charAt(0).toUpperCase() + conSiglas.slice(1);
};

interface Props {
  seccion: SeccionApkId;
  tareas: string[];
  evidencias: EvidenciaItem[];
  bloqueado: boolean;
  onSubirFoto: (seccion: SeccionApkId, tipoFoto: string, dataUrl: string) => Promise<void>;
  onEliminarFoto?: (idEvidencia: number) => Promise<void>;
}

export const CarruselFotosFase: React.FC<Props> = ({
  seccion,
  tareas,
  evidencias,
  bloqueado,
  onSubirFoto,
  onEliminarFoto,
}) => {
  const [subiendoTarea, setSubiendoTarea] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<number | null>(null);
  const [vistaAmpliada, setVistaAmpliada] = useState<EvidenciaItem | null>(null);

  const manejarCapturaMultiple = async (
    tipoFoto: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;

    setSubiendoTarea(tipoFoto);
    try {
      for (const file of archivos) {
        const comprimida = await comprimirImagenCamara(file);
        await onSubirFoto(seccion, tipoFoto, comprimida);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubiendoTarea(null);
      e.target.value = '';
    }
  };

  const manejarEliminar = async (ev: EvidenciaItem) => {
    if (!ev.id_evidencia || !onEliminarFoto) return;
    setBorrandoId(ev.id_evidencia);
    try {
      await onEliminarFoto(ev.id_evidencia);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {tareas.map((tarea, idx) => {
          const fotosTarea = evidencias.filter(
            (ev) => ev.seccion === seccion && ev.tipo_foto === tarea
          );
          const cumplida = fotosTarea.length > 0;
          const cargando = subiendoTarea === tarea;

          return (
            <div
              key={tarea}
              className={`rounded-xl border px-3 py-2.5 transition ${
                cumplida
                  ? 'bg-white border-emerald-200'
                  : 'bg-neutral-50/70 border-neutral-200'
              }`}
            >
              {/* Fila compacta: Nombre completo legible a la izquierda + Boton camara a la derecha */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-start gap-2">
                  {cumplida ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <span className="text-[11px] font-bold text-pf-red shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-neutral-800 leading-snug break-words">
                    {formatearNombreTarea(tarea)}
                  </span>
                </div>

                {!bloqueado ? (
                  <label
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      cumplida
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-pf-red text-white hover:bg-pf-red-hover'
                    }`}
                  >
                    {cargando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{cumplida ? `${fotosTarea.length}` : 'Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => manejarCapturaMultiple(tarea, e)}
                      disabled={cargando}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-pf-gray">
                    {fotosTarea.length}
                  </span>
                )}
              </div>

              {/* Tira de miniaturas + burbuja "+" (solo se despliega cuando ya hay fotos) */}
              {cumplida && (
                <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {fotosTarea.map((ev, i) => {
                    const eliminando = ev.id_evidencia === borrandoId;
                    return (
                      <div
                        key={ev.id_evidencia || `${tarea}-${i}`}
                        className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100"
                      >
                        <img
                          src={ev.url_archivo}
                          alt={`${tarea} ${i + 1}`}
                          onClick={() => setVistaAmpliada(ev)}
                          className="w-full h-full object-cover cursor-pointer"
                        />

                        {!bloqueado && ev.id_evidencia && onEliminarFoto && (
                          <button
                            type="button"
                            disabled={eliminando}
                            onClick={() => manejarEliminar(ev)}
                            className="absolute top-0.5 right-0.5 bg-black/65 hover:bg-pf-red text-white p-0.5 rounded-full transition cursor-pointer"
                            title="Quitar foto"
                          >
                            {eliminando ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {!bloqueado && (
                    <label
                      title="Agregar otra foto"
                      className="shrink-0 w-11 h-11 rounded-full border-2 border-dashed border-pf-red/40 bg-pf-red/5 hover:bg-pf-red/10 text-pf-red flex items-center justify-center cursor-pointer transition"
                    >
                      {cargando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => manejarCapturaMultiple(tarea, e)}
                        disabled={cargando}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Visor ampliado al tocar cualquier miniatura */}
      {vistaAmpliada && (
        <div
          onClick={() => setVistaAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <div className="w-full max-w-md flex items-center justify-between text-white mb-3">
            <span className="text-xs font-semibold pr-3">
              {formatearNombreTarea(vistaAmpliada.tipo_foto)}
            </span>
            <button
              type="button"
              onClick={() => setVistaAmpliada(null)}
              className="p-1.5 rounded-full bg-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <img
            src={vistaAmpliada.url_archivo}
            alt={vistaAmpliada.tipo_foto}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
};