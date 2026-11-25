// Etiqueta: Exportador ultraligero CSV (UTF-8 con BOM) para dev_OPERACION
import type { OrdenOperacion } from '../types/operacion.types';
import {
  obtenerDatosCto,
  obtenerDatosEquipos,
  obtenerTokensOrden,
} from '../utils/operacionJson';

const escaparCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const txt = String(val).replace(/\r?\n|\r/g, ' ').trim();
  if (txt.includes(';') || txt.includes('"') || txt.includes(',')) {
    return `"${txt.replace(/"/g, '""')}"`;
  }
  return txt;
};

export const exportarOperacionesCsv = (ordenes: OrdenOperacion[]) => {
  if (!ordenes.length) return;

  const filas = ordenes.map((o) => {
    const cto = obtenerDatosCto(o);
    const eq = obtenerDatosEquipos(o);
    const tk = obtenerTokensOrden(o);

    return {
      IDoperacion: o.IDoperacion,
      valida_cod_pedido: o.valida_cod_pedido,
      visita_nro: o.Conteo_Operaciones,
      ultima_visita: o.es_ultimo_cod === 1 ? 'SI' : 'NO',
      Fecha_Gestion: o.Fecha_Gestion ? o.Fecha_Gestion.slice(0, 10) : '',
      Tramo_Atencio: o.Tramo_Atencio ?? '',
      Estado: o.Estado,
      SubEstado: o.SubEstado ?? '',
      Partner: o.Partner ?? '',
      Cuadrilla: o.Cuadrilla ?? '',
      Tecnico: o.nombre_tecnico || o.id_tecnico || 'SIN ASIGNAR',
      nom_cliente: o.nom_cliente ?? '',
      dni_cliente: o.dni_cliente ?? '',
      telefono: o.telefono ?? '',
      Distrito: o.Distrito ?? '',
      direccion_cliente: o.direccion_cliente ?? '',
      Paquete: o.Paquete || o.Campaña || '',
      Mesh_modo: o.Mesh_modo || eq.mesh_modo || 'SIN MESH',
      cto_uso: cto.cto_uso ?? '',
      puerto_utilizado: cto.puerto_utilizado ?? '',
      rx_cto: cto.rx_cto ?? '',
      rx_roseta: cto.rx_roseta ?? '',
      sn_ont: eq.sn_ont ?? '',
      sn_mesh: eq.sn_mesh ?? '',
      metraje_cable: eq.metraje_cable ?? '',
      token_inicio: tk.token_inicio ?? '',
      token_valida: tk.token_valida ?? '',
      Motivo: o.Motivo ?? '',
      Observaciones: o.Observaciones ?? '',
    };
  });

  const cols = Object.keys(filas[0]);
  const lineas = [
    cols.join(';'),
    ...filas.map((f) => cols.map((c) => escaparCsv(f[c as keyof typeof f])).join(';')),
  ];

  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PeruFibra_Operaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};