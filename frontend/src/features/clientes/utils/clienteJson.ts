// Etiqueta: Lector seguro de bloques JSON y regla de modo Mesh en Frontend
import type {
  ClienteUnico,
  CtoCandidata,
  DatosComercialesXlsJson,
  DetallePredioJson,
  ResumenGestionJson,
} from '../types/cliente.types';

export const parseJsonCampo = <T>(valor: unknown, fallback: T): T => {
  if (!valor) return fallback;
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor) as T;
    } catch {
      return fallback;
    }
  }
  return valor as T;
};

export const obtenerComercialCliente = (c: ClienteUnico): DatosComercialesXlsJson =>
  parseJsonCampo<DatosComercialesXlsJson>(c.datos_comerciales_xls, {});

export const obtenerPredioCliente = (c: ClienteUnico): DetallePredioJson =>
  parseJsonCampo<DetallePredioJson>(c.detalle_predio, {});

export const obtenerCtosCliente = (c: ClienteUnico): CtoCandidata[] =>
  parseJsonCampo<CtoCandidata[]>(c.ctos_candidatas, []);

export const obtenerResumenCliente = (c: ClienteUnico): ResumenGestionJson =>
  parseJsonCampo<ResumenGestionJson>(c.resumen_gestion, {
    estado_operaciones: 'IMPORTADO',
    conteo_operaciones: 0,
    ultima_fecha_gestion: null,
    ultimo_motivo: null,
  });

// Etiqueta: Evaluacion consistente de los 3 estados (MESH CABLEADO | MESH | SIN MESH)
export const obtenerModoMeshCliente = (
  c: ClienteUnico
): 'MESH CABLEADO' | 'MESH' | 'SIN MESH' => {
  const com = obtenerComercialCliente(c);
  const texto = `${com.comentario_validador || ''} ${com.comentario || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (texto.trim() !== '') {
    if (!texto.includes('MESH') || texto.includes('SIN MESH')) return 'SIN MESH';
    if (texto.includes('CABLEADO')) return 'MESH CABLEADO';
    return 'MESH';
  }

  if (c.Mesh_modo === 'MESH CABLEADO' || c.Mesh_modo === 'MESH') return c.Mesh_modo;
  return 'SIN MESH';
};