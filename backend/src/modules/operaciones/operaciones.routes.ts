import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { dbPool } from '../../config/db';
import { esEstadoFinalOperacion } from '../../shared/operacionRules';

export const operacionesRouter = Router();

interface FilaOperacionActual {
  valida_cod_pedido: string | null;
  Estado: string | null;
  SubEstado: string | null;
  Partner: string | null;
  Cuadrilla: string | null;
  id_tecnico: string | null;
  F_Asignacion: string | null;
  es_ultimo_cod: number;
  H_Fin: string | null;
}

operacionesRouter.post('/programar', async (req, res) => {
  const {
    valida_cod_pedido,
    fecha_gestion,
    tramo_atencion,
    telefono_adicional,
    comentario_programacion,
  } = req.body;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    if (telefono_adicional !== undefined && String(telefono_adicional).trim() !== '') {
      await conn.query(
        'UPDATE dev_CLIENTES SET telefono_alternativo = ? WHERE valida_cod_pedido = ?',
        [String(telefono_adicional).trim(), valida_cod_pedido]
      );
    }

    const [conteoRows] = await conn.query(
      'SELECT COUNT(*) AS total FROM dev_OPERACION WHERE valida_cod_pedido = ?',
      [valida_cod_pedido]
    );
    const nroVisita = Number((conteoRows as { total: number }[])[0]?.total || 0) + 1;
    const idOperacion = `OP-${valida_cod_pedido}-V${nroVisita}-${Date.now().toString().slice(-4)}`;

    await conn.query(
      'UPDATE dev_OPERACION SET es_ultimo_cod = 0 WHERE valida_cod_pedido = ?',
      [valida_cod_pedido]
    );

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO dev_OPERACION (
        IDoperacion, IDclientes, valida_cod_pedido, Conteo_Operaciones, es_ultimo_cod,
        Estado, SubEstado, Partner, Cuadrilla, id_tecnico, F_Asignacion, Fecha_Gestion,
        Tramo_Atencio, H_Progra, Observaciones, datos_cto, datos_equipos, tokens
      )
      SELECT
        ?, c.IDclientes, c.valida_cod_pedido, ?, 1,
        'PENDIENTE', 'SIN ASIGNACIÓN DE PARTNER', NULL, NULL, NULL, NULL, ?, ?, NOW(), ?,
        JSON_OBJECT(
          'candidatas', c.ctos_candidatas,
          'cto_uso', JSON_UNQUOTE(JSON_EXTRACT(c.ctos_candidatas, '$[0].cto')),
          'puerto_utilizado', NULL,
          'rx_cto', NULL,
          'rx_roseta', NULL
        ),
        JSON_OBJECT('mesh_modo', c.Mesh_modo, 'sn_ont', NULL, 'sn_mesh', NULL, 'metraje_cable', NULL),
        JSON_OBJECT(
          'token_inicio', LPAD(FLOOR(RAND() * 10000), 4, '0'),
          'token_valida', LPAD(FLOOR(RAND() * 10000), 4, '0')
        )
      FROM dev_CLIENTES c
      WHERE c.valida_cod_pedido = ?
      LIMIT 1`,
      [
        idOperacion,
        nroVisita,
        fecha_gestion,
        tramo_atencion,
        comentario_programacion ? String(comentario_programacion).trim() : null,
        valida_cod_pedido,
      ]
    );

    await conn.query(
      `UPDATE dev_CLIENTES
       SET fecha_programacion = ?,
           horario = ?,
           resumen_gestion = JSON_SET(
             COALESCE(resumen_gestion, JSON_OBJECT()),
             '$.estado_operaciones', 'PROGRAMADO',
             '$.conteo_operaciones', ?,
             '$.ultima_fecha_gestion', ?
           )
       WHERE valida_cod_pedido = ?`,
      [fecha_gestion, tramo_atencion, nroVisita, fecha_gestion, valida_cod_pedido]
    );

    await conn.commit();
    res.json({ ok: true, IDoperacion: idOperacion, visita: nroVisita, affectedRows: result.affectedRows });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    conn.release();
  }
});

operacionesRouter.get('/', async (req, res) => {
  const pageRaw = req.query.page;
  const esPaginado = pageRaw !== undefined;
  const page = Math.max(1, Number(pageRaw || 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || (esPaginado ? 50 : 500)) || 50));
  const offset = (page - 1) * limit;

  const q = String(req.query.q || '').trim();
  const estado = String(req.query.estado || '').trim();
  const distrito = String(req.query.distrito || '').trim();
  const cuadrilla = String(req.query.cuadrilla || '').trim();
  const soloUltima = req.query.solo_ultima === '1' || req.query.solo_ultima === 'true';
  const fechaDesde = String(req.query.fecha_desde || '').trim().slice(0, 10);
  const fechaHasta = String(req.query.fecha_hasta || '').trim().slice(0, 10);

  const where: string[] = [];
  const params: unknown[] = [];

  if (soloUltima) {
    where.push('o.es_ultimo_cod = 1');
  }

  if (q) {
    const like = `%${q}%`;
    where.push(`(
      o.IDoperacion LIKE ?
      OR o.valida_cod_pedido LIKE ?
      OR c.nom_cliente LIKE ?
      OR c.dni_cliente LIKE ?
      OR o.Cuadrilla LIKE ?
      OR CONCAT_WS(' ', u.nombres, u.apellidos) LIKE ?
    )`);
    params.push(like, like, like, like, like, like);
  }

  if (estado && estado !== 'TODOS') {
    where.push('o.Estado = ?');
    params.push(estado);
  }

  if (distrito && distrito !== 'TODOS') {
    where.push('c.Distrito = ?');
    params.push(distrito);
  }

  if (cuadrilla && cuadrilla !== 'TODOS') {
    where.push('o.Cuadrilla = ?');
    params.push(cuadrilla);
  }

  if (fechaDesde) {
    where.push('DATE(o.Fecha_Gestion) >= ?');
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    where.push('DATE(o.Fecha_Gestion) <= ?');
    params.push(fechaHasta);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const fromJoinSql = `
    FROM dev_OPERACION o
    LEFT JOIN dev_CLIENTES c ON o.valida_cod_pedido = c.valida_cod_pedido
    LEFT JOIN dev_USER u ON o.id_tecnico = u.id_user
  `;

  try {
    const [rows] = await dbPool.query(
      `SELECT
        o.*,
        c.nom_cliente,
        c.dni_cliente,
        c.telefono,
        c.telefono_alternativo,
        c.direccion_cliente,
        c.coordenadas_direccion,
        c.Distrito,
        c.Zona,
        c.Poligono,
        c.Paquete,
        c.Campaña,
        c.Mesh_modo,
        c.ctos_candidatas,
        JSON_REMOVE(c.datos_comerciales_xls, '$.fila_original_completa') AS datos_comerciales_xls,
        CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre_tecnico
      ${fromJoinSql}
      ${whereSql}
      ORDER BY o.Fecha_Gestion DESC, o.IDoperacion DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (!esPaginado) {
      return res.json(rows);
    }

    const [[countRows], [distRows], [cuadRows]] = await Promise.all([
      dbPool.query(`SELECT COUNT(*) AS total ${fromJoinSql} ${whereSql}`, params),
      dbPool.query(
        `SELECT DISTINCT c.Distrito
         FROM dev_OPERACION o
         INNER JOIN dev_CLIENTES c ON o.valida_cod_pedido = c.valida_cod_pedido
         WHERE c.Distrito IS NOT NULL AND TRIM(c.Distrito) <> ''
         ORDER BY c.Distrito ASC`
      ),
      dbPool.query(
        `SELECT DISTINCT Cuadrilla
         FROM dev_OPERACION
         WHERE Cuadrilla IS NOT NULL AND TRIM(Cuadrilla) <> ''
         ORDER BY Cuadrilla ASC`
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
        cuadrillas: (cuadRows as { Cuadrilla: string }[]).map((r) => r.Cuadrilla),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

operacionesRouter.patch('/:id', async (req, res) => {
  const idOperacion = req.params.id;
  const {
    Partner,
    Cuadrilla,
    id_tecnico,
    Estado,
    SubEstado,
    Motivo,
    proxima_fecha,
    proximo_tramo,
  } = req.body;

  const partnerLimpio = Partner ? String(Partner).trim() : null;
  const cuadrillaLimpia = Cuadrilla ? String(Cuadrilla).trim() : null;
  const estadoLimpio = Estado ? String(Estado).trim().toUpperCase() : null;
  const subEstadoLimpio = SubEstado ? String(SubEstado).trim().toUpperCase() : null;
  const motivoLimpio = Motivo !== undefined && Motivo !== null ? String(Motivo).trim() : null;
  const proximaFechaLimpia = proxima_fecha ? String(proxima_fecha).slice(0, 10) : null;
  const proximoTramoLimpio = proximo_tramo ? String(proximo_tramo).trim() : '08:00 - 12:00';

  if (!partnerLimpio && !estadoLimpio) {
    return res.status(400).json({ error: 'Seleccione Partner/Cuadrilla o un Estado a guardar' });
  }

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const [actualRows] = await conn.query(
      `SELECT valida_cod_pedido, Estado, SubEstado, Partner, Cuadrilla,
              id_tecnico, F_Asignacion, es_ultimo_cod, H_Fin
       FROM dev_OPERACION WHERE IDoperacion = ? LIMIT 1`,
      [idOperacion]
    );
    const actual = (actualRows as FilaOperacionActual[])[0];
    if (!actual) {
      await conn.rollback();
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const estadoBd = (actual.Estado || '').trim().toUpperCase();
    const esFinalBd = await esEstadoFinalOperacion(conn, estadoBd, actual.SubEstado);

    if (Number(actual.es_ultimo_cod) === 0 || Boolean(actual.H_Fin) || esFinalBd) {
      await conn.rollback();
      return res.status(403).json({
        error: `La visita ya se encuentra cerrada (${estadoBd}) y no admite modificaciones.`,
      });
    }

    const codPedido = actual.valida_cod_pedido;
    const partnerFinal = partnerLimpio ?? actual.Partner;
    const cuadrillaFinal = cuadrillaLimpia ?? actual.Cuadrilla;
    let tecnicoFinal = id_tecnico !== undefined ? id_tecnico : actual.id_tecnico;

    if (partnerFinal && cuadrillaFinal && !id_tecnico) {
      const [tecRows] = await conn.query(
        `SELECT id_user FROM dev_USER
         WHERE rol = 'TECNICO' AND activo = 1 AND contrata = ? AND cuadrilla = ?
         LIMIT 1`,
        [partnerFinal, cuadrillaFinal]
      );
      tecnicoFinal = (tecRows as { id_user: string }[])[0]?.id_user || tecnicoFinal;
    }

    let estadoFinal = estadoLimpio || actual.Estado || 'PENDIENTE';
    let subEstadoFinal = subEstadoLimpio !== null ? subEstadoLimpio : actual.SubEstado;

    const eraSinDespacho = ['PENDIENTE', 'PROGRAMADA'].includes(estadoBd);
    const noCambioEstadoManual = !estadoLimpio || ['PENDIENTE', 'PROGRAMADA'].includes(estadoLimpio);

    if (partnerFinal && cuadrillaFinal && eraSinDespacho && noCambioEstadoManual) {
      estadoFinal = 'PROGRAMADO';
      subEstadoFinal = 'ASIGNADO A PARTNER';
    }

    const cierraVisitaAhora = await esEstadoFinalOperacion(conn, estadoFinal, subEstadoFinal);
    const esReprogramaConFecha = estadoFinal === 'REPROGRAMA' && Boolean(proximaFechaLimpia);

    await conn.query(
      `UPDATE dev_OPERACION
       SET Estado = ?,
           SubEstado = ?,
           Partner = ?,
           Cuadrilla = ?,
           id_tecnico = ?,
           Motivo = COALESCE(?, Motivo),
           es_ultimo_cod = CASE WHEN ? = 1 THEN 0 ELSE es_ultimo_cod END,
           F_Asignacion = CASE WHEN ? IS NOT NULL THEN COALESCE(F_Asignacion, CURDATE()) ELSE F_Asignacion END,
           H_Fin = CASE WHEN ? = 1 THEN COALESCE(H_Fin, NOW()) ELSE H_Fin END,
           H_ultimo_movimiento = NOW()
       WHERE IDoperacion = ?`,
      [
        estadoFinal,
        subEstadoFinal,
        partnerFinal,
        cuadrillaFinal,
        tecnicoFinal,
        motivoLimpio,
        esReprogramaConFecha ? 1 : 0,
        partnerFinal,
        cierraVisitaAhora ? 1 : 0,
        idOperacion,
      ]
    );

    if (esReprogramaConFecha && codPedido) {
      await conn.query(
        'UPDATE dev_OPERACION SET es_ultimo_cod = 0 WHERE valida_cod_pedido = ?',
        [codPedido]
      );

      const [conteoRows] = await conn.query(
        'SELECT COUNT(*) AS total FROM dev_OPERACION WHERE valida_cod_pedido = ?',
        [codPedido]
      );
      const nroVisita = Number((conteoRows as { total: number }[])[0]?.total || 0) + 1;
      const nuevaIdOp = `OP-${codPedido}-V${nroVisita}-${Date.now().toString().slice(-4)}`;

      await conn.query(
        `INSERT INTO dev_OPERACION (
          IDoperacion, IDclientes, valida_cod_pedido, Conteo_Operaciones, es_ultimo_cod,
          Estado, SubEstado, Partner, Cuadrilla, id_tecnico, F_Asignacion, Fecha_Gestion,
          Tramo_Atencio, H_Progra, Observaciones, datos_cto, datos_equipos, tokens
        )
        SELECT
          ?, c.IDclientes, c.valida_cod_pedido, ?, 1,
          'PENDIENTE', 'SIN ASIGNACIÓN DE PARTNER', NULL, NULL, NULL, NULL, ?, ?, NOW(), ?,
          JSON_OBJECT(
            'candidatas', c.ctos_candidatas,
            'cto_uso', JSON_UNQUOTE(JSON_EXTRACT(c.ctos_candidatas, '$[0].cto')),
            'puerto_utilizado', NULL,
            'rx_cto', NULL,
            'rx_roseta', NULL
          ),
          JSON_OBJECT('mesh_modo', c.Mesh_modo, 'sn_ont', NULL, 'sn_mesh', NULL, 'metraje_cable', NULL),
          JSON_OBJECT(
            'token_inicio', LPAD(FLOOR(RAND() * 10000), 4, '0'),
            'token_valida', LPAD(FLOOR(RAND() * 10000), 4, '0')
          )
        FROM dev_CLIENTES c
        WHERE c.valida_cod_pedido = ?
        LIMIT 1`,
        [
          nuevaIdOp,
          nroVisita,
          proximaFechaLimpia,
          proximoTramoLimpio,
          motivoLimpio ? `Reprog V${nroVisita - 1}: ${motivoLimpio}` : `Reprogramado desde V${nroVisita - 1}`,
          codPedido,
        ]
      );

      await conn.query(
        `UPDATE dev_CLIENTES
         SET fecha_programacion = ?,
             horario = ?,
             resumen_gestion = JSON_SET(
               COALESCE(resumen_gestion, JSON_OBJECT()),
               '$.estado_operaciones', 'PENDIENTE',
               '$.conteo_operaciones', ?,
               '$.ultima_fecha_gestion', ?,
               '$.ultimo_motivo', ?
             )
         WHERE valida_cod_pedido = ?`,
        [
          proximaFechaLimpia,
          proximoTramoLimpio,
          nroVisita,
          proximaFechaLimpia,
          subEstadoFinal || motivoLimpio || 'REPROGRAMA',
          codPedido,
        ]
      );
    } else {
      await conn.query(
        `UPDATE dev_CLIENTES c
         INNER JOIN dev_OPERACION o ON c.valida_cod_pedido = o.valida_cod_pedido
         SET c.resumen_gestion = JSON_SET(
           COALESCE(c.resumen_gestion, JSON_OBJECT()),
           '$.estado_operaciones', ?,
           '$.ultimo_motivo', ?
         )
         WHERE o.IDoperacion = ? AND o.es_ultimo_cod = 1`,
        [estadoFinal, motivoLimpio || subEstadoFinal || null, idOperacion]
      );
    }

    await conn.commit();
    res.json({ ok: true, Estado: estadoFinal, SubEstado: subEstadoFinal });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    conn.release();
  }
});
