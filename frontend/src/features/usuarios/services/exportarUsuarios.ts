// Etiqueta: Exportador CSV (UTF-8 con BOM) del padron de Usuarios, Partners y Tecnicos
import type { UsuarioSistema } from '../types/usuario.types';

const escaparCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const txt = String(val).replace(/\r?\n|\r/g, ' ').trim();
  if (txt.includes(';') || txt.includes('"') || txt.includes(',')) {
    return `"${txt.replace(/"/g, '""')}"`;
  }
  return txt;
};

export const exportarUsuariosCsv = (usuarios: UsuarioSistema[]) => {
  if (!usuarios.length) return;

  const filas = usuarios.map((u) => ({
    id_user: u.id_user,
    dni: u.dni,
    nombres: u.nombres,
    apellidos: u.apellidos,
    rol: u.rol,
    partner_contrata: u.contrata ?? '',
    cuadrilla: u.cuadrilla ?? '',
    zona_distrito: u.zona_distrito ?? '',
    telefono: u.telefono ?? '',
    correo: u.correo ?? '',
    estado: u.activo === 1 ? 'ACTIVO' : 'INACTIVO',
  }));

  const cols = Object.keys(filas[0]);
  const lineas = [
    cols.join(';'),
    ...filas.map((f) => cols.map((c) => escaparCsv(f[c as keyof typeof f])).join(';')),
  ];

  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PeruFibra_Usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};