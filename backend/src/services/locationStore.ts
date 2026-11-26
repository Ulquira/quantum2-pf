// Etiqueta: Almacen escalable de ubicaciones en vivo (RAM + Bulk Upsert a MySQL, listo para swap a Redis)
import { dbPool } from '../config/db';

export interface RegistroUbicacionVivo {
  id_user: string;
  id_jornada: number | null;
  en_jornada: boolean;
  lat: number | null;
  lng: number | null;
  precision_m: number | null;
  velocidad_ms: number | null;
  bateria: number | null;
  id_operacion_activa: string | null;
  estado_operativo: string | null;
  ultima_actualizacion: string;
}

export interface EntradaUbicacionPing {
  id_user: string;
  id_jornada?: number | null;
  en_jornada?: boolean;
  lat?: number | null;
  lng?: number | null;
  precision_m?: number | null;
  velocidad_ms?: number | null;
  bateria?: number | null;
  id_operacion_activa?: string | null;
  estado_operativo?: string | null;
  capturado_at?: string;
}

const FLUSH_INTERVAL_MS = Number(process.env.LOCATION_FLUSH_INTERVAL_MS || 20_000);
const MAX_HORAS_JORNADA_ABIERTA = 14;

const formatearMysqlDatetime = (fecha: Date): string =>
  fecha.toISOString().slice(0, 19).replace('T', ' ');

class MemoryBulkLocationStore {
  private readonly cache = new Map<string, RegistroUbicacionVivo>();
  private readonly sucios = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private escribiendo = false;

  // Etiqueta: Hidratacion inicial desde MySQL para conservar estados tras reinicios
  async init(): Promise<void> {
    try {
      const [rows] = await dbPool.query(
        `SELECT id_user, id_jornada, en_jornada, lat, lng, precision_m,
                velocidad_ms, bateria, id_operacion_activa, estado_operativo,
                DATE_FORMAT(ultima_actualizacion, '%Y-%m-%d %H:%i:%s') AS ultima_actualizacion
         FROM dev_TECNICO_UBICACION`
      );

      for (const r of rows as Record<string, unknown>[]) {
        const idUser = String(r.id_user);
        this.cache.set(idUser, {
          id_user: idUser,
          id_jornada: r.id_jornada !== null ? Number(r.id_jornada) : null,
          en_jornada: Number(r.en_jornada) === 1,
          lat: r.lat !== null ? Number(r.lat) : null,
          lng: r.lng !== null ? Number(r.lng) : null,
          precision_m: r.precision_m !== null ? Number(r.precision_m) : null,
          velocidad_ms: r.velocidad_ms !== null ? Number(r.velocidad_ms) : null,
          bateria: r.bateria !== null ? Number(r.bateria) : null,
          id_operacion_activa: r.id_operacion_activa ? String(r.id_operacion_activa) : null,
          estado_operativo: r.estado_operativo ? String(r.estado_operativo) : null,
          ultima_actualizacion: r.ultima_actualizacion
            ? String(r.ultima_actualizacion)
            : formatearMysqlDatetime(new Date()),
        });
      }
    } catch (err) {
      console.warn(
        '[LocationStore] Tabla dev_TECNICO_UBICACION no disponible aún. Ejecuta "npm run db:migrate":',
        (err as Error).message
      );
    }

    if (!this.timer) {
      this.timer = setInterval(() => {
        this.flushDirtyToDb().catch((e) =>
          console.error('[LocationStore] Error en flush periódico:', (e as Error).message)
        );
      }, FLUSH_INTERVAL_MS);
    }
  }

