import { Router } from 'express';
import { dbPool } from '../../config/db';
import { verificarPassword } from '../../shared/authUtils';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { dni, password } = req.body;
  const dniLimpio = String(dni || '').trim();
  const clave = String(password || '').trim();

  if (!dniLimpio || !clave) {
    return res.status(400).json({ error: 'Ingrese DNI y contraseña' });
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT id_user, dni, nombres, apellidos, rol, contrata, cuadrilla, zona_distrito, password_hash, activo
       FROM dev_USER
       WHERE dni = ? OR id_user = ?
       LIMIT 1`,
      [dniLimpio, dniLimpio]
    );
    const user = (rows as Record<string, unknown>[])[0];

    if (!user || Number(user.activo) !== 1) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const ok = verificarPassword(
      clave,
      user.password_hash ? String(user.password_hash) : null,
      String(user.dni)
    );
    if (!ok) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({
      id_user: user.id_user,
      dni: user.dni,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: user.rol,
      contrata: user.contrata,
      cuadrilla: user.cuadrilla,
      zona_distrito: user.zona_distrito,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
