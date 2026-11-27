// Etiqueta: Exportador ultraligero a CSV (UTF-8 con BOM + separador punto y coma para Excel Latinoamerica)
import type {
  ClienteUnico,
  CtoCandidata,
  DetallePredioJson,
  DatosComercialesXlsJson,
  ResumenGestionJson,
} from '../types/cliente.types';
import { obtenerModoMeshCliente } from '../utils/clienteJson';

// Etiqueta: Normalizador seguro de bloques JSON provenientes de MySQL
const parseJsonSeguro = <T>(valor: unknown, fallback: T): T => {
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

// Etiqueta: Escapado seguro de celdas CSV (comillas dobles, saltos de linea y punto y coma)
const escaparCeldaCsv = (valor: unknown): string => {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).replace(/\r?\n|\r/g, ' ').trim();
  if (texto.includes(';') || texto.includes('"') || texto.includes(',')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
};

export const exportarClientesCsv = (clientes: ClienteUnico[]) => {
  if (!clientes.length) return;

  // Etiqueta: Estructura plana completa (columnas SQL + JSON desglosado sin peso extra)
  const filas = clientes.map((c) => {
    const ctos = parseJsonSeguro<CtoCandidata[]>(c.ctos_candidatas, []);
    const predio = parseJsonSeguro<DetallePredioJson>(c.detalle_predio, {});
    const com = parseJsonSeguro<DatosComercialesXlsJson>(c.datos_comerciales_xls, {});
    const gestion = parseJsonSeguro<ResumenGestionJson>(c.resumen_gestion, {
      estado_operaciones: 'IMPORTADO',
      conteo_operaciones: 0,
      ultima_fecha_gestion: null,
      ultimo_motivo: null,
    });

    const cto1 = ctos[0] || {};
    const cto2 = ctos[1] || {};
    const cto3 = ctos[2] || {};

    return {
      valida_cod_pedido: c.valida_cod_pedido,
      IDclientes: c.IDclientes,
      id_contrato: c.id_contrato ?? '',
      idvisita: com.idvisita ?? '',
      dni_cliente: c.dni_cliente,
      nom_cliente: c.nom_cliente,
      telefono: c.telefono ?? '',
      telefono_alternativo: c.telefono_alternativo ?? '',
      correo_electronico: c.correo_electronico ?? '',
      Distrito: c.Distrito,
      Zona: c.Zona ?? '',
      Poligono: c.Poligono ?? '',
      direccion_cliente: c.direccion_cliente,
      coordenadas_direccion: c.coordenadas_direccion ?? '',
      tipo_vivienda: predio.tipo_vivienda ?? c.tipo ?? '',
      torre: predio.torre ?? '',
      nro_departamento: predio.nro_departamento ?? '',
      ubigeo: predio.ubigeo ?? '',
      cod_postal: predio.cod_postal ?? '',
      Campaña: c.Campaña ?? '',
      Paquete: c.Paquete ?? '',
      velocidad_contratada: com.velocidad_contratada ?? '',
      Mesh_modo: obtenerModoMeshCliente(c),
      svas: com.svas ?? '',
      Agencia: c.Agencia ?? '',
      tipificacion: com.tipificacion ?? '',
      estado_validacion: com.estado_validacion ?? '',
      comentario_comercial: com.comentario ?? '',
      comentario_validador: com.comentario_validador ?? '',
      cto1: cto1.cto ?? '',
      cto1_lat: cto1.lat ?? '',
      cto1_lng: cto1.lng ?? '',
      cto1_metraje: cto1.metraje ?? '',
      cto1_poste: cto1.poste ?? '',
      cto1_piso: cto1.piso ?? '',
      cto1_montante: cto1.montante ?? '',
      cto2: cto2.cto ?? '',
      cto2_lat: cto2.lat ?? '',
      cto2_lng: cto2.lng ?? '',
      cto2_metraje: cto2.metraje ?? '',
      cto3: cto3.cto ?? '',
      cto3_lat: cto3.lat ?? '',
      cto3_lng: cto3.lng ?? '',
      cto3_metraje: cto3.metraje ?? '',
      fecha_registro: c.fecha_registro ? c.fecha_registro.slice(0, 19).replace('T', ' ') : '',
      fecha_programacion: c.fecha_programacion ? c.fecha_programacion.slice(0, 10) : '',
      horario: c.horario ?? '',
      estado_operaciones: c.ultimo_estado_op || gestion.estado_operaciones || 'SIN PROGRAMAR',
      subestado_operaciones: c.ultimo_subestado_op ?? '',
      cuadrilla_actual: c.ultima_cuadrilla ?? '',
      conteo_operaciones: c.total_visitas ?? gestion.conteo_operaciones ?? 0,
      ultima_fecha_gestion:
        (c.ultima_fecha_gestion ? c.ultima_fecha_gestion.slice(0, 10) : '') ||
        (gestion.ultima_fecha_gestion ?? ''),
    };
  });

  // Etiqueta: Armado del contenido CSV y descarga con BOM UTF-8 (\uFEFF)
  const cabeceras = Object.keys(filas[0]);
  const lineasCsv = [
    cabeceras.join(';'),
    ...filas.map((fila) =>
      cabeceras.map((col) => escaparCeldaCsv(fila[col as keyof typeof fila])).join(';')
    ),
  ];

  const contenidoCsv = '\uFEFF' + lineasCsv.join('\r\n');
  const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const fechaHoy = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PeruFibra_Clientes_${fechaHoy}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};