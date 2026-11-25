import 'dotenv/config';
import { dbPool } from '../config/db';
import { SEMILLA_CATALOGO_PERUFIBRA } from '../config/semillaEstados';

interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
}

interface IndexInfo {
  Key_name: string;
  Non_unique: number;
}

const ensureIndex = async (table: string, indexName: string, columnsSql: string) => {
  const [rows] = await dbPool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
  if (Array.isArray(rows) && rows.length === 0) {
    await dbPool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnsSql})`);
    console.log(`[migrate] + Índice ${table}.${indexName}`);
  }
};

const migrateClientes = async () => {
  const [cols] = await dbPool.query("SHOW COLUMNS FROM dev_CLIENTES LIKE 'datos_comerciales_xls'");
  if (Array.isArray(cols) && cols.length === 0) {
    await dbPool.query(
      'ALTER TABLE dev_CLIENTES ADD COLUMN datos_comerciales_xls JSON NULL AFTER detalle_predio'
    );
    console.log('[migrate] + Columna dev_CLIENTES.datos_comerciales_xls');
  }

  await ensureIndex('dev_CLIENTES', 'idx_clientes_fecha_registro', 'fecha_registro');
  await ensureIndex('dev_CLIENTES', 'idx_clientes_distrito', 'Distrito');
  await ensureIndex('dev_CLIENTES', 'idx_clientes_dni', 'dni_cliente');
};

const migrateOperacion = async () => {
  const [cols] = await dbPool.query('SHOW COLUMNS FROM dev_OPERACION');
  const listaCols = cols as ColumnInfo[];
  const nombresCols = new Set(listaCols.map((c) => c.Field));

  const columnasRequeridas: [string, string][] = [
    ['Motivo', 'VARCHAR(255) NULL'],
    ['Observaciones', 'TEXT NULL'],
    ['H_Progra', 'DATETIME NULL'],
    ['H_Inicio', 'DATETIME NULL'],
    ['H_Fin', 'DATETIME NULL'],
    ['H_ultimo_movimiento', 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP'],
    ['es_ultimo_cod', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['Conteo_Operaciones', 'INT NOT NULL DEFAULT 1'],
    ['datos_cto', 'JSON NULL'],
    ['datos_equipos', 'JSON NULL'],
    ['tokens', 'JSON NULL'],
  ];

  for (const [nombreCol, definicion] of columnasRequeridas) {
    if (!nombresCols.has(nombreCol)) {
      await dbPool.query(`ALTER TABLE dev_OPERACION ADD COLUMN \`${nombreCol}\` ${definicion}`);
      console.log(`[migrate] + Columna dev_OPERACION.${nombreCol}`);
    }
  }

  await dbPool.query(
    "ALTER TABLE dev_OPERACION MODIFY COLUMN Estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'"
  );

  if (nombresCols.has('SubEstado')) {
    await dbPool.query(
      'ALTER TABLE dev_OPERACION MODIFY COLUMN SubEstado VARCHAR(180) NULL DEFAULT NULL'
    );
  } else {
    await dbPool.query(
      'ALTER TABLE dev_OPERACION ADD COLUMN SubEstado VARCHAR(180) NULL DEFAULT NULL AFTER Estado'
    );
  }

  const colsOpcionalesDespacho = ['Partner', 'Cuadrilla', 'F_Asignacion', 'Tramo_Atencio', 'H_Progra'];
  for (const col of listaCols) {
    if (colsOpcionalesDespacho.includes(col.Field) && col.Null === 'NO' && col.Key !== 'PRI') {
      await dbPool.query(
        `ALTER TABLE dev_OPERACION MODIFY COLUMN \`${col.Field}\` ${col.Type} NULL DEFAULT NULL`
      );
    }
  }

  await ensureIndex('dev_OPERACION', 'idx_op_fecha_gestion', 'Fecha_Gestion, IDoperacion');
  await ensureIndex('dev_OPERACION', 'idx_op_ultimo_estado', 'es_ultimo_cod, Estado');
  await ensureIndex('dev_OPERACION', 'idx_op_valida_cod', 'valida_cod_pedido');
  await ensureIndex('dev_OPERACION', 'idx_op_tecnico', 'id_tecnico');
  await ensureIndex('dev_OPERACION', 'idx_op_cuadrilla', 'Cuadrilla');
};

