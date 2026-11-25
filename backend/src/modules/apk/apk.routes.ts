import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { dbPool } from '../../config/db';
import {
  buildPublicEvidenceUrl,
  deleteEvidenceImage,
  streamEvidenceImage,
  uploadEvidenceImage,
} from '../../services/storageService';
import { esEstadoFinalOperacion } from '../../shared/operacionRules';

export const apkRouter = Router();

apkRouter.get('/ordenes', async (req, res) => {
  const idTecnico = String(req.query.id_tecnico || '').trim();
  const cuadrilla = String(req.query.cuadrilla || '').trim();
  const partner = String(req.query.partner || '').trim();

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
        c.Paquete,
        c.Campaña,
        c.Mesh_modo,
        c.ctos_candidatas
      FROM dev_OPERACION o
      LEFT JOIN dev_CLIENTES c ON o.valida_cod_pedido = c.valida_cod_pedido
      WHERE o.es_ultimo_cod = 1
        AND (
          (? <> '' AND o.id_tecnico = ?)
          OR (? <> '' AND o.Cuadrilla = ? AND (? = '' OR o.Partner = ?))
        )
      ORDER BY o.Fecha_Gestion DESC, o.IDoperacion DESC`,
      [idTecnico, idTecnico, cuadrilla, cuadrilla, partner, partner]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apkRouter.get('/ordenes/:id/evidencias', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id_evidencia, seccion, tipo_foto, url_archivo, fecha_subida
       FROM dev_EVIDENCIAS
       WHERE IDoperacion = ?
       ORDER BY fecha_subida ASC, id_evidencia ASC`,
      [req.params.id]
    );
    const evidencias = (
      rows as {
        id_evidencia: number;
        seccion: string;
        tipo_foto: string;
        url_archivo: string;
        fecha_subida: string;
      }[]
    ).map((row) => ({
      ...row,
      url_archivo: buildPublicEvidenceUrl(req, row.id_evidencia, row.url_archivo),
    }));
    res.json(evidencias);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apkRouter.get('/evidencias/:idEvidencia/archivo', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT url_archivo FROM dev_EVIDENCIAS WHERE id_evidencia = ? LIMIT 1',
      [req.params.idEvidencia]
    );
    const row = (rows as { url_archivo: string }[])[0];
    if (!row?.url_archivo) {
      return res.status(404).json({ error: 'Evidencia no encontrada' });
    }
    await streamEvidenceImage(row.url_archivo, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

apkRouter.post('/ordenes/:id/evidencia', async (req, res) => {
  const idOperacion = req.params.id;
  const { seccion, tipo_foto, data_url, id_tecnico } = req.body;

  if (!seccion || !tipo_foto || !data_url) {
    return res.status(400).json({ error: 'Sección, tipo de foto e imagen son obligatorios' });
  }

  try {
    const uploaded = await uploadEvidenceImage(idOperacion, seccion, data_url);
    const [result] = await dbPool.query<ResultSetHeader>(
      `INSERT INTO dev_EVIDENCIAS (IDoperacion, seccion, tipo_foto, url_archivo, id_tecnico, fecha_subida)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [idOperacion, seccion, tipo_foto, uploaded.storageRef, id_tecnico || null]
    );
    res.json({
      ok: true,
      id_evidencia: result.insertId,
      storage: uploaded.driver,
      url_archivo: buildPublicEvidenceUrl(req, result.insertId, uploaded.storageRef),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apkRouter.delete('/evidencias/:idEvidencia', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT url_archivo FROM dev_EVIDENCIAS WHERE id_evidencia = ? LIMIT 1',
      [req.params.idEvidencia]
    );
    const row = (rows as { url_archivo: string }[])[0];

    await dbPool.query('DELETE FROM dev_EVIDENCIAS WHERE id_evidencia = ?', [
      req.params.idEvidencia,
    ]);

    if (row?.url_archivo) {
      await deleteEvidenceImage(row.url_archivo);
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apkRouter.patch('/ordenes/:id/gestionar', async (req, res) => {
  const idOperacion = req.params.id;
  const {
    accion,
    at_titular,
    cto_uso,
    puerto_utilizado,
    rx_cto,
    rx_roseta,
    sn_ont,
    sn_mesh,
    metraje_cable,
    Estado,
    SubEstado,
    Motivo,
    token_ingresado,
  } = req.body;

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const [actualRows] = await conn.query(
      'SELECT valida_cod_pedido, Estado, H_Fin, tokens FROM dev_OPERACION WHERE IDoperacion = ? LIMIT 1',
      [idOperacion]
    );
    const actual = (actualRows as Record<string, unknown>[])[0];
    if (!actual) {
      await conn.rollback();
      return res.status(404).json({ error: 'Orden no existe' });
    }
    if (actual.H_Fin) {
      await conn.rollback();
      return res.status(403).json({ error: 'Esta orden ya se encuentra cerrada.' });
    }

    if (accion === 'INICIAR') {
      await conn.query(
        'UPDATE dev_OPERACION SET H_Inicio = COALESCE(H_Inicio, NOW()), H_ultimo_movimiento = NOW() WHERE IDoperacion = ?',
        [idOperacion]
      );
      await conn.commit();
      return res.json({ ok: true });
    }

    const estadoDestino = Estado ? String(Estado).trim().toUpperCase() : null;
    const subEstadoDestino = SubEstado ? String(SubEstado).trim().toUpperCase() : null;

    if (estadoDestino === 'FINALIZADO' && token_ingresado !== undefined) {
      const tkObj =
        typeof actual.tokens === 'string' ? JSON.parse(actual.tokens) : actual.tokens || {};
      if (tkObj.token_valida && String(token_ingresado).trim() !== String(tkObj.token_valida)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Token de validación incorrecto' });
      }
    }

    const cierraOrden = estadoDestino
      ? await esEstadoFinalOperacion(conn, estadoDestino, subEstadoDestino)
      : false;

    await conn.query(
      `UPDATE dev_OPERACION
       SET Estado = COALESCE(?, Estado),
           SubEstado = COALESCE(?, SubEstado),
           Motivo = COALESCE(?, Motivo),
           H_Inicio = COALESCE(H_Inicio, NOW()),
           H_Fin = CASE WHEN ? = 1 THEN NOW() ELSE H_Fin END,
           H_ultimo_movimiento = NOW(),
           datos_cto = JSON_SET(
             COALESCE(datos_cto, JSON_OBJECT()),
             '$.cto_uso', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_cto, '$.cto_uso'))),
             '$.puerto_utilizado', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_cto, '$.puerto_utilizado'))),
             '$.rx_cto', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_cto, '$.rx_cto'))),
             '$.rx_roseta', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_cto, '$.rx_roseta')))
           ),
           datos_equipos = JSON_SET(
             COALESCE(datos_equipos, JSON_OBJECT()),
             '$.at_titular', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_equipos, '$.at_titular'))),
             '$.sn_ont', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_equipos, '$.sn_ont'))),
             '$.sn_mesh', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_equipos, '$.sn_mesh'))),
             '$.metraje_cable', COALESCE(?, JSON_UNQUOTE(JSON_EXTRACT(datos_equipos, '$.metraje_cable')))
           )
       WHERE IDoperacion = ?`,
      [
        estadoDestino,
        subEstadoDestino,
        Motivo ?? null,
        cierraOrden ? 1 : 0,
        cto_uso ?? null,
        puerto_utilizado ?? null,
        rx_cto ?? null,
        rx_roseta ?? null,
        at_titular ?? null,
        sn_ont ?? null,
        sn_mesh ?? null,
        metraje_cable ?? null,
        idOperacion,
      ]
    );

    if (estadoDestino && actual.valida_cod_pedido) {
      await conn.query(
        `UPDATE dev_CLIENTES
         SET resumen_gestion = JSON_SET(
           COALESCE(resumen_gestion, JSON_OBJECT()),
           '$.estado_operaciones', ?,
           '$.ultimo_motivo', ?
         )
         WHERE valida_cod_pedido = ?`,
        [estadoDestino, Motivo || subEstadoDestino || null, actual.valida_cod_pedido]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    conn.release();
  }
});
