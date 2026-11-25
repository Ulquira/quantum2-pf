// Etiqueta: Tipos para gestion de Usuarios, Roles, Partners y Tecnicos
export type RolUsuario = 'ADMIN' | 'SUPERVISOR' | 'ASESOR' | 'TECNICO' | 'PARTNER';

export interface UsuarioSistema {
  id_user: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string | null;
  rol: RolUsuario;
  contrata: string | null;
  cuadrilla: string | null;
  zona_distrito: string | null;
  activo: number;
  fecha_creacion?: string | null;
}

export interface UsuarioPayload {
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: RolUsuario;
  contrata: string;
  cuadrilla: string;
  zona_distrito: string;
  password?: string;
  activo: number;
}