// Etiqueta: Drawer SaaS moderno de Cliente con mapa interactivo de CTOs y copia de coordenadas
import React from 'react';
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  User,
  X,
} from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import {
  obtenerComercialCliente,
  obtenerCtosCliente,
  obtenerModoMeshCliente,
  obtenerPredioCliente,
  obtenerResumenCliente,
} from '../utils/clienteJson';
import { OperacionMapaCtos } from '../../operaciones/components/OperacionMapaCtos';

interface Props {
  cliente: ClienteUnico | null;
  onClose: () => void;
  onProgramar: (cliente: ClienteUnico) => void;
}

export const ClienteDetalleDrawer: React.FC<Props> = ({ cliente, onClose, onProgramar }) => {
  if (!cliente) return null;

  const ctos = obtenerCtosCliente(cliente).filter((c) => c.cto);
  const predio = obtenerPredioCliente(cliente);
  const comercial = obtenerComercialCliente(cliente);
  const conteoVisitas = Number(
    cliente.total_visitas ?? obtenerResumenCliente(cliente).conteo_operaciones ?? 0
  );
  const ultimoEstadoOp = (cliente.ultimo_estado_op || '').trim().toUpperCase();
  const modoMesh = obtenerModoMeshCliente(cliente);
  const estadoVal = (comercial.estado_validacion || 'APROBADO').toUpperCase();
  const esAprobado = estadoVal.includes('APROBADO');

  const coordenadasMapa =
    cliente.coordenadas_direccion ||
    (predio.latitud && predio.longitud ? `${predio.latitud},${predio.longitud}` : null);

  const googleMapsUrl = coordenadasMapa
    ? `https://www.google.com/maps?q=${coordenadasMapa}`
    : null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#F8F9FA] h-full shadow-2xl border-l border-slate-200/80 flex flex-col overflow-hidden sm:rounded-l-2xl pf-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Etiqueta: Cabecera blanca con acento superior rojo PeruFibra */}
        <div className="bg-white border-b border-slate-200/80 shrink-0">
          <div className="h-1 w-full bg-pf-red" />
          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  #{cliente.valida_cod_pedido}
                </span>
                {cliente.id_contrato && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {cliente.id_contrato}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    esAprobado
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20'
                  }`}
                >
                  {estadoVal}
                </span>
                {ultimoEstadoOp && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white">
                    {ultimoEstadoOp} · V{conteoVisitas}
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-700 truncate">
                {cliente.nom_cliente}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Etiqueta: Contenido scrolleable en tarjetas bento */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-pf-red" />
              Titular y Contacto
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">DNI</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {cliente.dni_cliente || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  ID Visita
                </span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {comercial.idvisita || cliente.IDclientes}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pf-red shrink-0" />
                <span className="font-mono font-semibold text-slate-800 truncate">
                  {cliente.telefono || '-'}
                  {cliente.telefono_alternativo ? ` / ${cliente.telefono_alternativo}` : ''}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 flex items-center gap-1.5 min-w-0">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-700 truncate">
                  {cliente.correo_electronico || '-'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-pf-red" />
                Ubicación y Predio
              </h3>
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pf-red/8 hover:bg-pf-red/15 text-pf-red font-bold transition"
                >
                  <MapPin className="w-3.5 h-3.5" /> Mapa <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Dirección · {cliente.Distrito}
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block leading-relaxed">
                {cliente.direccion_cliente}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Vivienda</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {predio.tipo_vivienda || cliente.tipo || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Torre / Dpto
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {predio.torre || '-'} / {predio.nro_departamento || '-'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Polígono</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block truncate">
                  {cliente.Poligono || cliente.Zona || '-'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-pf-red" />
              Servicio y Validación
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Paquete / Campaña
                  </span>
                  <span className="font-bold text-slate-900 text-sm block truncate">
                    {cliente.Paquete || cliente.Campaña || '-'}
                  </span>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    modoMesh === 'MESH CABLEADO'
                      ? 'bg-pf-yellow/25 text-slate-900'
                      : modoMesh === 'MESH'
                      ? 'bg-pf-red/10 text-pf-red'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {modoMesh}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Agenda</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {cliente.fecha_programacion ? cliente.fecha_programacion.slice(0, 10) : '-'}
                  {cliente.horario ? ` · ${cliente.horario}` : ''}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Canal</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {cliente.Agencia || comercial.formulario || '-'}
                </span>
              </div>

              {comercial.comentario_validador && (
                <div className="col-span-2 bg-pf-yellow/10 rounded-xl px-3.5 py-2.5 border border-pf-yellow/30">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">
                    Validador
                  </span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {comercial.comentario_validador}
                  </span>
                </div>
              )}

              {comercial.comentario && (
                <div className="col-span-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Comercial
                  </span>
                  <span className="text-slate-800 mt-0.5 block">{comercial.comentario}</span>
                </div>
              )}
            </div>
          </section>

          {coordenadasMapa || ctos.length > 0 ? (
            <OperacionMapaCtos
              coordenadasCliente={coordenadasMapa}
              nombreCliente={cliente.nom_cliente}
              ctos={ctos}
            />
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 text-slate-400 text-center">
              Sin coordenadas ni CTOs registradas
            </div>
          )}
        </div>

        {/* Etiqueta: Footer fijo limpio */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            Visitas: <strong className="font-mono text-slate-900">{conteoVisitas}</strong>
          </span>

          {ultimoEstadoOp === 'FINALIZADO' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Instalado
            </span>
          ) : ultimoEstadoOp === 'EN CAMINO' || ultimoEstadoOp === 'EN PROCESO' ? (
            <button
              type="button"
              onClick={() => onProgramar(cliente)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 bg-pf-yellow/20 hover:bg-pf-yellow/30 px-3.5 py-2 rounded-xl border border-pf-yellow/40 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-pf-red" />
              En campo (ver logs)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onProgramar(cliente)}
              className="pf-btn-primary inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              {conteoVisitas > 0 ? 'Reprogramar Orden' : 'Programar Orden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};