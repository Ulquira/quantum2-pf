// Etiqueta: Panel lateral deslizable con el detalle completo de la orden del cliente
import React from 'react';
import { X, MapPin, Phone, Mail, Wifi, CalendarPlus, ExternalLink } from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import {
  obtenerComercialCliente,
  obtenerCtosCliente,
  obtenerModoMeshCliente,
  obtenerPredioCliente,
  obtenerResumenCliente,
} from '../utils/clienteJson';

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
  const conteoVisitas = obtenerResumenCliente(cliente).conteo_operaciones || 0;

  const googleMapsUrl = cliente.coordenadas_direccion
    ? `https://www.google.com/maps?q=${cliente.coordenadas_direccion}`
    : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera fija del detalle */}
        <div className="px-6 py-4 bg-pf-red text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Pedido #{cliente.valida_cod_pedido}</span>
              {cliente.id_contrato && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">
                  Contrato {cliente.id_contrato}
                </span>
              )}
            </div>
            <div className="text-xs text-white/85 mt-0.5">{cliente.nom_cliente}</div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable por secciones limpias */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 1. Titular y Contacto */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Titular</h3>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-pf-gray block">DNI / Documento</span>
                <span className="font-bold text-neutral-900">{cliente.dni_cliente || '-'}</span>
              </div>
              <div>
                <span className="text-[11px] text-pf-gray block">ID Visita / Cliente</span>
                <span className="font-bold text-neutral-900">{comercial.idvisita || cliente.IDclientes}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pf-red shrink-0" />
                <span className="font-semibold text-neutral-800">
                  {cliente.telefono || '-'}
                  {cliente.telefono_alternativo ? ` / ${cliente.telefono_alternativo}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-pf-gray shrink-0" />
                <span className="text-xs text-neutral-700 truncate">
                  {cliente.correo_electronico || '-'}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Ubicacion y Predio */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Ubicación y Predio</h3>
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-pf-red hover:underline"
                >
                  <MapPin className="w-3.5 h-3.5" /> Mapa <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-3">
              <div>
                <span className="text-[11px] text-pf-gray block">Dirección</span>
                <span className="font-semibold text-neutral-900 leading-snug block">
                  {cliente.direccion_cliente}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-pf-gray block">Distrito</span>
                  <span className="font-bold text-neutral-800">{cliente.Distrito}</span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Vivienda</span>
                  <span className="font-semibold text-neutral-800">{predio.tipo_vivienda || cliente.tipo || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Torre / Dpto</span>
                  <span className="font-semibold text-neutral-800">
                    {predio.torre || '-'} / {predio.nro_departamento || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Polígono / Zona</span>
                  <span className="font-semibold text-neutral-800">{cliente.Poligono || cliente.Zona || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Ubigeo</span>
                  <span className="font-semibold text-neutral-800">{predio.ubigeo || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Coordenadas</span>
                  <span className="font-semibold text-neutral-800 truncate block">
                    {cliente.coordenadas_direccion || '-'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Plan Comercial y Validacion */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">Servicio y Validación</h3>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <span className="text-[11px] text-pf-gray block">Paquete / Campaña</span>
                <span className="font-bold text-sm text-neutral-900">
                  {cliente.Paquete || cliente.Campaña || '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pf-gray block">Velocidad / Mesh</span>
                <span className="font-semibold text-neutral-800">
                  {comercial.velocidad_contratada ? `${comercial.velocidad_contratada} Mbps • ` : ''}
                  {obtenerModoMeshCliente(cliente)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pf-gray block">Fecha Programación / Horario</span>
                <span className="font-semibold text-neutral-800">
                  {cliente.fecha_programacion ? cliente.fecha_programacion.slice(0, 10) : '-'} {cliente.horario ? `(${cliente.horario})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pf-gray block">Tipificación / Validación</span>
                <span className="font-semibold text-neutral-800">
                  {comercial.tipificacion || '-'} • {comercial.estado_validacion || 'APROBADO'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-pf-gray block">Canal / Área Venta</span>
                <span className="font-semibold text-neutral-800">{cliente.Agencia || comercial.formulario || '-'}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-neutral-200/80 space-y-2">
                <div>
                  <span className="text-[11px] text-pf-gray block">Comentario del Validador</span>
                  <span className="font-bold text-neutral-900">
                    {comercial.comentario_validador || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-pf-gray block">Comentario Comercial</span>
                  <span className="text-neutral-800">{comercial.comentario || '-'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. CTOs Candidatas */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pf-gray">CTOs Candidatas</h3>
            {ctos.length > 0 ? (
              <div className="space-y-2">
                {ctos.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-pf-red" />
                      <div>
                        <span className="font-bold text-neutral-900">CTO {item.prioridad}: {item.cto}</span>
                        <span className="block text-[11px] text-pf-gray">
                          {item.lat && item.lng ? `${item.lat}, ${item.lng}` : 'Sin coordenadas'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-900">{item.metraje ? `${item.metraje} m` : '-'}</span>
                      {(item.piso || item.montante) && (
                        <span className="block text-[11px] text-pf-gray">
                          Piso: {item.piso || '-'} | Mont: {item.montante || '-'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-pf-gray bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                Sin CTO registrada
              </div>
            )}
          </section>
        </div>

        {/* Pie fijo con accion principal */}
        <div className="p-4 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-pf-gray">
            Visitas generadas: <strong className="text-neutral-900">{conteoVisitas}</strong>
          </span>

          <button
            onClick={() => onProgramar(cliente)}
            className="inline-flex items-center gap-2 bg-pf-red hover:bg-pf-red-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            {conteoVisitas > 0 ? 'Reprogramar Orden' : 'Programar Orden'}
          </button>
        </div>
      </div>
    </div>
  );
};