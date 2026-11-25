import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { dbPool } from '../../config/db';

export const configuracionRouter = Router();

configuracionRouter.get('/estados', async (req, res) => {
  const soloActivos = req.query.activos === '1';
  try {
    const sql = soloActivos
      ? 'SELECT * FROM dev_CATALOGO_ESTADOS WHERE activo = 1 ORDER BY orden ASC, estado ASC, subestado ASC'
      : 'SELECT * FROM dev_CATALOGO_ESTADOS ORDER BY orden ASC, estado ASC, subestado ASC';
    const [rows] = await dbPool.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

configuracionRouter.post('/estados', async (req, res) => {
  const {
    modulo,
    estado,
    subestado,
    requiere_foto,
    requiere_comentario,
    visible_apk,
    es_final,
    color_hex,
    orden,
    activo,
  } = req.body;

  if (!estado || !subestado) {
    return res.status(400).json({ error: 'Estado y SubEstado son obligatorios' });
  }

  try {
    const [result] = await dbPool.query<ResultSetHeader>(
      `INSERT INTO dev_CATALOGO_ESTADOS (
        modulo, estado, subestado, requiere_foto, requiere_comentario,
        visible_apk, es_final, color_hex, orden, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(modulo || 'OPERACION').trim().toUpperCase(),
        String(estado).trim().toUpperCase(),
        String(subestado).trim().toUpperCase(),
        requiere_foto ? 1 : 0,
        requiere_comentario ? 1 : 0,
        visible_apk === 0 || visible_apk === false ? 0 : 1,
        es_final ? 1 : 0,
        color_hex || '#7E7E7E',
        Number(orden || 10),
        activo === 0 || activo === false ? 0 : 1,
      ]
    );
    res.json({ ok: true, id_catalogo: result.insertId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

configuracionRouter.patch('/estados/:id', async (req, res) => {
  const idCatalogo = req.params.id;
  const {
    modulo,
    estado,
    subestado,
    requiere_foto,
    requiere_comentario,
    visible_apk,
    es_final,
    color_hex,
    orden,
    activo,
  } = req.body;

  try {
    const campos: string[] = [];
    const valores: unknown[] = [];

    if (modulo !== undefined) {
      campos.push('modulo = ?');
      valores.push(String(modulo).trim().toUpperCase());
    }
    if (estado !== undefined) {
      campos.push('estado = ?');
      valores.push(String(estado).trim().toUpperCase());
    }
    if (subestado !== undefined) {
      campos.push('subestado = ?');
      valores.push(String(subestado).trim().toUpperCase());
    }
    if (requiere_foto !== undefined) {
      campos.push('requiere_foto = ?');
      valores.push(requiere_foto ? 1 : 0);
    }
    if (requiere_comentario !== undefined) {
      campos.push('requiere_comentario = ?');
      valores.push(requiere_comentario ? 1 : 0);
    }
    if (visible_apk !== undefined) {
      campos.push('visible_apk = ?');
      valores.push(visible_apk ? 1 : 0);
    }
    if (es_final !== undefined) {
      campos.push('es_final = ?');
      valores.push(es_final ? 1 : 0);
    }
    if (color_hex !== undefined) {
      campos.push('color_hex = ?');
      valores.push(color_hex);
    }
    if (orden !== undefined) {
      campos.push('orden = ?');
      valores.push(Number(orden));
    }
    if (activo !== undefined) {
      campos.push('activo = ?');
      valores.push(activo ? 1 : 0);
    }

    if (!campos.length) return res.status(400).json({ error: 'Sin cambios' });

    valores.push(idCatalogo);
    await dbPool.query(
      `UPDATE dev_CATALOGO_ESTADOS SET ${campos.join(', ')} WHERE id_catalogo = ?`,
      valores
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
