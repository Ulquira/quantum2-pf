// Etiqueta: Servicio centralizado de auditoria e historial de movimientos por orden (dev_OPERACION_LOGS)
import type { Request } from 'express';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { dbPool } from '../config/db';

export type OrigenLogOperacion = 'WEB' | 'APK' | 'SISTEMA';

export type AccionLogOperacion =
  | 'PROGRAMACION'
  | 'ASIGNACION'
  | 'CAMBIO_ESTADO'
  | 'REPROGRAMACION'
  | 'INICIO_ATENCION'
  | 'DATOS_TECNICOS'
  | 'CIERRE_ORDEN'
  | 'EVIDENCIA_SUBIDA'
  | 'EVIDENCIA_ELIMINADA';

export interface ActorLog {
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
}

export interface NuevoLogOperacion {
  IDoperacion: string;
  valida_cod_pedido?: string | null;
  origen: OrigenLogOperacion;
  accion: AccionLogOperacion;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  subestado_nuevo?: string | null;
  actor?: ActorLog;
  detalle?: string | null;
  cambios?: Record<string, unknown> | null;
}

// Etiqueta: Creacion idempotente de la tabla dev_OPERACION_LOGS e indices de consulta rapida
export const ensureTablaOperacionLogs = async (
  executor: Pool | PoolConnection = dbPool
): Promise<void> => {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS dev_OPERACION_LOGS (
      id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
      IDoperacion VARCHAR(60) NOT NULL,
      valida_cod_pedido VARCHAR(60) NULL,
      origen VARCHAR(20) NOT NULL DEFAULT 'WEB',
      accion VARCHAR(40) NOT NULL,
      estado_anterior VARCHAR(50) NULL,
      estado_nuevo VARCHAR(50) NULL,
      subestado_nuevo VARCHAR(180) NULL,
      usuario_id VARCHAR(40) NULL,
      usuario_nombre VARCHAR(160) NULL,
      usuario_rol VARCHAR(30) NULL,
      detalle VARCHAR(500) NULL,
      cambios_json JSON NULL,
      fecha_evento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_log_operacion (IDoperacion, fecha_evento),
      INDEX idx_log_pedido (valida_cod_pedido, fecha_evento)
    )
  `);
};

const decodificarHeader = (valor: string | undefined): string | null => {
  if (!valor) return null;
  try {
    return decodeURIComponent(valor).trim() || null;
  } catch {
    return valor.trim() || null;
  }
};

// Etiqueta: Extrae el usuario autenticado desde cabeceras HTTP o resuelve tecnico de respaldo en BD
export const extraerActorRequest = async (
  req: Request,
  idUsuarioFallback?: string | null
): Promise<ActorLog> => {
  const headerId = decodificarHeader(req.header('x-user-id'));
  const headerNombre = decodificarHeader(req.header('x-user-name'));
  const headerRol = decodificarHeader(req.header('x-user-rol'));

  const idFinal = headerId || (idUsuarioFallback ? String(idUsuarioFallback).trim() : null);

  if (idFinal && !headerNombre) {
    try {
      const [rows] = await dbPool.query(
        'SELECT nombres, apellidos, rol FROM dev_USER WHERE id_user = ? OR dni = ? LIMIT 1',
        [idFinal, idFinal]
      );
      const u = (rows as { nombres?: string; apellidos?: string; rol?: string }[])[0];
      if (u) {
        return {
          usuario_id: idFinal,
          usuario_nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || idFinal,
          usuario_rol: headerRol || u.rol || null,
        };
      }
    } catch {
      // Continua con valores de respaldo si falla lectura auxiliar
    }
  }

  return {
    usuario_id: idFinal,
    usuario_nombre: headerNombre || idFinal,
    usuario_rol: headerRol,
  };
};

// Etiqueta: Inserta un movimiento en dev_OPERACION_LOGS dentro o fuera de una transaccion SQL
export const registrarLogOperacion = async (
  input: NuevoLogOperacion,
  executor: Pool | PoolConnection = dbPool
): Promise<void> => {
  try {
    let codPedido = input.valida_cod_pedido ?? null;

    if (!codPedido && input.IDoperacion) {
      const [opRows] = await executor.query(
        'SELECT valida_cod_pedido FROM dev_OPERACION WHERE IDoperacion = ? LIMIT 1',
        [input.IDoperacion]
      );
      codPedido = (opRows as { valida_cod_pedido?: string | null }[])[0]?.valida_cod_pedido ?? null;
    }

    await executor.query(
      `INSERT INTO dev_OPERACION_LOGS (
        IDoperacion, valida_cod_pedido, origen, accion,
        estado_anterior, estado_nuevo, subestado_nuevo,
        usuario_id, usuario_nombre, usuario_rol, detalle, cambios_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.IDoperacion,
        codPedido,
        input.origen,
        input.accion,
        input.estado_anterior ?? null,
        input.estado_nuevo ?? null,
        input.subestado_nuevo ?? null,
        input.actor?.usuario_id ?? null,
        input.actor?.usuario_nombre ?? null,
        input.actor?.usuario_rol ?? null,
        input.detalle ? input.detalle.slice(0, 500) : null,
        input.cambios ? JSON.stringify(input.cambios) : null,
      ]
    );
  } catch (error) {
    console.warn('[OperacionLog] No se pudo registrar log:', (error as Error).message);
  }
};