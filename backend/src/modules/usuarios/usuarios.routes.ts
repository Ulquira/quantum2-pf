import { Router } from 'express';
import { dbPool } from '../../config/db';
import { hashPassword } from '../../shared/authUtils';

export const usuariosRouter = Router();

usuariosRouter.get('/tecnicos', async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id_user, dni, nombres, apellidos, contrata, cuadrilla, zona_distrito
       FROM dev_USER
       WHERE rol = 'TECNICO' AND activo = 1
       ORDER BY contrata ASC, nombres ASC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

usuariosRouter.get('/catalogo', async (_req, res) => {
  try {
    const [partnersRows] = await dbPool.query(
      `SELECT DISTINCT TRIM(contrata) AS partner
       FROM dev_USER
       WHERE rol IN ('PARTNER', 'TECNICO')
         AND contrata IS NOT NULL
         AND TRIM(contrata) <> ''
         AND activo = 1
       ORDER BY partner ASC`
    );
    const [cuadrillasRows] = await dbPool.query(
      `SELECT
         TRIM(cuadrilla) AS cuadrilla,
         TRIM(contrata) AS partner,
         id_user,
         CONCAT_WS(' ', nombres, apellidos) AS nombre_tecnico
       FROM dev_USER
       WHERE rol = 'TECNICO'
         AND cuadrilla IS NOT NULL
         AND TRIM(cuadrilla) <> ''
         AND activo = 1
       ORDER BY contrata ASC, cuadrilla ASC`
    );

    res.json({
      partners: (partnersRows as { partner: string }[]).map((r) => r.partner),
      cuadrillas: cuadrillasRows,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

usuariosRouter.get('/', async (_req, res) => {
  try {
    const [colEmail] = await dbPool.query("SHOW COLUMNS FROM dev_USER LIKE 'email'");
    const exprCorreo =
      Array.isArray(colEmail) && colEmail.length > 0
        ? 'COALESCE(correo, email) AS correo'
        : 'correo';

    const [rows] = await dbPool.query(
      `SELECT
        id_user, dni, nombres, apellidos, ${exprCorreo}, telefono,
        rol, contrata, cuadrilla, zona_distrito, activo, fecha_creacion
       FROM dev_USER
       ORDER BY activo DESC, rol ASC, nombres ASC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

usuariosRouter.post('/', async (req, res) => {
  const {
    dni,
    nombres,
    apellidos,
    correo,
    telefono,
    rol,
    contrata,
    cuadrilla,
    zona_distrito,
    password,
    activo,
  } = req.body;

  const dniLimpio = String(dni || '').trim();
  if (!dniLimpio || !nombres || !apellidos) {
    return res.status(400).json({ error: 'DNI, nombres y apellidos son obligatorios' });
  }

  const prefijo = rol === 'TECNICO' ? 'TEC' : rol === 'PARTNER' ? 'PAR' : 'USR';
  const idUser = `${prefijo}-${dniLimpio}`;
  const claveHash = hashPassword(String(password || dniLimpio));
  const correoLimpio = correo ? String(correo).trim().toLowerCase() : null;

  try {
    const [colEmail] = await dbPool.query("SHOW COLUMNS FROM dev_USER LIKE 'email'");
    const tieneEmail = Array.isArray(colEmail) && colEmail.length > 0;

    if (tieneEmail) {
      await dbPool.query(
        `INSERT INTO dev_USER (
          id_user, dni, nombres, apellidos, email, correo, telefono,
          rol, contrata, cuadrilla, zona_distrito, password_hash, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idUser,
          dniLimpio,
          String(nombres).trim().toUpperCase(),
          String(apellidos).trim().toUpperCase(),
          correoLimpio,
          correoLimpio,
          telefono ? String(telefono).trim() : null,
          rol || 'TECNICO',
          contrata ? String(contrata).trim().toUpperCase() : 'PERUFIBRA',
          cuadrilla ? String(cuadrilla).trim().toUpperCase() : null,
          zona_distrito ? String(zona_distrito).trim() : null,
          claveHash,
          activo === 0 || activo === false ? 0 : 1,
        ]
      );
    } else {
      await dbPool.query(
        `INSERT INTO dev_USER (
          id_user, dni, nombres, apellidos, correo, telefono,
          rol, contrata, cuadrilla, zona_distrito, password_hash, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idUser,
          dniLimpio,
          String(nombres).trim().toUpperCase(),
          String(apellidos).trim().toUpperCase(),
          correoLimpio,
          telefono ? String(telefono).trim() : null,
          rol || 'TECNICO',
          contrata ? String(contrata).trim().toUpperCase() : 'PERUFIBRA',
          cuadrilla ? String(cuadrilla).trim().toUpperCase() : null,
          zona_distrito ? String(zona_distrito).trim() : null,
          claveHash,
          activo === 0 || activo === false ? 0 : 1,
        ]
      );
    }

    res.json({ ok: true, id_user: idUser });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

usuariosRouter.patch('/:id', async (req, res) => {
  const idUser = req.params.id;
  const {
    dni,
    nombres,
    apellidos,
    correo,
    telefono,
    rol,
    contrata,
    cuadrilla,
    zona_distrito,
    password,
    activo,
  } = req.body;

  try {
    const campos: string[] = [];
    const valores: unknown[] = [];

    if (dni !== undefined) {
      campos.push('dni = ?');
      valores.push(String(dni).trim());
    }
    if (nombres !== undefined) {
      campos.push('nombres = ?');
      valores.push(String(nombres).trim().toUpperCase());
    }
    if (apellidos !== undefined) {
      campos.push('apellidos = ?');
      valores.push(String(apellidos).trim().toUpperCase());
    }
    if (correo !== undefined) {
      campos.push('correo = ?');
      valores.push(correo ? String(correo).trim() : null);
    }
    if (telefono !== undefined) {
      campos.push('telefono = ?');
      valores.push(telefono ? String(telefono).trim() : null);
    }
    if (rol !== undefined) {
      campos.push('rol = ?');
      valores.push(rol);
    }
    if (contrata !== undefined) {
      campos.push('contrata = ?');
      valores.push(contrata ? String(contrata).trim().toUpperCase() : null);
    }
    if (cuadrilla !== undefined) {
      campos.push('cuadrilla = ?');
      valores.push(cuadrilla ? String(cuadrilla).trim().toUpperCase() : null);
    }
    if (zona_distrito !== undefined) {
      campos.push('zona_distrito = ?');
      valores.push(zona_distrito ? String(zona_distrito).trim() : null);
    }
    if (activo !== undefined) {
      campos.push('activo = ?');
      valores.push(activo ? 1 : 0);
    }
    if (password && String(password).trim() !== '') {
      campos.push('password_hash = ?');
      valores.push(hashPassword(String(password).trim()));
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'Sin cambios para guardar' });
    }

    valores.push(idUser);
    await dbPool.query(`UPDATE dev_USER SET ${campos.join(', ')} WHERE id_user = ?`, valores);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
