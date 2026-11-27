// Etiqueta: Endpoints de Jornadas automaticas (regla 20:00 + ordenes activas), Control de Gestor y GPS en vivo
import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { dbPool } from '../../config/db';
import { locationStore } from '../../services/locationStore';
import { ESTADOS_CIERRE_FALLBACK } from '../../shared/operacionRules';

export const rastreoRouter = Router();

const HORA_INICIO_JORNADA = 6;
const HORA_CORTE_JORNADA = 20;

const validarCoord = (lat: unknown, lng: unknown): { lat: number; lng: number } | null => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
  if (Math.abs(nLat) > 90 || Math.abs(nLng) > 180) return null;
  if (nLat === 0 && nLng === 0) return null;
  return { lat: Number(nLat.toFixed(7)), lng: Number(nLng.toFixed(7)) };
};

// Etiqueta: Hora y fecha actual en zona horaria de Peru (America/Lima)
const obtenerRelojLima = (): { hora: number; fechaIso: string } => {
  const ahora = new Date();
  const horaStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    hour: 'numeric',
    hour12: false,
  }).format(ahora);
  const fechaIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
  }).format(ahora);
  const hora = Number(horaStr) % 24;
  return { hora, fechaIso };
};

// Etiqueta: Verifica si el tecnico o su cuadrilla tienen ordenes pendientes o en gestion
const verificarOrdenesActivasTecnico = async (idUser: string): Promise<boolean> => {
  const [userRows] = await dbPool.query(
    'SELECT cuadrilla, contrata FROM dev_USER WHERE id_user = ? LIMIT 1',
    [idUser]
  );
  const usr = (userRows as { cuadrilla?: string | null; contrata?: string | null }[])[0];
  const cuadrilla = String(usr?.cuadrilla || '').trim();
  const partner = String(usr?.contrata || '').trim();
  const estadosFinales = Array.from(ESTADOS_CIERRE_FALLBACK);

  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS total
     FROM dev_OPERACION
     WHERE es_ultimo_cod = 1
       AND H_Fin IS NULL
       AND UPPER(COALESCE(Estado, '')) NOT IN (?)
       AND (
         id_tecnico = ?
         OR (? <> '' AND Cuadrilla = ? AND (? = '' OR Partner = ?))
       )`,
    [estadosFinales, idUser, cuadrilla, cuadrilla, partner, partner]
  );

  return Number((rows as { total: number }[])[0]?.total || 0) > 0;
};

// Etiqueta: Verifica si gestion interna apago al tecnico el dia de hoy
const fueApagadoPorGestorHoy = async (idUser: string, fechaLima: string): Promise<boolean> => {
  const [rows] = await dbPool.query(
    `SELECT id_jornada
     FROM dev_JORNADAS_TECNICO
     WHERE id_user = ?
       AND estado = 'FINALIZADA'
       AND motivo_cierre = 'GESTOR'
       AND DATE(COALESCE(fin_at, inicio_at)) = ?
     ORDER BY id_jornada DESC
     LIMIT 1`,
    [idUser, fechaLima]
  );
  return Array.isArray(rows) && rows.length > 0;
};

// Etiqueta: Cierre automatico si paso de las 20:00 (Lima) y no tiene ordenes activas
const cerrarSiCorrespondePorHorario = async (
  idUser: string,
  tieneOrdenesActivas: boolean
): Promise<boolean> => {
  const { hora } = obtenerRelojLima();
  const fueraDeHorario = hora >= HORA_CORTE_JORNADA || hora < HORA_INICIO_JORNADA;

  if (!fueraDeHorario || tieneOrdenesActivas) return false;

  await dbPool.query(
    `UPDATE dev_JORNADAS_TECNICO
     SET estado = 'FINALIZADA',
         fin_at = NOW(),
         motivo_cierre = 'HORARIO_20H'
     WHERE id_user = ? AND estado = 'ACTIVA'`,
    [idUser]
  );

  locationStore.upsertInMemory({
    id_user: idUser,
    en_jornada: false,
    id_operacion_activa: null,
    estado_operativo: 'DESCONECTADO',
  });
  await locationStore.flushDirtyToDb([idUser]);
  return true;
};

// Etiqueta: 1. Consultar estado de jornada y reglas activas (auto-evaluacion en cada consulta)
rastreoRouter.get('/jornada/:idUser', async (req, res) => {
  const idUser = String(req.params.idUser || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  try {
    await locationStore.cerrarJornadasExpiradas();

    const { hora, fechaIso } = obtenerRelojLima();
    const [tieneOrdenesActivas, apagadoPorGestor] = await Promise.all([
      verificarOrdenesActivasTecnico(idUser),
      fueApagadoPorGestorHoy(idUser, fechaIso),
    ]);

    await cerrarSiCorrespondePorHorario(idUser, tieneOrdenesActivas);

    const [rows] = await dbPool.query(
      `SELECT id_jornada, id_user, estado,
              DATE_FORMAT(inicio_at, '%Y-%m-%dT%H:%i:%sZ') AS inicio_at,
              inicio_lat, inicio_lng
       FROM dev_JORNADAS_TECNICO
       WHERE id_user = ? AND estado = 'ACTIVA'
       ORDER BY id_jornada DESC
       LIMIT 1`,
      [idUser]
    );

    const jornada = (rows as Record<string, unknown>[])[0] || null;
    const ubicacion = locationStore.getByUser(idUser);
    const enHorarioLaboral = hora >= HORA_INICIO_JORNADA && hora < HORA_CORTE_JORNADA;
    const puedeIniciarAuto = !apagadoPorGestor && (enHorarioLaboral || tieneOrdenesActivas);

    res.json({
      en_jornada: Boolean(jornada),
      jornada,
      ubicacion,
      apagado_por_gestor: apagadoPorGestor,
      tiene_ordenes_activas: tieneOrdenesActivas,
      puede_iniciar_auto: puedeIniciarAuto,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Etiqueta: 2. Iniciar jornada automatica (respeta bloqueo de gestor y horario 20:00)
rastreoRouter.post('/jornada/iniciar', async (req, res) => {
  const { id_user, lat, lng, precision_m, bateria, forzado_por_gestor } = req.body;
  const idUser = String(id_user || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  const coord = validarCoord(lat, lng);
  const { hora, fechaIso } = obtenerRelojLima();

  try {
    if (!forzado_por_gestor) {
      const apagado = await fueApagadoPorGestorHoy(idUser, fechaIso);
      if (apagado) {
        return res.json({
          ok: false,
          en_jornada: false,
          apagado_por_gestor: true,
          jornada: null,
        });
      }

      const tieneOrdenesActivas = await verificarOrdenesActivasTecnico(idUser);
      const enHorarioLaboral = hora >= HORA_INICIO_JORNADA && hora < HORA_CORTE_JORNADA;
      if (!enHorarioLaboral && !tieneOrdenesActivas) {
        return res.json({
          ok: false,
          en_jornada: false,
          apagado_por_gestor: false,
          jornada: null,
        });
      }
    }
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }

  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const [activas] = await conn.query(
      `SELECT id_jornada, id_user, estado,
              DATE_FORMAT(inicio_at, '%Y-%m-%dT%H:%i:%sZ') AS inicio_at,
              inicio_lat, inicio_lng
       FROM dev_JORNADAS_TECNICO
       WHERE id_user = ? AND estado = 'ACTIVA'
       ORDER BY id_jornada DESC
       LIMIT 1`,
      [idUser]
    );

    let jornada = (activas as Record<string, unknown>[])[0];

    if (!jornada) {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO dev_JORNADAS_TECNICO (id_user, estado, inicio_at, inicio_lat, inicio_lng)
         VALUES (?, 'ACTIVA', NOW(), ?, ?)`,
        [idUser, coord?.lat ?? null, coord?.lng ?? null]
      );
      jornada = {
        id_jornada: result.insertId,
        id_user: idUser,
        estado: 'ACTIVA',
        inicio_at: new Date().toISOString(),
        inicio_lat: coord?.lat ?? null,
        inicio_lng: coord?.lng ?? null,
      };
    }

    await conn.commit();

    const vivo = locationStore.upsertInMemory({
      id_user: idUser,
      id_jornada: Number(jornada.id_jornada),
      en_jornada: true,
      lat: coord?.lat ?? null,
      lng: coord?.lng ?? null,
      precision_m: precision_m !== undefined ? Number(precision_m) : null,
      bateria: bateria !== undefined ? Number(bateria) : null,
    });
    await locationStore.flushDirtyToDb([idUser]);

    res.json({ ok: true, en_jornada: true, jornada, ubicacion: vivo });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: (error as Error).message });
  } finally {
    conn.release();
  }
});

