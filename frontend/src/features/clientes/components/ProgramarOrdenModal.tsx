// Etiqueta: Modal panoramico SaaS de Programacion con bloqueo automatico si el tecnico esta en campo
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CalendarPlus,
  Clock,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  X,
} from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import {
  obtenerComercialCliente,
  obtenerModoMeshCliente,
  obtenerResumenCliente,
} from '../utils/clienteJson';
import { ProgramarHistorialPanel } from './ProgramarHistorialPanel';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  cliente: ClienteUnico | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TRAMOS_HORARIOS = ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00'];

const obtenerHoyLocal = (): string => new Date().toLocaleDateString('en-CA');

export const ProgramarOrdenModal: React.FC<Props> = ({ cliente, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const hoy = obtenerHoyLocal();

  const [fechaGestion, setFechaGestion] = useState(hoy);
  const [tramo, setTramo] = useState('08:00 - 12:00');
  const [telefonoAdicional, setTelefonoAdicional] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [conteoReal, setConteoReal] = useState<number | null>(null);
  const [estadoReal, setEstadoReal] = useState<string | null>(null);

  useEffect(() => {
    if (!cliente) return;
    const fechaCli = cliente.fecha_programacion?.slice(0, 10) || '';
    setFechaGestion(fechaCli >= hoy ? fechaCli : hoy);
    setTramo('08:00 - 12:00');
    setTelefonoAdicional(cliente.telefono_alternativo || '');
    setComentario('');
    setConteoReal(null);
    setEstadoReal(null);
  }, [cliente, hoy]);

  if (!cliente) return null;

  const com = obtenerComercialCliente(cliente);
  const modoMesh = obtenerModoMeshCliente(cliente);
  const conteoBase = Number(
    cliente.total_visitas ?? obtenerResumenCliente(cliente).conteo_operaciones ?? 0
  );
  const vecesProgramado = conteoReal ?? conteoBase;

  const estadoActual = (estadoReal ?? cliente.ultimo_estado_op ?? '').trim().toUpperCase();
  const bloqueadoEnCampo =
    estadoActual === 'EN CAMINO' ||
    estadoActual === 'EN PROCESO' ||
    estadoActual === 'FINALIZADO';

  const confirmarProgramacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueadoEnCampo) return;

    setEnviando(true);
    try {
      await apiClient.post('/operaciones/programar', {
        valida_cod_pedido: cliente.valida_cod_pedido,
        fecha_gestion: fechaGestion,
        tramo_atencion: tramo,
        telefono_adicional: telefonoAdicional,
        comentario_programacion: comentario,
      });
      await queryClient.invalidateQueries({
        queryKey: ['cliente-historial', cliente.valida_cod_pedido],
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-[95vw] max-w-[1200px] lg:h-[82vh] lg:max-h-[820px] max-h-[92vh] overflow-hidden flex flex-col pf-fade-in"
      >
        {/* Etiqueta: Cabecera amplia con acento rojo PeruFibra */}
        <div className="border-b border-slate-200/80 shrink-0">
          <div className="h-1.5 w-full bg-pf-red" />
          <div className="px-7 py-5 flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  {vecesProgramado > 0 ? 'Reprogramar Visita' : 'Programar Visita'}
                </span>
                <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                  #{cliente.valida_cod_pedido}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    vecesProgramado > 0
                      ? 'bg-pf-yellow/25 text-slate-900 ring-1 ring-pf-yellow/50'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  }`}
                >
                  {vecesProgramado > 0
                    ? `${vecesProgramado} ${vecesProgramado === 1 ? 'programación previa' : 'programaciones previas'}`
                    : '1ra programación'}
                </span>
                {bloqueadoEnCampo && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-pf-red/10 text-pf-red ring-1 ring-pf-red/20">
                    <Lock className="w-3.5 h-3.5" /> {estadoActual}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-slate-600 truncate">
                {cliente.nom_cliente} · DNI {cliente.dni_cliente || '-'}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Etiqueta: Cuerpo en 2 columnas (5/12 Formulario + 7/12 Historial y Logs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          <form
            onSubmit={confirmarProgramacion}
            className="lg:col-span-5 p-7 flex flex-col justify-between gap-5 text-sm lg:overflow-y-auto"
          >
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                    <Phone className="w-4 h-4 text-pf-red" />
                    {cliente.telefono || '-'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700">
                    {cliente.Paquete || cliente.Campaña || 'FTTH'} · {modoMesh}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                  <MapPin className="w-4 h-4 text-pf-red shrink-0 mt-0.5" />
                  <span>
                    <b className="text-slate-900">{cliente.Distrito}:</b> {cliente.direccion_cliente}
                  </span>
                </div>

                {(com.comentario_validador || com.comentario) && (
                  <div className="pt-2.5 border-t border-slate-200/70 space-y-1.5 text-xs">
                    {com.comentario_validador && (
                      <div className="text-slate-800">
                        <b className="text-slate-500">Validador:</b> {com.comentario_validador}
                      </div>
                    )}
                    {com.comentario && (
                      <div className="text-slate-600">
                        <b className="text-slate-500">Comercial:</b> {com.comentario}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-pf-red" /> Fecha de Visita *
                  </label>
                  <input
                    type="date"
                    required
                    disabled={bloqueadoEnCampo}
                    value={fechaGestion}
                    onChange={(e) => setFechaGestion(e.target.value)}
                    className="pf-input w-full px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-pf-red" /> Tramo Horario *
                  </label>
                  <select
                    disabled={bloqueadoEnCampo}
                    value={tramo}
                    onChange={(e) => setTramo(e.target.value)}
                    className="pf-input w-full px-3 py-2.5 text-sm font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {TRAMOS_HORARIOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-pf-red" /> Teléfono Adicional
                </label>
                <input
                  type="tel"
                  disabled={bloqueadoEnCampo}
                  placeholder="Ej: 999888777"
                  value={telefonoAdicional}
                  onChange={(e) => setTelefonoAdicional(e.target.value)}
                  className="pf-input w-full px-3.5 py-2.5 text-sm font-mono text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-pf-red" /> Nota de Programación
                </label>
                <textarea
                  rows={4}
                  disabled={bloqueadoEnCampo}
                  placeholder="Referencia, contacto o indicación para despacho..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="pf-input w-full px-3.5 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="pf-btn-secondary px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                {bloqueadoEnCampo ? 'Cerrar' : 'Cancelar'}
              </button>
              {!bloqueadoEnCampo && (
                <button
                  type="submit"
                  disabled={enviando}
                  className="pf-btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  {enviando
                    ? 'Guardando...'
                    : vecesProgramado > 0
                    ? 'Confirmar Reprogramación'
                    : 'Confirmar Programación'}
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 min-h-0 flex flex-col">
            <ProgramarHistorialPanel
              codPedido={cliente.valida_cod_pedido}
              onTotalCargado={setConteoReal}
              onEstadoCargado={setEstadoReal}
            />
          </div>
        </div>
      </div>
    </div>
  );
};