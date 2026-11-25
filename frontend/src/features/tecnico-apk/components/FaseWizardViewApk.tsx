// Etiqueta: Vista dedicada paso a paso por Fase con bloqueo secuencial hasta completar requisitos
import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ScanBarcode,
} from 'lucide-react';
import type { CtoCandidata } from '../../clientes/types/cliente.types';
import type {
  EvidenciaItem,
  SeccionApkId,
  SeccionFaseApk,
  TipoAtencionTitular,
} from '../types/apk.types';
import { CarruselFotosFase } from './CarruselFotosFase';
import { validarFaseCompleta as evaluarFaseCompleta } from '../utils/validarFaseApk';

interface Props {
  fases: SeccionFaseApk[];
  indiceFase: number;
  evidencias: EvidenciaItem[];
  bloqueado: boolean;
  estadoSync: 'IDLE' | 'SAVING' | 'SAVED' | 'OFFLINE_PENDING';
  pendientesOffline?: number;
  onReintentarSync?: () => void;
  atTitular: TipoAtencionTitular;
  candidatas: CtoCandidata[];
  ctoUso: string;
  puerto: string;
  rxCto: string;
  rxRoseta: string;
  metraje: string;
  snOnt: string;
  snMesh: string;
  onCambiarIndice: (nuevoIndice: number) => void;
  onVolverResumen: () => void;
  onAbrirFinalizar: () => void;
  onAbrirScanner: (target: 'ONT' | 'MESH') => void;
  onSubirFoto: (seccion: SeccionApkId, tipoFoto: string, dataUrl: string) => Promise<void>;
  onEliminarFoto?: (idEvidencia: number) => Promise<void>;
  onChangeAtTitular: (val: TipoAtencionTitular) => void;
  onChangeCtoUso: (val: string) => void;
  onChangePuerto: (val: string) => void;
  onChangeRxCto: (val: string) => void;
  onChangeRxRoseta: (val: string) => void;
  onChangeMetraje: (val: string) => void;
  onChangeSnOnt: (val: string) => void;
  onChangeSnMesh: (val: string) => void;
}

