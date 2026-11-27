import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clientesRouter } from './modules/clientes/clientes.routes';
import { operacionesRouter } from './modules/operaciones/operaciones.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { configuracionRouter } from './modules/configuracion/configuracion.routes';
import { authRouter } from './modules/auth/auth.routes';
import { apkRouter } from './modules/apk/apk.routes';
import { rastreoRouter } from './modules/rastreo/rastreo.routes';
import { locationStore } from './services/locationStore';
import { ensureTablaOperacionLogs } from './services/operacionLogService';

const app = express();
app.set('trust proxy', 1);

const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenesPermitidos.length > 0 ? origenesPermitidos : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'perufibra-api' });
});

app.use('/api/clientes', clientesRouter);
app.use('/api/operaciones', operacionesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/configuracion', configuracionRouter);
app.use('/api/auth', authRouter);
app.use('/api/apk', apkRouter);
app.use('/api/rastreo', rastreoRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend PeruFibra modular activo en http://localhost:${PORT}`);
  ensureTablaOperacionLogs().catch((err) => console.error('[OperacionLogs] Init error:', err));
  locationStore.init().catch((err) => console.error('[LocationStore] Init error:', err));
});

// Etiqueta: Guardado de emergencia al detener el proceso del servidor
const apagarLimpio = async () => {
  await locationStore.flushDirtyToDb().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', apagarLimpio);
process.on('SIGTERM', apagarLimpio);