  // Etiqueta: Actualizacion O(1) en memoria para absorber cientos de pings/seg sin bloquear MySQL
  upsertInMemory(input: EntradaUbicacionPing): RegistroUbicacionVivo {
    const previo = this.cache.get(input.id_user);
    const fecha = input.capturado_at ? new Date(input.capturado_at) : new Date();
    const fechaValida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;

    const actualizado: RegistroUbicacionVivo = {
      id_user: input.id_user,
      id_jornada: input.id_jornada !== undefined ? input.id_jornada : previo?.id_jornada ?? null,
      en_jornada: input.en_jornada !== undefined ? input.en_jornada : previo?.en_jornada ?? true,
      lat: input.lat !== undefined && input.lat !== null ? input.lat : previo?.lat ?? null,
      lng: input.lng !== undefined && input.lng !== null ? input.lng : previo?.lng ?? null,
      precision_m:
        input.precision_m !== undefined && input.precision_m !== null
          ? Math.round(input.precision_m)
          : previo?.precision_m ?? null,
      velocidad_ms:
        input.velocidad_ms !== undefined ? input.velocidad_ms : previo?.velocidad_ms ?? null,
      bateria:
        input.bateria !== undefined && input.bateria !== null
          ? Math.min(100, Math.max(0, Math.round(input.bateria)))
          : previo?.bateria ?? null,
      id_operacion_activa:
        input.id_operacion_activa !== undefined
          ? input.id_operacion_activa
          : previo?.id_operacion_activa ?? null,
      estado_operativo:
        input.estado_operativo !== undefined
          ? input.estado_operativo
          : previo?.estado_operativo ?? null,
      ultima_actualizacion: formatearMysqlDatetime(fechaValida),
    };

    this.cache.set(input.id_user, actualizado);
    this.sucios.add(input.id_user);
    return actualizado;
  }

  getByUser(idUser: string): RegistroUbicacionVivo | null {
    return this.cache.get(idUser) || null;
  }

  getSnapshot(): RegistroUbicacionVivo[] {
    return Array.from(this.cache.values());
  }

  // Etiqueta: Escritura por lote (1 solo query SQL para N tecnicos)
  async flushDirtyToDb(idsEspecificos?: string[]): Promise<number> {
    if (this.escribiendo && !idsEspecificos) return 0;

    const ids = idsEspecificos
      ? idsEspecificos.filter((id) => this.cache.has(id))
      : Array.from(this.sucios);

    if (ids.length === 0) return 0;

    if (!idsEspecificos) this.escribiendo = true;
    const filas: unknown[][] = [];

    for (const id of ids) {
      const r = this.cache.get(id);
      if (!r) continue;
      filas.push([
        r.id_user,
        r.id_jornada,
        r.en_jornada ? 1 : 0,
        r.lat,
        r.lng,
        r.precision_m,
        r.velocidad_ms,
        r.bateria,
        r.id_operacion_activa,
        r.estado_operativo,
        r.ultima_actualizacion,
      ]);
      this.sucios.delete(id);
    }

    try {
      await dbPool.query(
        `INSERT INTO dev_TECNICO_UBICACION (
          id_user, id_jornada, en_jornada, lat, lng, precision_m,
          velocidad_ms, bateria, id_operacion_activa, estado_operativo, ultima_actualizacion
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          id_jornada = VALUES(id_jornada),
          en_jornada = VALUES(en_jornada),
          lat = COALESCE(VALUES(lat), lat),
          lng = COALESCE(VALUES(lng), lng),
          precision_m = COALESCE(VALUES(precision_m), precision_m),
          velocidad_ms = VALUES(velocidad_ms),
          bateria = COALESCE(VALUES(bateria), bateria),
          id_operacion_activa = VALUES(id_operacion_activa),
          estado_operativo = VALUES(estado_operativo),
          ultima_actualizacion = VALUES(ultima_actualizacion)`,
        [filas]
      );
      return filas.length;
    } catch (error) {
      // Re-encola si hubo fallo transitorio de red hacia BD
      for (const id of ids) this.sucios.add(id);
      throw error;
    } finally {
      if (!idsEspecificos) this.escribiendo = false;
    }
  }

  // Etiqueta: Auto-cierre preventivo de jornadas abiertas por mas de 14 horas
  async cerrarJornadasExpiradas(): Promise<void> {
    await dbPool.query(
      `UPDATE dev_JORNADAS_TECNICO
       SET estado = 'FINALIZADA', fin_at = NOW(), motivo_cierre = 'AUTO_EXPIRACION'
       WHERE estado = 'ACTIVA'
         AND inicio_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [MAX_HORAS_JORNADA_ABIERTA]
    );
  }
}

export const locationStore = new MemoryBulkLocationStore();