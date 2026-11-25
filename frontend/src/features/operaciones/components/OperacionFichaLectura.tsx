// Etiqueta: Bloques informativos de Agenda, Titular y Reporte Tecnico en modo lectura
import React from 'react';
import { MapPin, ExternalLink, KeyRound, Wifi } from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import {
  obtenerCandidatasOrden,
  obtenerDatosCto,
  obtenerDatosEquipos,
  obtenerTokensOrden,
} from '../utils/operacionJson';

interface Props {
  orden: OrdenOperacion;
}

export const OperacionFichaLectura: React.FC<Props> = ({ orden }) => {
  const cto = obtenerDatosCto(orden);
  const eq = obtenerDatosEquipos(orden);
  const tokens = obtenerTokensOrden(orden);
  const candidatas = obtenerCandidatasOrden(orden).filter((c) => c.cto);

  const mapsUrl = orden.coordenadas_direccion
    ? `https://www.google.com/maps?q=${orden.coordenadas_direccion}`
    : null;

  return (
    <>
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Agenda y Titular</h3>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-2.5 text-xs">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-sm text-neutral-900">{orden.nom_cliente}</div>
              <div className="text-pf-gray mt-0.5">
                DNI: <b className="text-neutral-800">{orden.dni_cliente}</b> • Tel:{' '}
                <b className="text-neutral-800">{orden.telefono || '-'}</b>
                {orden.telefono_alternativo ? ` / Adic: ${orden.telefono_alternativo}` : ''}
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-pf-red hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" /> Mapa <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <span className="text-[11px] text-pf-gray block">Dirección ({orden.Distrito})</span>
            <span className="font-semibold text-neutral-800">{orden.direccion_cliente}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200">
            <div>
              <span className="text-[11px] text-pf-gray block">Fecha Programada</span>
              <span className="font-bold text-neutral-900">
                {orden.Fecha_Gestion ? orden.Fecha_Gestion.slice(0, 10) : '-'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-pf-gray block">Tramo</span>
              <span className="font-bold text-neutral-900">{orden.Tramo_Atencio || '-'}</span>
            </div>
            <div>
              <span className="text-[11px] text-pf-gray block">Plan / Mesh</span>
              <span className="font-semibold text-neutral-800">
                {orden.Mesh_modo || eq.mesh_modo || 'SIN MESH'}
              </span>
            </div>
          </div>

          {orden.Observaciones && (
            <div className="pt-2 border-t border-neutral-200">
              <span className="text-[11px] text-pf-gray block">Comentario de Programación</span>
              <span className="font-semibold text-neutral-900">{orden.Observaciones}</span>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-neutral-200">
            <span className="inline-flex items-center gap-1 font-bold text-neutral-800">
              <KeyRound className="w-3.5 h-3.5 text-pf-red" />
              Token Inicio: {tokens.token_inicio || '-'}
            </span>
            <span className="font-bold text-neutral-800">
              Token Valida: {tokens.token_valida || '-'}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">
          Reporte Técnico (APK)
        </h3>
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-pf-gray block">CTO / Puerto</span>
            <span className="font-bold text-neutral-900">
              {cto.cto_uso || '-'} {cto.puerto_utilizado ? `(P${cto.puerto_utilizado})` : ''}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-pf-gray block">Potencia RX CTO / Roseta</span>
            <span className="font-semibold text-neutral-800">
              {cto.rx_cto || '-'} / {cto.rx_roseta || '-'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-[11px] text-pf-gray block">Series ONT / Mesh</span>
            <span className="font-semibold text-neutral-800">
              {eq.sn_ont || '-'} / {eq.sn_mesh || '-'}
            </span>
          </div>
          {candidatas.length > 0 && (
            <div className="col-span-2 pt-2 border-t border-neutral-200 flex flex-wrap gap-1.5">
              {candidatas.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                >
                  <Wifi className="w-3 h-3 text-pf-red" />
                  {item.cto} {item.metraje ? `(${item.metraje}m)` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};