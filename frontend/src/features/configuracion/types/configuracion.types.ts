// Etiqueta: Tipos para tablas maestras de control y parametros del sistema
export interface CatalogoEstado {
  id_catalogo: number;
  modulo: string;
  estado: string;
  subestado: string;
  requiere_foto: number;
  requiere_comentario: number;
  visible_apk: number;
  es_final: number;
  color_hex: string;
  orden: number;
  activo: number;
}

export interface CatalogoEstadoPayload {
  modulo: string;
  estado: string;
  subestado: string;
  requiere_foto: number;
  requiere_comentario: number;
  visible_apk: number;
  es_final: number;
  color_hex: string;
  orden: number;
  activo: number;
}