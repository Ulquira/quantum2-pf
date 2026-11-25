// Etiqueta: Normalizadores seguros para columnas JSON y verificador de inmutabilidad en dev_OPERACION
import type {
  DatosCtoOperacion,
  DatosEquiposOperacion,
  OrdenOperacion,
  TokensOperacion,
} from '../types/operacion.types';
import type { CtoCandidata, DatosComercialesXlsJson } from '../../clientes/types/cliente.types';
import type { CatalogoEstado } from '../../configuracion/types/configuracion.types';

const ESTADOS_CIERRE_BASE = [
  'FINALIZADO',
  'CANCELADO',
  'SIN FACILIDADES TÉCNICAS',
  'INASISTENCIA',
  'REPROGRAMA',
  'AUSENTE',
  'RESCATE',
];

const parseSeguro = <T>(val: unknown, fallback: T): T => {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return val as T;
};

export const obtenerDatosCto = (o: OrdenOperacion): DatosCtoOperacion =>
  parseSeguro<DatosCtoOperacion>(o.datos_cto, {});

export const obtenerDatosEquipos = (o: OrdenOperacion): DatosEquiposOperacion =>
  parseSeguro<DatosEquiposOperacion>(o.datos_equipos, {});

export const obtenerTokensOrden = (o: OrdenOperacion): TokensOperacion =>
  parseSeguro<TokensOperacion>(o.tokens, {});

export const obtenerCandidatasOrden = (o: OrdenOperacion): CtoCandidata[] => {
  const desdeCto = obtenerDatosCto(o).candidatas;
  if (Array.isArray(desdeCto)) return desdeCto;
  return parseSeguro<CtoCandidata[]>(o.ctos_candidatas, []);
};

export const obtenerComercialOrden = (o: OrdenOperacion): DatosComercialesXlsJson =>
  parseSeguro<DatosComercialesXlsJson>(o.datos_comerciales_xls, {});

// Etiqueta: Determina si una orden guardada ya esta cerrada y bloqueada contra edicion
export const esOrdenCerrada = (
  o: OrdenOperacion,
  catalogo: CatalogoEstado[] = []
): boolean => {
  if (Number(o.es_ultimo_cod) === 0 || Boolean(o.H_Fin)) return true;

  const est = (o.Estado || '').trim().toUpperCase();
  const sub = (o.SubEstado || '').trim().toUpperCase();

  if (catalogo.length > 0) {
    const coincidenciaExacta = catalogo.find(
      (c) => c.estado.toUpperCase() === est && (!sub || c.subestado.toUpperCase() === sub)
    );
    if (coincidenciaExacta) return coincidenciaExacta.es_final === 1;
  }

  return ESTADOS_CIERRE_BASE.includes(est);
};