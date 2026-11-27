import { Router } from 'express';
import { dbPool } from '../../config/db';
import {
  calcularModoMesh,
  limpiarTextoXls,
  obtenerCampoXls,
  parsearFechaXls,
} from '../../shared/xlsUtils';

export const clientesRouter = Router();

const CLIENTES_FROM_ULTIMA_OP = `
  FROM dev_CLIENTES c
  LEFT JOIN (
    SELECT
      valida_cod_pedido,
      SUBSTRING_INDEX(
        GROUP_CONCAT(IDoperacion ORDER BY es_ultimo_cod DESC, Conteo_Operaciones DESC SEPARATOR '||'),
        '||',
        1
      ) AS ultima_id_op,
      COUNT(*) AS total_ops
    FROM dev_OPERACION
    GROUP BY valida_cod_pedido
  ) uo ON uo.valida_cod_pedido = c.valida_cod_pedido
  LEFT JOIN dev_OPERACION o ON o.IDoperacion = uo.ultima_id_op
`;

const CLIENTES_LIST_SELECT = `
  c.valida_cod_pedido, c.IDclientes, c.id_contrato, c.dni_cliente, c.nom_cliente,
  c.telefono, c.telefono_alternativo, c.correo_electronico, c.direccion_cliente,
  c.coordenadas_direccion, c.Distrito, c.Zona, c.Poligono, c.tipo, c.horario,
  c.Campaña, c.Paquete, c.Mesh_modo, c.Agencia, c.fecha_registro, c.fecha_programacion,
  c.ctos_candidatas, c.detalle_predio,
  JSON_REMOVE(c.datos_comerciales_xls, '$.fila_original_completa') AS datos_comerciales_xls,
  c.resumen_gestion,
  o.IDoperacion AS ultimo_id_operacion,
  o.Estado AS ultimo_estado_op,
  o.SubEstado AS ultimo_subestado_op,
  o.Partner AS ultimo_partner,
  o.Cuadrilla AS ultima_cuadrilla,
  o.Fecha_Gestion AS ultima_fecha_gestion,
  o.Tramo_Atencio AS ultimo_tramo,
  COALESCE(uo.total_ops, o.Conteo_Operaciones, 0) AS total_visitas
`;

