// Etiqueta: Modal movil de Finalizacion o Incidencia (Cancelado/Reprograma/Ausente) con evidencia obligatoria segun Configuracion
import React, { useState } from 'react';
import { X, CheckCircle2, Camera, Loader2 } from 'lucide-react';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';
import type { SeccionApkId } from '../types/apk.types';
import { comprimirImagenCamara } from '../utils/fasesApk';

const ESTADOS_INTERMEDIOS = ['PENDIENTE', 'PROGRAMADO', 'EN CAMINO', 'EN PROCESO'];

interface Props {
  abierto: boolean;
  modoInicial: 'FINALIZAR' | 'INCIDENCIA';
  catalogoApk: CatalogoEstado[];
  fotosPendientes: number;
  onClose: () => void;
  onSubirEvidenciaIncidencia: (
    seccion: SeccionApkId,
    tipoFoto: string,
    dataUrl: string
  ) => Promise<void>;
  onConfirmar: (datos: {
    Estado: string;
    SubEstado: string;
    Motivo: string;
    token_ingresado?: string;
  }) => Promise<void>;
}

export const CerrarOrdenApkModal: React.FC<Props> = ({
  abierto,
  modoInicial,
  catalogoApk,
  fotosPendientes,
  onClose,
  onSubirEvidenciaIncidencia,
  onConfirmar,
}) => {
  const estadosCierre = Array.from(
    new Set(
      catalogoApk
        .filter((c) => !ESTADOS_INTERMEDIOS.includes(c.estado.toUpperCase()))
        .map((c) => c.estado)
    )
  );

  const estadoDefault =
    modoInicial === 'FINALIZAR'
      ? 'FINALIZADO'
      : estadosCierre.find((e) => e !== 'FINALIZADO') || 'REPROGRAMA';

  const [estado, setEstado] = useState(estadoDefault);
  const subOpciones = catalogoApk.filter((c) => c.estado === estado);
  const [subEstado, setSubEstado] = useState(subOpciones[0]?.subestado || '');
  const [motivo, setMotivo] = useState('');
  const [fotosIncidencia, setFotosIncidencia] = useState<string[]>([]);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!abierto) return null;

  const esFinalizado = estado === 'FINALIZADO';
  const regla = subOpciones.find((s) => s.subestado === subEstado) || subOpciones[0];
  const exigeFotoIncidencia = !esFinalizado && regla?.requiere_foto === 1;
  const exigeNota = regla?.requiere_comentario === 1;

  const cambiarEstado = (nuevo: string) => {
    setEstado(nuevo);
    const primero = catalogoApk.find((c) => c.estado === nuevo);
    setSubEstado(primero?.subestado || '');
  };

  const capturarEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComprimiendo(true);
    try {
      const dataUrl = await comprimirImagenCamara(file);
      setFotosIncidencia((prev) => [...prev, dataUrl]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setComprimiendo(false);
      e.target.value = '';
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (esFinalizado && fotosPendientes > 0) {
      alert(`Faltan ${fotosPendientes} fotos en las fases de instalación antes de finalizar.`);
      return;
    }
    if (exigeFotoIncidencia && fotosIncidencia.length === 0) {
      alert(`El estado ${estado} requiere subir al menos 1 foto de evidencia.`);
      return;
    }

    setEnviando(true);
    try {
      // Subir fotos de sustento de incidencia (Cancelado, Ausente, Reprograma, SFT)
      for (let i = 0; i < fotosIncidencia.length; i++) {
        await onSubirEvidenciaIncidencia(
          'INCIDENCIA',
          `${estado} - EVIDENCIA ${i + 1}`,
          fotosIncidencia[i]
        );
      }

      await onConfirmar({
        Estado: estado,
        SubEstado: subEstado || regla?.subestado || '',
        Motivo: motivo,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center">
      <form
        onSubmit={enviar}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        <div className="px-5 py-3.5 bg-pf-red text-white flex items-center justify-between shrink-0">
          <span className="font-bold text-sm">
            {esFinalizado ? 'Finalizar Instalación' : 'Reportar Estado / Incidencia'}
          </span>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-sm overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => cambiarEstado(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:border-pf-red"
            >
              {estadosCierre.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">SubEstado</label>
            <select
              required
              value={subEstado || regla?.subestado || ''}
              onChange={(e) => setSubEstado(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-pf-red"
            >
              {subOpciones.map((s) => (
                <option key={s.id_catalogo} value={s.subestado}>
                  {s.subestado}
                </option>
              ))}
            </select>
          </div>

          {!esFinalizado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">
                  Evidencia Fotográfica {exigeFotoIncidencia ? '*' : ''}
                </span>
                <span className="text-[11px] font-bold text-pf-gray">
                  {fotosIncidencia.length} adjunta(s)
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {fotosIncidencia.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 shrink-0"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setFotosIncidencia((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 bg-black/65 text-white rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-pf-red/40 bg-pf-red/5 text-pf-red flex flex-col items-center justify-center gap-1 text-[10px] font-bold shrink-0 cursor-pointer">
                  {comprimiendo ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Foto</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={capturarEvidencia}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Observación {exigeNota ? '*' : ''}
            </label>
            <textarea
              rows={2}
              required={exigeNota}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalle técnico..."
              className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {enviando ? 'Guardando...' : 'Confirmar y Cerrar'}
          </button>
        </div>
      </form>
    </div>
  );
};