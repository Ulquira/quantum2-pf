// Etiqueta: Modal de Programacion en Clientes (Fecha, Tramo 8-12/12-4/4-8, Telefono Adicional y Comentario)
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Phone, MessageSquare, X } from 'lucide-react';
import type { ClienteUnico } from '../types/cliente.types';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  cliente: ClienteUnico | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TRAMOS_HORARIOS = [
  { value: '08:00 - 12:00', label: '08:00 - 12:00 (8am a 12pm)' },
  { value: '12:00 - 16:00', label: '12:00 - 16:00 (12pm a 4pm)' },
  { value: '16:00 - 20:00', label: '16:00 - 20:00 (4pm a 8pm)' },
];

export const ProgramarOrdenModal: React.FC<Props> = ({ cliente, onClose, onSuccess }) => {
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaGestion, setFechaGestion] = useState(hoy);
  const [tramo, setTramo] = useState('08:00 - 12:00');
  const [telefonoAdicional, setTelefonoAdicional] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setFechaGestion(cliente.fecha_programacion?.slice(0, 10) || hoy);
    setTramo('08:00 - 12:00');
    setTelefonoAdicional(cliente.telefono_alternativo || '');
    setComentario('');
  }, [cliente, hoy]);

  if (!cliente) return null;

  const confirmarProgramacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await apiClient.post('/operaciones/programar', {
        valida_cod_pedido: cliente.valida_cod_pedido,
        fecha_gestion: fechaGestion,
        tramo_atencion: tramo,
        telefono_adicional: telefonoAdicional,
        comentario_programacion: comentario,
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 bg-pf-red text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">Programar Visita</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium">
              #{cliente.valida_cod_pedido}
            </span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={confirmarProgramacion} className="p-5 space-y-4 text-sm">
          <div className="bg-neutral-50 px-3.5 py-2.5 rounded-lg border border-neutral-200">
            <div className="font-bold text-neutral-900">{cliente.nom_cliente}</div>
            <div className="text-xs text-pf-gray mt-0.5">
              Tel titular: <b className="text-neutral-800">{cliente.telefono || '-'}</b> • {cliente.Distrito}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pf-red" /> Fecha
              </label>
              <input
                type="date"
                required
                value={fechaGestion}
                onChange={(e) => setFechaGestion(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-pf-red" /> Tramo Horario
              </label>
              <select
                value={tramo}
                onChange={(e) => setTramo(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-pf-red"
              >
                {TRAMOS_HORARIOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-pf-red" /> Número Adicional (Opcional)
            </label>
            <input
              type="tel"
              placeholder="Ej: 999888777"
              value={telefonoAdicional}
              onChange={(e) => setTelefonoAdicional(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-pf-red" /> Comentario de Programación
            </label>
            <textarea
              rows={2}
              placeholder="Referencia, contacto o indicación de agenda..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pf-red"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white px-5 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {enviando ? 'Enviando...' : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};