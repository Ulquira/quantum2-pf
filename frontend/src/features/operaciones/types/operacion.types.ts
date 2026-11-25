// Etiqueta: Interfaces TypeScript para ordenes operativas en dev_OPERACION
import type { CtoCandidata, DatosComercialesXlsJson } from '../../clientes/types/cliente.types';

export interface DatosCtoOperacion {
  candidatas?: CtoCandidata[];
  cto_uso?: string | null;
  puerto_utilizado?: string | null;
  rx_cto?: string | null;
  rx_roseta?: string | null;
}

export interface DatosEquiposOperacion {
  mesh_modo?: string | null;
  sn_ont?: string | null;
  sn_mesh?: string | null;
  metraje_cable?: string | null;
}

export interface TokensOperacion {
  token_inicio?: string | null;
  token_valida?: string | null;
}

export interface OrdenOperacion {
  IDoperacion: string;
  IDclientes: string;
  valida_cod_pedido: string;
  Conteo_Operaciones: number;
  es_ultimo_cod: number;
  Estado: string;
  SubEstado: string | null;
  Partner: string | null;
  Cuadrilla: string | null;
  id_tecnico: string | null;
  nombre_tecnico?: string | null;
  F_Asignacion: string | null;
  Fecha_Gestion: string | null;
  Tramo_Atencio: string | null;
  H_Progra: string | null;
  H_Inicio: string | null;
  H_Fin: string | null;
  H_ultimo_movimiento: string | null;
  Motivo: string | null;
  Observaciones: string | null;
  datos_cto: DatosCtoOperacion | string | null;
  datos_equipos: DatosEquiposOperacion | string | null;
  tokens: TokensOperacion | string | null;
  nom_cliente: string | null;
  dni_cliente: string | null;
  telefono: string | null;
  telefono_alternativo: string | null;
  direccion_cliente: string | null;
  coordenadas_direccion: string | null;
  Distrito: string | null;
  Zona: string | null;
  Poligono: string | null;
  Paquete: string | null;
  Campaña: string | null;
  Mesh_modo: string | null;
  ctos_candidatas?: CtoCandidata[] | string | null;
  datos_comerciales_xls?: DatosComercialesXlsJson | string | null;
}