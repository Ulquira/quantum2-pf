// Etiqueta: Tipos para las fases, evidencias en carrusel, incidencias y estados progresivos de la APK
export type TipoAtencionTitular = 'TITULAR' | 'ENCARGADO';

export type SeccionApkId =
  | 'FACHADA'
  | 'DOCUMENTO'
  | 'CTO'
  | 'INTERNO'
  | 'ACTIVACION'
  | 'MESH'
  | 'CLIENTE'
  | 'INCIDENCIA';

export interface SeccionFaseApk {
  id: SeccionApkId;
  titulo: string;
  tareasFoto: string[];
  usaEscanerOnt?: boolean;
  usaEscanerMesh?: boolean;
}

export interface EvidenciaItem {
  id_evidencia?: number;
  seccion: SeccionApkId;
  tipo_foto: string;
  url_archivo: string;
  fecha_subida?: string;
}