export const FaseWizardViewApk: React.FC<Props> = ({
  fases,
  indiceFase,
  evidencias,
  bloqueado,
  pendientesOffline = 0,
  onReintentarSync,
  atTitular,
  candidatas,
  ctoUso,
  puerto,
  rxCto,
  rxRoseta,
  metraje,
  snOnt,
  snMesh,
  onCambiarIndice,
  onVolverResumen,
  onAbrirFinalizar,
  onAbrirScanner,
  onSubirFoto,
  onEliminarFoto,
  onChangeAtTitular,
  onChangeCtoUso,
  onChangePuerto,
  onChangeRxCto,
  onChangeRxRoseta,
  onChangeMetraje,
  onChangeSnOnt,
  onChangeSnMesh,
}) => {
  const [modoOtraCto, setModoOtraCto] = useState(false);
  const faseActual = fases[indiceFase] || fases[0];
  const esCtoPersonalizada =
    modoOtraCto || (Boolean(ctoUso) && !candidatas.some((c) => c.cto === ctoUso));

  // Evaluador estricto: delega en funcion pura testeable
  const validarFaseCompleta = (f: SeccionFaseApk): { ok: boolean; faltantes: string[] } =>
    evaluarFaseCompleta(f, evidencias, {
      ctoUso,
      puerto,
      rxCto,
      rxRoseta,
      metraje,
      snOnt,
      snMesh,
    });

  const validacionActual = validarFaseCompleta(faseActual);
  const esUltimaFase = indiceFase === fases.length - 1;

  // Permite retroceder a fases ya completadas, pero impide saltar hacia adelante sin terminar las previas
  const puedeIrAFase = (idxDestino: number): boolean => {
    if (bloqueado || idxDestino <= indiceFase) return true;
    for (let i = 0; i < idxDestino; i++) {
      if (!validarFaseCompleta(fases[i]).ok) return false;
    }
    return true;
  };

  const fotosCargadasActual = faseActual.tareasFoto.filter((t) =>
    evidencias.some((ev) => ev.seccion === faseActual.id && ev.tipo_foto === t)
  ).length;

  return (
    <div className="pb-24 space-y-3.5">
      {/* Cabecera compacta del Wizard con barra de progreso */}
      <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-neutral-200 space-y-2 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onVolverResumen}
            className="inline-flex items-center gap-1 text-xs font-bold text-pf-red cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Ficha y Mapa
          </button>

          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              validacionActual.ok
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {validacionActual.ok && <CheckCircle2 className="w-3 h-3" />}
            {fotosCargadasActual}/{faseActual.tareasFoto.length} fotos
          </span>
        </div>

        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${fases.length}, minmax(0, 1fr))` }}>
          {fases.map((f, idx) => {
            const comp = validarFaseCompleta(f).ok;
            const activa = idx === indiceFase;
            const desbloqueada = puedeIrAFase(idx);

            return (
              <button
                key={f.id}
                type="button"
                disabled={!desbloqueada}
                onClick={() => desbloqueada && onCambiarIndice(idx)}
                className={`h-2 rounded-full transition-all ${
                  activa
                    ? 'bg-pf-red'
                    : comp
                    ? 'bg-emerald-500 cursor-pointer'
                    : 'bg-neutral-200 cursor-not-allowed'
                }`}
                title={f.titulo}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-900">
            {faseActual.titulo.replace(/^\d+\.\s*/, '')}{' '}
            <span className="text-pf-gray font-semibold">
              {indiceFase + 1}/{fases.length}
            </span>
          </h2>
        </div>
      </div>

      {/* Contenedor exclusivo de la Fase activa */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 space-y-4 shadow-xs">
        {faseActual.id === 'DOCUMENTO' && (
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-neutral-700">Persona que atiende</span>
            <div className="grid grid-cols-2 gap-2">
              {(['TITULAR', 'ENCARGADO'] as TipoAtencionTitular[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => onChangeAtTitular(tipo)}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    atTitular === tipo
                      ? 'bg-pf-red text-white border-pf-red'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                  }`}
                >
                  {tipo === 'TITULAR' ? 'Titular' : 'Encargado'}
                </button>
              ))}
            </div>
          </div>
        )}

        {faseActual.id === 'CTO' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">CTO *</label>
                <select
                  disabled={bloqueado}
                  value={esCtoPersonalizada ? '__OTRA__' : ctoUso}
                  onChange={(e) => {
                    if (e.target.value === '__OTRA__') {
                      setModoOtraCto(true);
                      onChangeCtoUso('');
                    } else {
                      setModoOtraCto(false);
                      onChangeCtoUso(e.target.value);
                    }
                  }}
                  className="w-full border border-neutral-300 rounded-xl px-2 py-2 text-xs font-bold bg-white focus:outline-none focus:border-pf-red"
                >
                  <option value="">Elegir...</option>
                  {candidatas.map((c, i) => (
                    <option key={i} value={c.cto || ''}>
                      {c.cto}
                    </option>
                  ))}
                  <option value="__OTRA__">Otra CTO...</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Puerto *</label>
                <input
                  type="text"
                  disabled={bloqueado}
                  placeholder="Ej: 4"
                  value={puerto}
                  onChange={(e) => onChangePuerto(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">RX CTO *</label>
                <input
                  type="text"
                  disabled={bloqueado}
                  placeholder="-18.4"
                  value={rxCto}
                  onChange={(e) => onChangeRxCto(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Metraje Cable (m) *
                </label>
                <input
                  type="number"
                  disabled={bloqueado}
                  placeholder="Ej: 65"
                  value={metraje}
                  onChange={(e) => onChangeMetraje(e.target.value)}
                  className="w-full border border-neutral-300 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
                />
              </div>
            </div>

            {esCtoPersonalizada && (
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Código de CTO manual *
                </label>
                <input
                  type="text"
                  disabled={bloqueado}
                  placeholder="Ej: WN-12A-2456043"
                  value={ctoUso}
                  onChange={(e) => onChangeCtoUso(e.target.value.toUpperCase())}
                  className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:border-pf-red"
                />
              </div>
            )}
          </div>
        )}

        {faseActual.id === 'INTERNO' && (
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              RX Roseta (dBm) *
            </label>
            <input
              type="text"
              disabled={bloqueado}
              placeholder="Ej: -19.1"
              value={rxRoseta}
              onChange={(e) => onChangeRxRoseta(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
            />
          </div>
        )}

        {faseActual.usaEscanerOnt && (
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Serial S/N ONT *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={bloqueado}
                placeholder="Escanee o digite S/N ONT"
                value={snOnt}
                onChange={(e) => onChangeSnOnt(e.target.value.toUpperCase())}
                className="flex-1 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
              />
              {!bloqueado && (
                <button
                  type="button"
                  onClick={() => onAbrirScanner('ONT')}
                  className="bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ScanBarcode className="w-4 h-4 text-pf-yellow" /> Escanear
                </button>
              )}
            </div>
          </div>
        )}

        {faseActual.usaEscanerMesh && (
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              Serial S/N MESH *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={bloqueado}
                placeholder="Escanee o digite S/N MESH"
                value={snMesh}
                onChange={(e) => onChangeSnMesh(e.target.value.toUpperCase())}
                className="flex-1 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-pf-red"
              />
              {!bloqueado && (
                <button
                  type="button"
                  onClick={() => onAbrirScanner('MESH')}
                  className="bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ScanBarcode className="w-4 h-4 text-pf-yellow" /> Escanear
                </button>
              )}
            </div>
          </div>
        )}

        <CarruselFotosFase
          seccion={faseActual.id}
          tareas={faseActual.tareasFoto}
          evidencias={evidencias}
          bloqueado={bloqueado}
          onSubirFoto={onSubirFoto}
          onEliminarFoto={onEliminarFoto}
        />

        {!bloqueado && !validacionActual.ok && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] font-semibold text-neutral-700">
            <Lock className="w-3.5 h-3.5 text-pf-red shrink-0" />
            <span>Pendiente para avanzar: {validacionActual.faltantes.join(' • ')}</span>
          </div>
        )}
      </div>

      {/* Navegacion secuencial inferior: Anterior / Siguiente bloqueado hasta terminar fase */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xs border-t border-neutral-200 p-3 flex items-center gap-2 max-w-lg mx-auto z-30">
        <button
          type="button"
          onClick={() =>
            indiceFase > 0 ? onCambiarIndice(indiceFase - 1) : onVolverResumen()
          }
          className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-800 font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {indiceFase > 0 ? 'Anterior' : 'Resumen'}
        </button>

        {!esUltimaFase ? (
          <button
            type="button"
            disabled={!bloqueado && !validacionActual.ok}
            onClick={() => onCambiarIndice(indiceFase + 1)}
            className="flex-1 bg-pf-red hover:bg-pf-red-hover disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Siguiente: {fases[indiceFase + 1]?.titulo}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          !bloqueado && (
            <button
              type="button"
              disabled={!validacionActual.ok}
              onClick={onAbrirFinalizar}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar Instalación</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};