clientesRouter.get('/', async (req, res) => {
  const pageRaw = req.query.page;
  const esPaginado = pageRaw !== undefined;
  const page = Math.max(1, Number(pageRaw || 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || (esPaginado ? 50 : 500)) || 50));
  const offset = (page - 1) * limit;

  const q = String(req.query.q || '').trim();
  const distrito = String(req.query.distrito || '').trim();
  const validacion = String(req.query.validacion || '').trim().toUpperCase();
  const estado = String(req.query.estado || '').trim().toUpperCase();
  const fechaDesde = String(req.query.fecha_desde || '').trim().slice(0, 10);
  const fechaHasta = String(req.query.fecha_hasta || '').trim().slice(0, 10);

  const where: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const like = `%${q}%`;
    where.push(`(
      c.nom_cliente LIKE ?
      OR c.dni_cliente LIKE ?
      OR c.valida_cod_pedido LIKE ?
      OR c.Mesh_modo LIKE ?
      OR o.Cuadrilla LIKE ?
      OR o.Estado LIKE ?
      OR JSON_UNQUOTE(JSON_EXTRACT(c.datos_comerciales_xls, '$.comentario')) LIKE ?
      OR JSON_UNQUOTE(JSON_EXTRACT(c.datos_comerciales_xls, '$.comentario_validador')) LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like);
  }

  if (distrito && distrito !== 'TODOS') {
    where.push('c.Distrito = ?');
    params.push(distrito);
  }

  if (validacion && validacion !== 'TODOS') {
    where.push(
      "UPPER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.datos_comerciales_xls, '$.estado_validacion')), ''))) = ?"
    );
    params.push(validacion);
  }

  if (estado && estado !== 'TODOS') {
    if (estado === 'SIN_PROGRAMAR') {
      where.push('o.IDoperacion IS NULL');
    } else if (estado === 'PROGRAMADO_CUALQUIERA') {
      where.push('o.IDoperacion IS NOT NULL');
    } else if (estado === 'EN_GESTION') {
      where.push(
        "UPPER(COALESCE(o.Estado, '')) IN ('PENDIENTE', 'PROGRAMADO', 'EN CAMINO', 'EN PROCESO', 'REGESTION')"
      );
    } else {
      where.push("UPPER(TRIM(COALESCE(o.Estado, ''))) = ?");
      params.push(estado);
    }
  }

  if (fechaDesde) {
    where.push('DATE(COALESCE(o.Fecha_Gestion, c.fecha_programacion, c.fecha_registro)) >= ?');
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    where.push('DATE(COALESCE(o.Fecha_Gestion, c.fecha_programacion, c.fecha_registro)) <= ?');
    params.push(fechaHasta);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [rows] = await dbPool.query(
      `SELECT ${CLIENTES_LIST_SELECT}
       ${CLIENTES_FROM_ULTIMA_OP}
       ${whereSql}
       ORDER BY c.fecha_registro DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (!esPaginado) {
      return res.json(rows);
    }

    const [[countRows], [distRows], [valRows], [estOpRows]] = await Promise.all([
      dbPool.query(`SELECT COUNT(*) AS total ${CLIENTES_FROM_ULTIMA_OP} ${whereSql}`, params),
      dbPool.query(
        "SELECT DISTINCT Distrito FROM dev_CLIENTES WHERE Distrito IS NOT NULL AND TRIM(Distrito) <> '' ORDER BY Distrito ASC"
      ),
      dbPool.query(
        `SELECT DISTINCT UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(datos_comerciales_xls, '$.estado_validacion')))) AS estado_val
         FROM dev_CLIENTES
         WHERE JSON_EXTRACT(datos_comerciales_xls, '$.estado_validacion') IS NOT NULL
         HAVING estado_val IS NOT NULL AND estado_val <> '' AND estado_val <> 'NULL'
         ORDER BY estado_val ASC`
      ),
      dbPool.query(
        `SELECT DISTINCT UPPER(TRIM(Estado)) AS estado_op
         FROM dev_OPERACION
         WHERE es_ultimo_cod = 1 AND Estado IS NOT NULL AND TRIM(Estado) <> ''
         ORDER BY estado_op ASC`
      ),
    ]);

    const total = Number((countRows as { total: number }[])[0]?.total || 0);
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filtros: {
        distritos: (distRows as { Distrito: string }[]).map((r) => r.Distrito),
        estadosValidacion: (valRows as { estado_val: string }[]).map((r) => r.estado_val),
        estadosOperacion: (estOpRows as { estado_op: string }[]).map((r) => r.estado_op),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Etiqueta: Historial de programaciones previas y logs de movimientos por codigo de pedido
clientesRouter.get('/:codPedido/historial', async (req, res) => {
  const codPedido = String(req.params.codPedido || '').trim();
  if (!codPedido) return res.status(400).json({ error: 'Código de pedido requerido' });

  try {
    const [[visitasRows], [logsRows]] = await Promise.all([
      dbPool.query(
        `SELECT
          o.IDoperacion,
          o.Conteo_Operaciones,
          o.es_ultimo_cod,
          o.Estado,
          o.SubEstado,
          o.Partner,
          o.Cuadrilla,
          o.Fecha_Gestion,
          o.Tramo_Atencio,
          o.Motivo,
          o.Observaciones,
          o.H_Progra,
          o.H_Fin,
          CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre_tecnico
         FROM dev_OPERACION o
         LEFT JOIN dev_USER u ON o.id_tecnico = u.id_user
         WHERE o.valida_cod_pedido = ?
         ORDER BY o.Conteo_Operaciones DESC, o.IDoperacion DESC`,
        [codPedido]
      ),
      dbPool
        .query(
          `SELECT l.*, o.Conteo_Operaciones
           FROM dev_OPERACION_LOGS l
           LEFT JOIN dev_OPERACION o ON l.IDoperacion = o.IDoperacion
           WHERE l.valida_cod_pedido = ?
             AND l.accion NOT IN ('EVIDENCIA_SUBIDA', 'EVIDENCIA_ELIMINADA')
           ORDER BY l.fecha_evento DESC, l.id_log DESC`,
          [codPedido]
        )
        .catch(() => [[]]),
    ]);

    const visitas = Array.isArray(visitasRows) ? visitasRows : [];
    const logs = Array.isArray(logsRows) ? logsRows : [];

    res.json({
      total_programaciones: visitas.length,
      visitas,
      logs,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

clientesRouter.get('/:codPedido', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM dev_CLIENTES WHERE valida_cod_pedido = ? LIMIT 1',
      [req.params.codPedido]
    );
    const cliente = (rows as Record<string, unknown>[])[0];
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

clientesRouter.post('/importar', async (req, res) => {
  const registros: Record<string, unknown>[] = req.body.registros || [];
  if (!Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: 'El archivo .XLS esta vacio o no tiene filas validas' });
  }

  const filasPreparadas: unknown[][] = [];

  for (const r of registros) {
    const codPedido = obtenerCampoXls(r, ['valida_cod_pedido', 'IDclientes', 'id_contrato']);
    if (!codPedido) continue;

    const idContrato = limpiarTextoXls(r.id_contrato);
    const idVisita = limpiarTextoXls(r.idvisita);
    const fechaRegMysql =
      parsearFechaXls(r.fecha_registro, true) ||
      new Date().toISOString().slice(0, 19).replace('T', ' ');
    const fechaProgMysql = parsearFechaXls(r.fecha_programacion, false);

    const ctosCandidatas = JSON.stringify([
      {
        prioridad: 1,
        cto: limpiarTextoXls(r.cto1),
        lat: limpiarTextoXls(r.cto1_latitud),
        lng: limpiarTextoXls(r.cto1_longitud),
        metraje: limpiarTextoXls(r.cto1_metraje),
        poste: limpiarTextoXls(r.cto1_poste),
        piso: limpiarTextoXls(r.cto1_piso),
        montante: limpiarTextoXls(r.cto1_montante),
      },
      {
        prioridad: 2,
        cto: limpiarTextoXls(r.cto2),
        lat: limpiarTextoXls(r.cto2_latitud),
        lng: limpiarTextoXls(r.cto2_longitud),
        metraje: limpiarTextoXls(r.cto2_metraje),
        poste: limpiarTextoXls(r.cto2_poste),
        piso: limpiarTextoXls(r.cto2_piso),
        montante: limpiarTextoXls(r.cto2_montante),
      },
      {
        prioridad: 3,
        cto: limpiarTextoXls(r.cto3),
        lat: limpiarTextoXls(r.cto3_latitud),
        lng: limpiarTextoXls(r.cto3_longitud),
        metraje: limpiarTextoXls(r.cto3_metraje),
        poste: limpiarTextoXls(r.cto3_poste),
        piso: limpiarTextoXls(r.cto3_piso),
        montante: limpiarTextoXls(r.cto3_montante),
      },
    ]);

    const detallePredio = JSON.stringify({
      latitud: limpiarTextoXls(r.latitud),
      longitud: limpiarTextoXls(r.longitud),
      ubigeo: limpiarTextoXls(r.ubigeo),
      cod_postal: limpiarTextoXls(r.cod_postal),
      torre: limpiarTextoXls(r.torre) || 'NA',
      nro_departamento: limpiarTextoXls(r.nro_departamento) || 'N/A',
      tipo_vivienda: limpiarTextoXls(r.tipo_vivienda) || 'MULTIFAMILIAR',
      departamento: limpiarTextoXls(r.Departamento) || 'Lima',
      provincia: limpiarTextoXls(r.Provincia) || 'Lima',
      area_venta: limpiarTextoXls(r.area_venta),
    });

    const datosComercialesXls = JSON.stringify({
      dni_programador: obtenerCampoXls(r, ['dni_programador']),
      nom_programador: obtenerCampoXls(r, ['nom_programador']),
      idvisita: idVisita,
      pp: obtenerCampoXls(r, ['pp']),
      tramo_horario: obtenerCampoXls(r, ['Tramo horario']),
      nro_ruc_cliente: obtenerCampoXls(r, ['nro_ruc cliente']),
      razon_social_cliente: obtenerCampoXls(r, ['razon_social cliente']),
      svas: obtenerCampoXls(r, ["SVA`s", 'SVAs']),
      cantidad_mesh: obtenerCampoXls(r, ['CantidadMesh']),
      instalacion_mesh: obtenerCampoXls(r, ['InstalacionMesh']),
      velocidad_contratada: obtenerCampoXls(r, ['VelocidadContratada']),
      comentario_programador: obtenerCampoXls(r, ['comentario_programador']),
      tipificacion: obtenerCampoXls(r, ['tipificacion']),
      tipo_alta: obtenerCampoXls(r, ['Tipo_alta']),
      portabilidad: obtenerCampoXls(r, ['Portabilidad']),
      numero_telefonico: obtenerCampoXls(r, ['Numero Telefonico']),
      formulario: obtenerCampoXls(r, ['Formulario']),
      comentario: obtenerCampoXls(r, ['Comentario']),
      comentario_validador: obtenerCampoXls(r, ['Comentario del validador']),
      estado_validacion: obtenerCampoXls(r, ['Estado de validacion', 'Estado de validación']),
      tipo_validaciones: obtenerCampoXls(r, ['Tipo de validaciones']),
      tipo_documento_recepcion: obtenerCampoXls(r, ['tipo_documento_recepcion']),
      num_recepcion: obtenerCampoXls(r, ['num_recepcion']),
      nom_recepcion: obtenerCampoXls(r, ['nom_recepcion']),
      fila_original_completa: r,
    });

    const resumenGestion = JSON.stringify({
      estado_operaciones: 'IMPORTADO',
      conteo_operaciones: 0,
      ultima_fecha_gestion: null,
      ultimo_motivo: limpiarTextoXls(r['Estado de validacion']) || 'APROBADO',
    });

    const coordDireccion =
      limpiarTextoXls(r.coordenadas_direccion) ||
      (r.latitud && r.longitud ? `${limpiarTextoXls(r.latitud)},${limpiarTextoXls(r.longitud)}` : null);

    const comentarioComercial = obtenerCampoXls(r, ['Comentario']);
    const comentarioValidador = obtenerCampoXls(r, ['Comentario del validador']);
    const meshResumen = calcularModoMesh(comentarioValidador, comentarioComercial);

    filasPreparadas.push([
      codPedido,
      idVisita || idContrato || codPedido,
      idContrato,
      limpiarTextoXls(r.dni_cliente) || '',
      limpiarTextoXls(r.nom_cliente) || 'SIN NOMBRE',
      limpiarTextoXls(r.telefono),
      limpiarTextoXls(r.telefono_alternativo),
      limpiarTextoXls(r.correo_electronico),
      limpiarTextoXls(r.direccion_cliente) || '',
      coordDireccion,
      limpiarTextoXls(r.Distrito) || 'LIMA',
      limpiarTextoXls(r.Zona) || limpiarTextoXls(r.Poligono),
      limpiarTextoXls(r.Poligono),
      limpiarTextoXls(r.tipo) || 'residencial',
      limpiarTextoXls(r.horario) || limpiarTextoXls(r['Tramo horario']),
      limpiarTextoXls(r['Campaña'] || r.Campana),
      limpiarTextoXls(r.Paquete),
      meshResumen,
      limpiarTextoXls(r.area_venta) || limpiarTextoXls(r.Formulario),
      fechaRegMysql,
      fechaProgMysql,
      ctosCandidatas,
      detallePredio,
      datosComercialesXls,
      resumenGestion,
    ]);
  }

  if (filasPreparadas.length === 0) {
    return res.status(400).json({ error: 'No se encontraron filas con valida_cod_pedido válido' });
  }

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();
    const BATCH_SIZE = 250;

    for (let i = 0; i < filasPreparadas.length; i += BATCH_SIZE) {
      const lote = filasPreparadas.slice(i, i + BATCH_SIZE);
      await conn.query(
        `INSERT INTO dev_CLIENTES (
          valida_cod_pedido, IDclientes, id_contrato, dni_cliente, nom_cliente,
          telefono, telefono_alternativo, correo_electronico, direccion_cliente,
          coordenadas_direccion, Distrito, Zona, Poligono, tipo, horario,
          Campaña, Paquete, Mesh_modo, Agencia, fecha_registro, fecha_programacion,
          ctos_candidatas, detalle_predio, datos_comerciales_xls, resumen_gestion
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          id_contrato = VALUES(id_contrato),
          telefono = VALUES(telefono),
          telefono_alternativo = VALUES(telefono_alternativo),
          direccion_cliente = VALUES(direccion_cliente),
          coordenadas_direccion = VALUES(coordenadas_direccion),
          Paquete = VALUES(Paquete),
          Mesh_modo = VALUES(Mesh_modo),
          fecha_programacion = VALUES(fecha_programacion),
          ctos_candidatas = VALUES(ctos_candidatas),
          detalle_predio = VALUES(detalle_predio),
          datos_comerciales_xls = VALUES(datos_comerciales_xls)`,
        [lote]
      );
    }

    await conn.commit();
    res.json({ ok: true, importados: filasPreparadas.length });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    conn.release();
  }
});
