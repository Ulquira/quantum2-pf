// Etiqueta: Perfil de sesion autenticada para Web Admin y APK de Tecnicos
import type { RolUsuario } from '../../usuarios/types/usuario.types';

export interface SesionUsuario {
  id_user: string;
  dni: string;
  nombres: string;
  apellidos: string;
  rol: RolUsuario;
  contrata: string | null;
  cuadrilla: string | null;
  zona_distrito: string | null;
}