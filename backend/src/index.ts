import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clientesRouter } from './modules/clientes/clientes.routes';
import { operacionesRouter } from './modules/operaciones/operaciones.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { configuracionRouter } from './modules/configuracion/configuracion.routes';
import { authRouter } from './modules/auth/auth.routes';
import { apkRouter } from './modules/apk/apk.routes';

const app = express();
app.use(cors());
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend PeruFibra modular activo en http://localhost:${PORT}`);
});