// Etiqueta: 3. Finalizar jornada (por horario, logout o gestion interna)
rastreoRouter.post('/jornada/finalizar', async (req, res) => {
  const { id_user, lat, lng, motivo_cierre } = req.body;
  const idUser = String(id_user || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  const coord = validarCoord(lat, lng);
  const motivo = String(motivo_cierre || 'HORARIO_20H').trim().toUpperCase().slice(0, 40);

  try {
    const [result] = await dbPool.query<ResultSetHeader>(
      `UPDATE dev_JORNADAS_TECNICO
       SET estado = 'FINALIZADA',
           fin_at = NOW(),
           fin_lat = COALESCE(?, fin_lat),
           fin_lng = COALESCE(?, fin_lng),
           motivo_cierre = ?
       WHERE id_user = ? AND estado = 'ACTIVA'`,
      [coord?.lat ?? null, coord?.lng ?? null, motivo, idUser]
    );

    if (motivo === 'GESTOR' && result.affectedRows === 0) {
      await dbPool.query(
        `INSERT INTO dev_JORNADAS_TECNICO (id_user, estado, inicio_at, fin_at, motivo_cierre)
         VALUES (?, 'FINALIZADA', NOW(), NOW(), 'GESTOR')`,
        [idUser]
      );
    }

    const vivo = locationStore.upsertInMemory({
      id_user: idUser,
      en_jornada: false,
      lat: coord?.lat ?? null,
      lng: coord?.lng ?? null,
      id_operacion_activa: null,
      estado_operativo: 'DESCONECTADO',
    });
    await locationStore.flushDirtyToDb([idUser]);

    res.json({ ok: true, en_jornada: false, ubicacion: vivo });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Etiqueta: 3B. Gestion Interna - Apagar tecnico manualmente (bloquea auto-inicio del dia)
rastreoRouter.post('/gestor/apagar', async (req, res) => {
  const idUser = String(req.body.id_user || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  try {
    const [result] = await dbPool.query<ResultSetHeader>(
      `UPDATE dev_JORNADAS_TECNICO
       SET estado = 'FINALIZADA', fin_at = NOW(), motivo_cierre = 'GESTOR'
       WHERE id_user = ? AND estado = 'ACTIVA'`,
      [idUser]
    );

    if (result.affectedRows === 0) {
      await dbPool.query(
        `INSERT INTO dev_JORNADAS_TECNICO (id_user, estado, inicio_at, fin_at, motivo_cierre)
         VALUES (?, 'FINALIZADA', NOW(), NOW(), 'GESTOR')`,
        [idUser]
      );
    }

    const vivo = locationStore.upsertInMemory({
      id_user: idUser,
      en_jornada: false,
      id_operacion_activa: null,
      estado_operativo: 'DESCONECTADO',
    });
    await locationStore.flushDirtyToDb([idUser]);

    res.json({ ok: true, en_jornada: false, apagado_por_gestor: true, ubicacion: vivo });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Etiqueta: 3C. Gestion Interna - Rehabilitar tecnico apagado en el mismo dia
rastreoRouter.post('/gestor/habilitar', async (req, res) => {
  const idUser = String(req.body.id_user || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  try {
    const { fechaIso } = obtenerRelojLima();
    await dbPool.query(
      `UPDATE dev_JORNADAS_TECNICO
       SET motivo_cierre = 'GESTOR_REHABILITADO'
       WHERE id_user = ?
         AND estado = 'FINALIZADA'
         AND motivo_cierre = 'GESTOR'
         AND DATE(COALESCE(fin_at, inicio_at)) = ?`,
      [idUser, fechaIso]
    );
    res.json({ ok: true, apagado_por_gestor: false });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Etiqueta: 4. Ingesta rapida de ping GPS individual (RAM O(1), flush en lote cada 20s)
rastreoRouter.post('/ubicacion', (req, res) => {
  const {
    id_user,
    id_jornada,
    lat,
    lng,
    precision_m,
    velocidad_ms,
    bateria,
    id_operacion_activa,
    estado_operativo,
    capturado_at,
  } = req.body;

  const idUser = String(id_user || '').trim();
  if (!idUser) return res.status(400).json({ error: 'id_user requerido' });

  const coord = validarCoord(lat, lng);
  if (!coord) return res.status(400).json({ error: 'Coordenadas inválidas' });

  const estadoPrevio = locationStore.getByUser(idUser);
  if (estadoPrevio && !estadoPrevio.en_jornada) {
    return res.status(200).json({ ok: false, en_jornada: false });
  }

  locationStore.upsertInMemory({
    id_user: idUser,
    id_jornada: id_jornada !== undefined ? Number(id_jornada) : undefined,
    en_jornada: true,
    lat: coord.lat,
    lng: coord.lng,
    precision_m: precision_m !== undefined ? Number(precision_m) : null,
    velocidad_ms: velocidad_ms !== undefined ? Number(velocidad_ms) : null,
    bateria: bateria !== undefined ? Number(bateria) : null,
    id_operacion_activa: id_operacion_activa ? String(id_operacion_activa) : null,
    estado_operativo: estado_operativo ? String(estado_operativo).toUpperCase() : 'DISPONIBLE',
    capturado_at: capturado_at ? String(capturado_at) : undefined,
  });

  res.status(202).json({ ok: true, en_jornada: true });
});

// Etiqueta: 5. Ingesta por lote al recuperar cobertura 4G
rastreoRouter.post('/ubicacion/lote', (req, res) => {
  const { id_user, puntos } = req.body;
  const idUser = String(id_user || '').trim();
  if (!idUser || !Array.isArray(puntos) || puntos.length === 0) {
    return res.status(400).json({ error: 'id_user y puntos son obligatorios' });
  }

  let procesados = 0;
  for (const p of puntos as Record<string, unknown>[]) {
    const coord = validarCoord(p.lat, p.lng);
    if (!coord) continue;
    locationStore.upsertInMemory({
      id_user: idUser,
      id_jornada: p.id_jornada !== undefined ? Number(p.id_jornada) : undefined,
      en_jornada: true,
      lat: coord.lat,
      lng: coord.lng,
      precision_m: p.precision_m !== undefined ? Number(p.precision_m) : null,
      velocidad_ms: p.velocidad_ms !== undefined ? Number(p.velocidad_ms) : null,
      bateria: p.bateria !== undefined ? Number(p.bateria) : null,
      id_operacion_activa: p.id_operacion_activa ? String(p.id_operacion_activa) : null,
      estado_operativo: p.estado_operativo ? String(p.estado_operativo).toUpperCase() : 'DISPONIBLE',
      capturado_at: p.capturado_at ? String(p.capturado_at) : undefined,
    });
    procesados++;
  }

  res.status(202).json({ ok: true, procesados });
});

// Etiqueta: 6. Consulta en vivo de todos los tecnicos (base para Panel de Control y Asignacion por Coordenadas)
rastreoRouter.get('/tecnicos-vivo', async (req, res) => {
  const soloConectados = req.query.solo_conectados === '1';
  const partnerFiltro = String(req.query.partner || '').trim().toUpperCase();

  try {
    const [usuarios] = await dbPool.query(
      `SELECT id_user, dni, nombres, apellidos, contrata, cuadrilla, zona_distrito, telefono
       FROM dev_USER
       WHERE rol = 'TECNICO' AND activo = 1
       ORDER BY contrata ASC, cuadrilla ASC, nombres ASC`
    );

    const mapaVivo = new Map(locationStore.getSnapshot().map((r) => [r.id_user, r]));
    const ahoraMs = Date.now();

    const lista = (usuarios as Record<string, unknown>[])
      .filter((u) => {
        if (!partnerFiltro || partnerFiltro === 'TODOS') return true;
        return String(u.contrata || '').trim().toUpperCase() === partnerFiltro;
      })
      .map((u) => {
        const idUser = String(u.id_user);
        const vivo = mapaVivo.get(idUser);
        const ultimaMs = vivo?.ultima_actualizacion
          ? new Date(vivo.ultima_actualizacion.replace(' ', 'T') + 'Z').getTime()
          : 0;
        const segundosSinReporte = ultimaMs ? Math.max(0, Math.floor((ahoraMs - ultimaMs) / 1000)) : null;

        let estadoConexion: 'EN_LINEA' | 'SIN_SENAL' | 'DESCONECTADO' = 'DESCONECTADO';
        if (vivo?.en_jornada) {
          estadoConexion =
            segundosSinReporte !== null && segundosSinReporte <= 120 ? 'EN_LINEA' : 'SIN_SENAL';
        }

        return {
          id_user: idUser,
          dni: u.dni,
          nombre_completo: `${u.nombres || ''} ${u.apellidos || ''}`.trim(),
          contrata: u.contrata,
          cuadrilla: u.cuadrilla,
          zona_distrito: u.zona_distrito,
          telefono: u.telefono,
          estado_conexion: estadoConexion,
          en_jornada: Boolean(vivo?.en_jornada),
          lat: vivo?.lat ?? null,
          lng: vivo?.lng ?? null,
          precision_m: vivo?.precision_m ?? null,
          bateria: vivo?.bateria ?? null,
          id_operacion_activa: vivo?.id_operacion_activa ?? null,
          estado_operativo: vivo?.estado_operativo ?? 'DESCONECTADO',
          ultima_actualizacion: vivo?.ultima_actualizacion ?? null,
          segundos_sin_reporte: segundosSinReporte,
        };
      })
      .filter((item) => (!soloConectados ? true : item.en_jornada));

    res.json(lista);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});