const migrateUsuarios = async () => {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS dev_USER (
      id_user VARCHAR(40) PRIMARY KEY,
      dni VARCHAR(20) NOT NULL UNIQUE,
      nombres VARCHAR(120) NOT NULL,
      apellidos VARCHAR(120) NOT NULL,
      correo VARCHAR(150) NULL,
      telefono VARCHAR(30) NULL,
      rol VARCHAR(30) NOT NULL DEFAULT 'TECNICO',
      contrata VARCHAR(100) NULL DEFAULT 'PERUFIBRA',
      cuadrilla VARCHAR(80) NULL,
      zona_distrito VARCHAR(120) NULL,
      password_hash VARCHAR(255) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columnasExtra: [string, string][] = [
    ['correo', 'VARCHAR(150) NULL AFTER apellidos'],
    ['telefono', 'VARCHAR(30) NULL AFTER correo'],
    ['password_hash', 'VARCHAR(255) NULL AFTER zona_distrito'],
    ['fecha_creacion', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
  ];

  for (const [col, def] of columnasExtra) {
    const [existe] = await dbPool.query(`SHOW COLUMNS FROM dev_USER LIKE '${col}'`);
    if (Array.isArray(existe) && existe.length === 0) {
      await dbPool.query(`ALTER TABLE dev_USER ADD COLUMN ${col} ${def}`);
      console.log(`[migrate] + Columna dev_USER.${col}`);
    }
  }

  await dbPool.query(
    "ALTER TABLE dev_USER MODIFY COLUMN rol VARCHAR(30) NOT NULL DEFAULT 'TECNICO'"
  );

  const [todasCols] = await dbPool.query('SHOW COLUMNS FROM dev_USER');
  const colsNoClave = [
    'email',
    'correo',
    'telefono',
    'password',
    'password_hash',
    'contrata',
    'cuadrilla',
    'zona_distrito',
  ];

  for (const c of todasCols as ColumnInfo[]) {
    if (colsNoClave.includes(c.Field) && c.Null === 'NO' && c.Key !== 'PRI') {
      await dbPool.query(`ALTER TABLE dev_USER MODIFY COLUMN \`${c.Field}\` ${c.Type} NULL DEFAULT NULL`);
    }
  }
};

const migrateCatalogoEstados = async () => {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS dev_CATALOGO_ESTADOS (
      id_catalogo INT AUTO_INCREMENT PRIMARY KEY,
      modulo VARCHAR(30) NOT NULL DEFAULT 'OPERACION',
      estado VARCHAR(50) NOT NULL,
      subestado VARCHAR(180) NOT NULL,
      requiere_foto TINYINT(1) NOT NULL DEFAULT 0,
      requiere_comentario TINYINT(1) NOT NULL DEFAULT 0,
      visible_apk TINYINT(1) NOT NULL DEFAULT 1,
      es_final TINYINT(1) NOT NULL DEFAULT 0,
      color_hex VARCHAR(10) NOT NULL DEFAULT '#7E7E7E',
      orden INT NOT NULL DEFAULT 1,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uk_mod_est_sub (modulo, estado, subestado)
    )
  `);

  await dbPool.query('ALTER TABLE dev_CATALOGO_ESTADOS MODIFY COLUMN estado VARCHAR(50) NOT NULL');
  await dbPool.query('ALTER TABLE dev_CATALOGO_ESTADOS MODIFY COLUMN subestado VARCHAR(180) NOT NULL');

  const [tieneGenerica] = await dbPool.query(
    "SELECT COUNT(*) AS antiguo FROM dev_CATALOGO_ESTADOS WHERE subestado = 'SIN_PARTNER'"
  );
  const [conteo] = await dbPool.query('SELECT COUNT(*) AS total FROM dev_CATALOGO_ESTADOS');

  const esAntiguo = Number((tieneGenerica as { antiguo: number }[])[0]?.antiguo || 0) > 0;
  const total = Number((conteo as { total: number }[])[0]?.total || 0);

  if (total === 0 || esAntiguo) {
    await dbPool.query('TRUNCATE TABLE dev_CATALOGO_ESTADOS');
  }

  await dbPool.query(
    `INSERT IGNORE INTO dev_CATALOGO_ESTADOS
      (modulo, estado, subestado, requiere_foto, requiere_comentario, visible_apk, es_final, color_hex, orden)
     VALUES ?`,
    [SEMILLA_CATALOGO_PERUFIBRA]
  );
};

const migrateEvidencias = async () => {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS dev_EVIDENCIAS (
      id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
      IDoperacion VARCHAR(60) NOT NULL,
      seccion VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
      tipo_foto VARCHAR(120) NOT NULL DEFAULT 'FOTO',
      url_archivo LONGTEXT NOT NULL,
      id_tecnico VARCHAR(40) NULL,
      fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ev_operacion (IDoperacion)
    )
  `);

  const [colsRaw] = await dbPool.query('SHOW COLUMNS FROM dev_EVIDENCIAS');
  const cols = colsRaw as ColumnInfo[];
  const nombres = new Set(cols.map((c) => c.Field));

  if (!nombres.has('id_evidencia')) {
    const tienePk = cols.some((c) => c.Key === 'PRI');
    if (!tienePk) {
      await dbPool.query(
        'ALTER TABLE dev_EVIDENCIAS ADD COLUMN id_evidencia INT AUTO_INCREMENT PRIMARY KEY FIRST'
      );
    } else {
      await dbPool.query('ALTER TABLE dev_EVIDENCIAS ADD COLUMN id_evidencia INT NULL FIRST');
    }
  }

  const requeridas: [string, string][] = [
    ['IDoperacion', "VARCHAR(60) NOT NULL DEFAULT ''"],
    ['seccion', "VARCHAR(40) NOT NULL DEFAULT 'GENERAL'"],
    ['tipo_foto', "VARCHAR(120) NOT NULL DEFAULT 'FOTO'"],
    ['url_archivo', 'LONGTEXT NULL'],
    ['id_tecnico', 'VARCHAR(40) NULL'],
    ['fecha_subida', 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP'],
  ];

  for (const [col, def] of requeridas) {
    if (!nombres.has(col)) {
      await dbPool.query(`ALTER TABLE dev_EVIDENCIAS ADD COLUMN \`${col}\` ${def}`);
    }
  }

  await dbPool.query("ALTER TABLE dev_EVIDENCIAS MODIFY COLUMN seccion VARCHAR(40) NOT NULL DEFAULT 'GENERAL'");
  await dbPool.query("ALTER TABLE dev_EVIDENCIAS MODIFY COLUMN tipo_foto VARCHAR(120) NOT NULL DEFAULT 'FOTO'");
  await dbPool.query('ALTER TABLE dev_EVIDENCIAS MODIFY COLUMN url_archivo LONGTEXT NULL');

  const [colsActualizadas] = await dbPool.query('SHOW COLUMNS FROM dev_EVIDENCIAS');
  const colsSistema = new Set([
    'id_evidencia',
    'IDoperacion',
    'seccion',
    'tipo_foto',
    'url_archivo',
    'id_tecnico',
    'fecha_subida',
  ]);
  for (const c of colsActualizadas as ColumnInfo[]) {
    if (!colsSistema.has(c.Field) && c.Null === 'NO' && c.Key !== 'PRI') {
      await dbPool.query(`ALTER TABLE dev_EVIDENCIAS MODIFY COLUMN \`${c.Field}\` ${c.Type} NULL DEFAULT NULL`);
    }
  }

  const [indicesRaw] = await dbPool.query('SHOW INDEX FROM dev_EVIDENCIAS');
  for (const idx of indicesRaw as IndexInfo[]) {
    if (idx.Key_name !== 'PRIMARY' && Number(idx.Non_unique) === 0) {
      await dbPool.query(`ALTER TABLE dev_EVIDENCIAS DROP INDEX \`${idx.Key_name}\``).catch(() => {});
    }
  }

  await ensureIndex('dev_EVIDENCIAS', 'idx_ev_operacion', 'IDoperacion');
};

const runMigrations = async () => {
  console.log('[migrate] Iniciando migraciones de esquema e índices...');
  await migrateClientes();
  await migrateOperacion();
  await migrateUsuarios();
  await migrateCatalogoEstados();
  await migrateEvidencias();
  console.log('[migrate] Migraciones completadas correctamente.');
};

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] Error en migraciones:', err);
    process.exit(1);
  });
