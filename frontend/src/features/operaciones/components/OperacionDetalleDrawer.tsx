// Etiqueta: Panel lateral de Operaciones con bloqueo total de edicion para ordenes cerradas
import React, { useEffect, useState } from 'react';
import { X, Save, Lock } from 'lucide-react';
import type { OrdenOperacion } from '../types/operacion.types';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';
import { MesaEstadoSection } from './MesaEstadoSection';
import { OperacionFichaLectura } from './OperacionFichaLectura';
import { esOrdenCerrada } from '../utils/operacionJson';
import { apiClient } from '../../../lib/apiClient';

interface CuadrillaCatalogo {
  cuadrilla: string;
  partner: string;
  id_user: string;
  nombre_tecnico: string;
}

interface Props {
  orden: OrdenOperacion | null;
  onClose: () => void;
  onActualizado: () => void;
}

export const OperacionDetalleDrawer: React.FC<Props> = ({
  orden,
  onClose,
  onActualizado,
}) => {
  const [partners, setPartners] = useState<string[]>([]);
  const [cuadrillasCatalogo, setCuadrillasCatalogo] = useState<CuadrillaCatalogo[]>([]);
  const [catalogoEstados, setCatalogoEstados] = useState<CatalogoEstado[]>([]);

  const [partnerSeleccionado, setPartnerSeleccionado] = useState('');
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState('');
  const [estadoMesa, setEstadoMesa] = useState('PENDIENTE');
  const [subEstadoMesa, setSubEstadoMesa] = useState('');
  const [motivoMesa, setMotivoMesa] = useState('');
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximoTramo, setProximoTramo] = useState('08:00 - 12:00');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!orden) return;

    const estInicial =
      orden.Estado === 'PROGRAMADA' ? 'PENDIENTE' : orden.Estado || 'PENDIENTE';
    const subInicial =
      orden.SubEstado === 'SIN_PARTNER'
        ? 'SIN ASIGNACIÓN DE PARTNER'
        : orden.SubEstado || '';

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    setEstadoMesa(estInicial);
    setSubEstadoMesa(subInicial);
    setMotivoMesa(orden.Motivo || '');
    setProximaFecha(manana.toISOString().slice(0, 10));
    setProximoTramo(orden.Tramo_Atencio || '08:00 - 12:00');
    setPartnerSeleccionado(orden.Partner || '');
    setCuadrillaSeleccionada(orden.Cuadrilla || '');

    Promise.all([
      apiClient
        .get<{ partners?: string[]; cuadrillas?: CuadrillaCatalogo[] }>('/usuarios/catalogo')
        .then((r) => r.data)
        .catch(() => ({ partners: [], cuadrillas: [] })),
      apiClient
        .get<CatalogoEstado[]>('/configuracion/estados', { params: { activos: 1 } })
        .then((r) => r.data)
        .catch(() => [] as CatalogoEstado[]),
    ])
      .then(([catUser, catEst]) => {
        setPartners(catUser.partners || []);
        setCuadrillasCatalogo(catUser.cuadrillas || []);
        setCatalogoEstados(Array.isArray(catEst) ? catEst : []);
      })
      .catch(() => {});
  }, [orden]);

  if (!orden) return null;

  const bloqueado = esOrdenCerrada(orden, catalogoEstados);

  const cuadrillasFiltradas = cuadrillasCatalogo.filter(
    (c) => c.partner.toUpperCase() === partnerSeleccionado.toUpperCase()
  );

  const tecnicoDeCuadrilla = cuadrillasFiltradas.find(
    (c) => c.cuadrilla === cuadrillaSeleccionada
  );

  const cambiarPartner = (nuevoPartner: string) => {
    setPartnerSeleccionado(nuevoPartner);
    const primeraCuadrilla = cuadrillasCatalogo.find(
      (c) => c.partner.toUpperCase() === nuevoPartner.toUpperCase()
    );
    const cuad = primeraCuadrilla?.cuadrilla || '';
    setCuadrillaSeleccionada(cuad);

    if (nuevoPartner && cuad && ['PENDIENTE', 'PROGRAMADA'].includes(estadoMesa)) {
      setEstadoMesa('PROGRAMADO');
      setSubEstadoMesa('ASIGNADO A PARTNER');
    }
  };

  const cambiarCuadrilla = (nuevaCuadrilla: string) => {
    setCuadrillaSeleccionada(nuevaCuadrilla);
    if (partnerSeleccionado && nuevaCuadrilla && ['PENDIENTE', 'PROGRAMADA'].includes(estadoMesa)) {
      setEstadoMesa('PROGRAMADO');
      setSubEstadoMesa('ASIGNADO A PARTNER');
    }
  };

  const cambiarEstadoMesa = (nuevoEstado: string) => {
    setEstadoMesa(nuevoEstado);
    const primerSub = catalogoEstados.find((c) => c.estado === nuevoEstado);
    setSubEstadoMesa(primerSub?.subestado || '');
  };

  const guardarGestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;

    const esReprograma = estadoMesa.toUpperCase() === 'REPROGRAMA';
    if (!esReprograma && partnerSeleccionado && !cuadrillaSeleccionada) {
      alert('Selecciona la Cuadrilla correspondiente al Partner elegido.');
      return;
    }
    if (esReprograma && !proximaFecha) {
      alert('Indica la próxima fecha de reprogramación.');
      return;
    }

    setGuardando(true);
    try {
      await apiClient.patch(`/operaciones/${orden.IDoperacion}`, {
        Partner: partnerSeleccionado || null,
        Cuadrilla: cuadrillaSeleccionada || null,
        id_tecnico: tecnicoDeCuadrilla?.id_user || null,
        Estado: estadoMesa,
        SubEstado: subEstadoMesa,
        Motivo: motivoMesa,
        proxima_fecha: esReprograma ? proximaFecha : null,
        proximo_tramo: esReprograma ? proximoTramo : null,
      });
      onActualizado();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-[1px]" onClick={onClose}>
      <form
        onSubmit={guardarGestion}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 bg-pf-red text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Pedido #{orden.valida_cod_pedido}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                Visita {orden.Conteo_Operaciones}
              </span>
              {bloqueado && (
                <span className="inline-flex items-center gap-1 text-xs bg-black/25 px-2 py-0.5 rounded font-bold">
                  <Lock className="w-3 h-3" /> Cerrado
                </span>
              )}
            </div>
            <div className="text-xs text-white/85 mt-0.5">{orden.IDoperacion}</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          <section
            className={`bg-white rounded-xl p-4 space-y-3 ${
              bloqueado ? 'border border-neutral-200' : 'border-2 border-pf-red/20'
            }`}
          >
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                bloqueado ? 'text-pf-gray' : 'text-pf-red'
              }`}
            >
              Asignación de Despacho
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Partner</label>
                <select
                  value={partnerSeleccionado}
                  disabled={bloqueado}
                  onChange={(e) => cambiarPartner(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-neutral-100 disabled:text-neutral-600 focus:outline-none focus:border-pf-red"
                >
                  <option value="">Sin asignar</option>
                  {partners.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Cuadrilla</label>
                <select
                  value={cuadrillaSeleccionada}
                  onChange={(e) => cambiarCuadrilla(e.target.value)}
                  disabled={bloqueado || !partnerSeleccionado}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-neutral-100 disabled:text-neutral-600 focus:outline-none focus:border-pf-red"
                >
                  <option value="">Sin cuadrilla</option>
                  {cuadrillaSeleccionada &&
                    !cuadrillasFiltradas.some((c) => c.cuadrilla === cuadrillaSeleccionada) && (
                      <option value={cuadrillaSeleccionada}>{cuadrillaSeleccionada}</option>
                    )}
                  {cuadrillasFiltradas.map((c) => (
                    <option key={`${c.partner}-${c.cuadrilla}`} value={c.cuadrilla}>
                      {c.cuadrilla} — {c.nombre_tecnico}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <MesaEstadoSection
            catalogo={catalogoEstados}
            estado={estadoMesa}
            subEstado={subEstadoMesa}
            motivoMesa={motivoMesa}
            proximaFecha={proximaFecha}
            proximoTramo={proximoTramo}
            bloqueado={bloqueado}
            onChangeEstado={cambiarEstadoMesa}
            onChangeSubEstado={setSubEstadoMesa}
            onChangeMotivo={setMotivoMesa}
            onChangeProximaFecha={setProximaFecha}
            onChangeProximoTramo={setProximoTramo}
          />

          <OperacionFichaLectura orden={orden} />
        </div>

        <div className="p-4 bg-white border-t border-neutral-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
          >
            Cerrar
          </button>
          {!bloqueado && (
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-1.5 bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-300 text-white text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {guardando ? 'Guardando...' : 'Guardar Gestión'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};