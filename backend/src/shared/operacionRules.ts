import type { PoolConnection, Pool } from 'mysql2/promise';

export const ESTADOS_CIERRE_FALLBACK = new Set([
  'FINALIZADO',
  'CANCELADO',
  'SIN FACILIDADES TÉCNICAS',
  'INASISTENCIA',
  'REPROGRAMA',
  'AUSENTE',
  'RESCATE',
]);

export const esEstadoFinalOperacion = async (
  executor: PoolConnection | Pool,
  estado: string | null | undefined,
  subEstado?: string | null
): Promise<boolean> => {
  const estadoNorm = (estado || '').trim().toUpperCase();
  if (!estadoNorm) return false;

  const subNorm = (subEstado || '').trim().toUpperCase();
  const [rows] = await executor.query(
    `SELECT es_final
     FROM dev_CATALOGO_ESTADOS
     WHERE modulo = 'OPERACION'
       AND UPPER(estado) = ?
       AND (? = '' OR UPPER(subestado) = ?)
     ORDER BY es_final DESC
     LIMIT 1`,
    [estadoNorm, subNorm, subNorm]
  );

  const match = (rows as { es_final: number }[])[0];
  if (match !== undefined) {
    return Number(match.es_final) === 1;
  }

  return ESTADOS_CIERRE_FALLBACK.has(estadoNorm);
};
