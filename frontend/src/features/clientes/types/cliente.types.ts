// Etiqueta: Tipos completos para vista resumida y panel de detalle del cliente
export interface CtoCandidata {
  prioridad: number;
  cto: string | null;
  lat: string | number | null;
  lng: string | number | null;
  metraje: string | number | null;
  poste?: string | null;
  piso?: string | null;
  montante?: string | null;
}

export interface DetallePredioJson {
  latitud?: string | null;
  longitud?: string | null;
  ubigeo?: string | null;
  cod_postal?: string | null;
  torre?: string | null;
  nro_departamento?: string | null;
  tipo_vivienda?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  area_venta?: string | null;
}

export interface DatosComercialesXlsJson {
  idvisita?: string | null;
  dni_programador?: string | null;
  nom_programador?: string | null;
  tramo_horario?: string | null;
  svas?: string | null;
  cantidad_mesh?: string | null;
  instalacion_mesh?: string | null;
  velocidad_contratada?: string | null;
  tipificacion?: string | null;
  portabilidad?: string | null;
  formulario?: string | null;
  comentario?: string | null;
  comentario_validador?: string | null;
  estado_validacion?: string | null;
  tipo_validaciones?: string | null;
}

export interface ResumenGestionJson {
  estado_operaciones: string;
  conteo_operaciones: number;
  ultima_fecha_gestion: string | null;
  ultimo_motivo: string | null;
}

export interface ClienteUnico {
  valida_cod_pedido: string;
  IDclientes: string;
  id_contrato: string | null;
  dni_cliente: string;
  nom_cliente: string;
  telefono: string | null;
  telefono_alternativo: string | null;
  correo_electronico?: string | null;
  direccion_cliente: string;
  coordenadas_direccion?: string | null;
  Distrito: string;
  Zona: string | null;
  Poligono: string | null;
  tipo?: string | null;
  horario?: string | null;
  Campaña: string | null;
  Paquete: string | null;
  Mesh_modo: string | null;
  Agencia?: string | null;
  fecha_registro: string;
  fecha_programacion: string | null;
  ctos_candidatas: CtoCandidata[];
  detalle_predio?: DetallePredioJson | null;
  datos_comerciales_xls?: DatosComercialesXlsJson | null;
  resumen_gestion: ResumenGestionJson | null;
  ultimo_id_operacion?: string | null;
  ultimo_estado_op?: string | null;
  ultimo_subestado_op?: string | null;
  ultimo_partner?: string | null;
  ultima_cuadrilla?: string | null;
  ultima_fecha_gestion?: string | null;
  ultimo_tramo?: string | null;
  total_visitas?: number;
}

export interface TecnicoDisponible {
  id_user: string;
  dni: string;
  nombres: string;
  apellidos: string;
  contrata: string;
  cuadrilla: string;
  zona_distrito: string;
}