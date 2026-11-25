import type { EvidenciaItem, SeccionFaseApk } from '../types/apk.types';

export interface CamposTecnicosFase {
  ctoUso: string;
  puerto: string;
  rxCto: string;
  rxRoseta: string;
  metraje: string;
  snOnt: string;
  snMesh: string;
}

export const validarFaseCompleta = (
  fase: SeccionFaseApk,
  evidencias: EvidenciaItem[],
  campos: CamposTecnicosFase
): { ok: boolean; faltantes: string[] } => {
  const faltantes: string[] = [];

  const fotosFaltantes = fase.tareasFoto.filter(
    (t) => !evidencias.some((ev) => ev.seccion === fase.id && ev.tipo_foto === t)
  );
  if (fotosFaltantes.length > 0) {
    faltantes.push(`${fotosFaltantes.length} foto(s)`);
  }

  if (fase.id === 'CTO') {
    if (!campos.ctoUso.trim()) faltantes.push('CTO');
    if (!campos.puerto.trim()) faltantes.push('Puerto');
    if (!campos.rxCto.trim()) faltantes.push('Potencia RX CTO');
    if (!campos.metraje.trim()) faltantes.push('Metraje');

  }
  if (fase.id === 'INTERNO') {
    if (!campos.rxRoseta.trim()) faltantes.push('Potencia RX Roseta');
  }
  if (fase.usaEscanerOnt && !campos.snOnt.trim()) {
    faltantes.push('Serial ONT');
  }
  if (fase.usaEscanerMesh && !campos.snMesh.trim()) {
    faltantes.push('Serial Mesh');
  }

  return { ok: faltantes.length === 0, faltantes };
};
