// Etiqueta: Galeria moderna de evidencias con filtros envolventes y visor Lightbox
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

interface EvidenciaOperacion {
  id_evidencia: number;
  seccion: string;
  tipo_foto: string;
  url_archivo: string;
  fecha_subida?: string | null;
}

interface Props {
  idOperacion: string;
}

const ORDEN_SECCIONES = [
  'FACHADA',
  'DOCUMENTO',
  'CTO',
  'INTERNO',
  'ACTIVACION',
  'CLIENTE',
  'INCIDENCIA',
];

const ETIQUETA_SECCION: Record<string, string> = {
  FACHADA: 'Fachada',
  DOCUMENTO: 'Documento',
  CTO: 'Externo',
  INTERNO: 'Interno',
  ACTIVACION: 'Activación',
  CLIENTE: 'Cliente',
  INCIDENCIA: 'Incidencia',
};

const formatearFecha = (valor?: string | null): string => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OperacionEvidenciasGallery: React.FC<Props> = ({ idOperacion }) => {
  const [seccionActiva, setSeccionActiva] = useState<string>('TODAS');
  const [indiceVisor, setIndiceVisor] = useState<number | null>(null);

  const { data: evidencias = [], isLoading } = useQuery({
    queryKey: ['operacion-evidencias', idOperacion],
    queryFn: async () => {
      const { data } = await apiClient.get<EvidenciaOperacion[]>(
        `/apk/ordenes/${encodeURIComponent(idOperacion)}/evidencias`
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(idOperacion),
  });

  useEffect(() => {
    setSeccionActiva('TODAS');
    setIndiceVisor(null);
  }, [idOperacion]);

  const seccionesDisponibles = useMemo(() => {
    const presentes = Array.from(new Set(evidencias.map((e) => e.seccion)));
    return presentes.sort((a, b) => {
      const ia = ORDEN_SECCIONES.indexOf(a);
      const ib = ORDEN_SECCIONES.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [evidencias]);

  const filtradas = useMemo(
    () =>
      seccionActiva === 'TODAS'
        ? evidencias
        : evidencias.filter((e) => e.seccion === seccionActiva),
    [evidencias, seccionActiva]
  );

  useEffect(() => {
    if (indiceVisor === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndiceVisor(null);
      if (e.key === 'ArrowRight') {
        setIndiceVisor((i) => (i === null ? null : (i + 1) % filtradas.length));
      }
      if (e.key === 'ArrowLeft') {
        setIndiceVisor((i) =>
          i === null ? null : (i - 1 + filtradas.length) % filtradas.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [indiceVisor, filtradas.length]);

  const fotoActual = indiceVisor !== null ? filtradas[indiceVisor] : null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200/80 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-pf-red" />
      </div>
    );
  }

  if (evidencias.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200/80 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Camera className="w-6 h-6" />
        <span className="text-xs font-semibold">Sin evidencias registradas</span>
      </div>
    );
  }

  return (
    <section className="space-y-3.5">
      {/* Etiqueta: Filtros por fase en flex-wrap sin cortes */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setSeccionActiva('TODAS');
            setIndiceVisor(null);
          }}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
            seccionActiva === 'TODAS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          Todas · {evidencias.length}
        </button>

        {seccionesDisponibles.map((sec) => {
          const count = evidencias.filter((e) => e.seccion === sec).length;
          const activa = seccionActiva === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => {
                setSeccionActiva(sec);
                setIndiceVisor(null);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                activa
                  ? 'bg-pf-red text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-pf-red/40'
              }`}
            >
              {ETIQUETA_SECCION[sec] || sec} · {count}
            </button>
          );
        })}
      </div>

      {/* Etiqueta: Grilla de tarjetas fotograficas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtradas.map((ev, idx) => (
          <button
            key={ev.id_evidencia}
            type="button"
            onClick={() => setIndiceVisor(idx)}
            className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-pf-red/40 hover:shadow-md transition-all text-left cursor-pointer"
          >
            <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
              <img
                src={ev.url_archivo}
                alt={ev.tipo_foto}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wide">
                {ETIQUETA_SECCION[ev.seccion] || ev.seccion}
              </span>
            </div>
            <div className="px-2.5 py-2">
              <div className="text-[11px] font-semibold text-slate-800 truncate">
                {ev.tipo_foto}
              </div>
              {ev.fecha_subida && (
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                  {formatearFecha(ev.fecha_subida)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Etiqueta: Visor Lightbox ampliado */}
      {fotoActual && indiceVisor !== null && (
        <div
          onClick={() => setIndiceVisor(null)}
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-xs flex flex-col items-center justify-between p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between gap-3 text-white"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-pf-red text-[10px] font-bold uppercase">
                  {ETIQUETA_SECCION[fotoActual.seccion] || fotoActual.seccion}
                </span>
                <span className="text-xs font-bold truncate">{fotoActual.tipo_foto}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                {indiceVisor + 1} / {filtradas.length}
                {fotoActual.fecha_subida ? ` · ${formatearFecha(fotoActual.fecha_subida)}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fotoActual.url_archivo}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Abrir original"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIndiceVisor(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-pf-red text-white transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center my-4"
          >
            {filtradas.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setIndiceVisor((indiceVisor - 1 + filtradas.length) % filtradas.length)
                }
                className="absolute left-0 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={fotoActual.url_archivo}
              alt={fotoActual.tipo_foto}
              className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />

            {filtradas.length > 1 && (
              <button
                type="button"
                onClick={() => setIndiceVisor((indiceVisor + 1) % filtradas.length)}
                className="absolute right-0 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="h-2" />
        </div>
      )}
    </section>
  );
};