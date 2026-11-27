// Etiqueta: Validador puro de requisitos por fase (fotos, puerto 1-16, RX dBm, metraje y seriales)
import type { EvidenciaItem, SeccionFaseApk } from '../types/apk.types';

export interface ValoresTecnicosFaseApk {
  ctoUso: string;
  puerto: string;
  rxCto: string;
  rxRoseta: string;
  metraje: string;
  snOnt: string;
  snMesh: string;
}

export interface ResultadoValidacionFase {
  ok: boolean;
  faltantes: string[];
}

const RX_MIN_DBM = -35;
const RX_MAX_DBM = -5;

const parsearNumeroDecimal = (valor: string): number | null => {
  const limpio = valor.trim().replace(',', '.');
  if (!limpio) return null;
  const num = Number(limpio);
  return Number.isFinite(num) ? num : null;
};

const esPuertoValido = (valor: string): boolean => {
  const limpio = valor.trim();
  if (!/^\d+$/.test(limpio)) return false;
  const num = Number(limpio);
  return num >= 1 && num <= 16;
};

const esPotenciaRxValida = (valor: string): boolean => {
  const num = parsearNumeroDecimal(valor);
  if (num === null) return false;
  return num >= RX_MIN_DBM && num <= RX_MAX_DBM;
};

// Etiqueta: Evaluacion secuencial de campos tecnicos y evidencias fotograficas por fase
export const validarFaseCompleta = (
  fase: SeccionFaseApk,
  evidencias: EvidenciaItem[],
  valores: ValoresTecnicosFaseApk
): ResultadoValidacionFase => {
  const faltantes: string[] = [];

  if (fase.id === 'CTO') {
    if (!valores.ctoUso.trim()) {
      faltantes.push('CTO');
    }

    if (!valores.puerto.trim()) {
      faltantes.push('Puerto');
    } else if (!esPuertoValido(valores.puerto)) {
      faltantes.push('Puerto (1-16)');
    }

    if (!valores.rxCto.trim()) {
      faltantes.push('RX CTO');
    } else if (!esPotenciaRxValida(valores.rxCto)) {
      faltantes.push(`RX CTO (${RX_MIN_DBM} a ${RX_MAX_DBM} dBm)`);
    }

    const metrajeNum = parsearNumeroDecimal(valores.metraje);
    if (metrajeNum === null || metrajeNum <= 0) {
      faltantes.push('Metraje > 0');
    }
  }

  if (fase.id === 'INTERNO') {
    if (!valores.rxRoseta.trim()) {
      faltantes.push('RX Roseta');
    } else if (!esPotenciaRxValida(valores.rxRoseta)) {
      faltantes.push(`RX Roseta (${RX_MIN_DBM} a ${RX_MAX_DBM} dBm)`);
    }
  }

  if (fase.usaEscanerOnt && !valores.snOnt.trim()) {
    faltantes.push('S/N ONT');
  }

  if (fase.usaEscanerMesh && !valores.snMesh.trim()) {
    faltantes.push('S/N MESH');
  }

  const fotosFaltantes = fase.tareasFoto.filter(
    (tarea) => !evidencias.some((ev) => ev.seccion === fase.id && ev.tipo_foto === tarea)
  ).length;

  if (fotosFaltantes > 0) {
    faltantes.push(`${fotosFaltantes} foto${fotosFaltantes > 1 ? 's' : ''}`);
  }

  return {
    ok: faltantes.length === 0,
    faltantes,
  };
};