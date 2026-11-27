// Etiqueta: Tarjetas bento de Agenda/Titular y Metricas Tecnicas FTTH
import React from 'react';
import {
  Calendar,
  Cpu,
  ExternalLink,
  KeyRound,
  MapPin,
  Phone,
  Router,
  User,
  Wifi,
} from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import {
  obtenerCandidatasOrden,
  obtenerDatosCto,
  obtenerDatosEquipos,
  obtenerTokensOrden,
} from '../utils/operacionJson';
import { OperacionMapaCtos } from './OperacionMapaCtos';

interface Props {
  orden: OrdenOperacion;
  seccion?: 'AGENDA' | 'TECNICO' | 'AMBAS';
}

export const OperacionFichaLectura: React.FC<Props> = ({ orden, seccion = 'AMBAS' }) => {
  const cto = obtenerDatosCto(orden);
  const eq = obtenerDatosEquipos(orden);
  const tokens = obtenerTokensOrden(orden);
  const candidatas = obtenerCandidatasOrden(orden).filter((c) => c.cto);

  const mapsUrl = orden.coordenadas_direccion
    ? `https://www.google.com/maps?q=${orden.coordenadas_direccion}`
    : null;

  const mostrarAgenda = seccion === 'AGENDA' || seccion === 'AMBAS';
  const mostrarTecnico = seccion === 'TECNICO' || seccion === 'AMBAS';

  return (
    <>
      {mostrarAgenda && (
        <>
        <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-pf-red" />
              Titular y Agenda
            </h3>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pf-red/8 hover:bg-pf-red/15 text-pf-red font-bold transition"
              >
                <MapPin className="w-3.5 h-3.5" /> Mapa <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-900">{orden.nom_cliente || '-'}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-mono tabular-nums">
              <span>DNI {orden.dni_cliente || '-'}</span>
              {orden.telefono && (
                <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                  <Phone className="w-3 h-3 text-pf-red" />
                  {orden.telefono}
                  {orden.telefono_alternativo ? ` / ${orden.telefono_alternativo}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Dirección · {orden.Distrito || '-'}
            </span>
            <span className="font-semibold text-slate-800 mt-0.5 block leading-relaxed">
              {orden.direccion_cliente || '-'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha
              </span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block tabular-nums">
                {orden.Fecha_Gestion ? orden.Fecha_Gestion.slice(0, 10) : '-'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Tramo</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block tabular-nums">
                {orden.Tramo_Atencio || '-'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Mesh</span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {orden.Mesh_modo || eq.mesh_modo || 'SIN MESH'}
              </span>
            </div>
          </div>

          {orden.Observaciones && (
            <div className="bg-pf-yellow/10 rounded-xl px-3.5 py-2.5 border border-pf-yellow/30">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">
                Observación de Programación
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {orden.Observaciones}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-[11px] tabular-nums">
              <KeyRound className="w-3.5 h-3.5 text-pf-red" />
              Inicio: {tokens.token_inicio || '-'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-[11px] tabular-nums">
              Valida: {tokens.token_valida || '-'}
            </span>
          </div>
        </section>

        <OperacionMapaCtos
          coordenadasCliente={orden.coordenadas_direccion}
          nombreCliente={orden.nom_cliente}
          ctos={candidatas}
          ctoUso={cto.cto_uso}
        />
        </>
      )}

      {mostrarTecnico && (
        <div className="space-y-4 text-xs">
          {/* Etiqueta: KPIs Opticos y Planta Externa */}
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-pf-red" />
              Parámetros Ópticos y Planta
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  CTO / Puerto
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block">
                  {cto.cto_uso || '—'}
                  {cto.puerto_utilizado ? (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-pf-red/10 text-pf-red">
                      P{cto.puerto_utilizado}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">RX CTO</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {cto.rx_cto ? `${cto.rx_cto} dBm` : '—'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  RX Roseta
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {cto.rx_roseta ? `${cto.rx_roseta} dBm` : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Etiqueta: Equipos Instalados y Metraje */}
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Router className="w-3.5 h-3.5 text-pf-red" />
              Equipos y Cableado
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">S/N ONT</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block break-all">
                  {eq.sn_ont || '—'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">S/N Mesh</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block break-all">
                  {eq.sn_mesh || '—'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Metraje</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {eq.metraje_cable ? `${eq.metraje_cable} m` : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Etiqueta: CTOs Candidatas */}
          {candidatas.length > 0 && (
            <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-pf-red" />
                CTOs Candidatas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {candidatas.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"
                  >
                    <span className="font-mono font-bold text-slate-800 truncate">{item.cto}</span>
                    {item.metraje && (
                      <span className="text-[11px] font-mono font-semibold text-slate-500 ml-2 shrink-0">
                        {item.metraje}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
};