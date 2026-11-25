import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

const GCS_PREFIX = 'gcs://';
const LOCAL_PREFIX = 'local://';
const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const gcpProjectId = process.env.GCP_PROJECT_ID?.trim();
const gcsBucketName = process.env.GCS_BUCKET_NAME?.trim();
const preferredDriver = (process.env.STORAGE_DRIVER || (gcsBucketName ? 'gcs' : 'local')).toLowerCase();

const storageClient = gcsBucketName
  ? new Storage(gcpProjectId ? { projectId: gcpProjectId } : undefined)
  : null;

interface ParsedDataUrl {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

const sanitizeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'general';

export const parseImageDataUrl = (dataUrl: string): ParsedDataUrl => {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Formato de imagen inválido: se esperaba un data URL en Base64');
  }

  const contentType = match[1].toLowerCase();
  const base64Payload = match[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length === 0) {
    throw new Error('La imagen recibida está vacía');
  }

  const extension = MIME_TO_EXT[contentType] || 'jpg';
  return { buffer, contentType, extension };
};

const saveToLocalDisk = async (objectPath: string, buffer: Buffer): Promise<string> => {
  const fullPath = path.join(LOCAL_UPLOAD_ROOT, objectPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);
  return `${LOCAL_PREFIX}${objectPath}`;
};

export interface UploadEvidenceResult {
  storageRef: string;
  driver: 'gcs' | 'local';
  sizeBytes: number;
}

export const uploadEvidenceImage = async (
  idOperacion: string,
  seccion: string,
  dataUrl: string
): Promise<UploadEvidenceResult> => {
  const { buffer, contentType, extension } = parseImageDataUrl(dataUrl);
  const safeOp = sanitizeSegment(idOperacion);
  const safeSec = sanitizeSegment(seccion);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
  const objectPath = `evidencias/${safeOp}/${safeSec}/${uniqueName}`;

  if (preferredDriver === 'gcs' && storageClient && gcsBucketName) {
    try {
      const file = storageClient.bucket(gcsBucketName).file(objectPath);
      await file.save(buffer, {
        resumable: false,
        contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });
      return {
        storageRef: `${GCS_PREFIX}${objectPath}`,
        driver: 'gcs',
        sizeBytes: buffer.length,
      };
    } catch (error) {
      const msg = (error as Error).message || String(error);
      console.warn(
        `[Storage] Falló subida a GCS (${gcsBucketName}): ${msg}. ` +
          'Si usás ADC local, renová con "gcloud auth application-default login". Guardando en disco local.'
      );
    }
  }

  const storageRef = await saveToLocalDisk(objectPath, buffer);
  return {
    storageRef,
    driver: 'local',
    sizeBytes: buffer.length,
  };
};

export const deleteEvidenceImage = async (storageRef: string | null | undefined): Promise<void> => {
  if (!storageRef) return;

  if (storageRef.startsWith(GCS_PREFIX) && storageClient && gcsBucketName) {
    const objectPath = storageRef.slice(GCS_PREFIX.length);
    try {
      await storageClient.bucket(gcsBucketName).file(objectPath).delete({ ignoreNotFound: true });
    } catch (error) {
      console.warn(`[Storage] No se pudo eliminar objeto GCS ${objectPath}:`, (error as Error).message);
    }
    return;
  }

  if (storageRef.startsWith(LOCAL_PREFIX)) {
    const objectPath = storageRef.slice(LOCAL_PREFIX.length);
    const fullPath = path.resolve(LOCAL_UPLOAD_ROOT, objectPath);
    if (!fullPath.startsWith(LOCAL_UPLOAD_ROOT)) return;
    await fs.promises.unlink(fullPath).catch(() => {});
  }
};

export const streamEvidenceImage = async (storageRef: string, res: Response): Promise<void> => {
  if (storageRef.startsWith(GCS_PREFIX)) {
    if (!storageClient || !gcsBucketName) {
      res.status(503).json({ error: 'GCS no configurado en el servidor' });
      return;
    }
    const objectPath = storageRef.slice(GCS_PREFIX.length);
    const file = storageClient.bucket(gcsBucketName).file(objectPath);
    const ext = path.extname(objectPath).toLowerCase();
    res.setHeader('Content-Type', EXT_TO_MIME[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = file.createReadStream();
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(404).json({ error: `No se pudo leer la imagen desde GCS: ${err.message}` });
      }
    });
    stream.pipe(res);
    return;
  }

  if (storageRef.startsWith(LOCAL_PREFIX)) {
    const objectPath = storageRef.slice(LOCAL_PREFIX.length);
    const fullPath = path.resolve(LOCAL_UPLOAD_ROOT, objectPath);
    if (!fullPath.startsWith(LOCAL_UPLOAD_ROOT) || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Imagen local no encontrada' });
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.setHeader('Content-Type', EXT_TO_MIME[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(fullPath).pipe(res);
    return;
  }

  if (storageRef.startsWith('data:')) {
    const { buffer, contentType } = parseImageDataUrl(storageRef);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
    return;
  }

  res.redirect(storageRef);
};

export const buildPublicEvidenceUrl = (
  req: Request,
  idEvidencia: number,
  rawUrlArchivo: string
): string => {
  if (rawUrlArchivo.startsWith(GCS_PREFIX) || rawUrlArchivo.startsWith(LOCAL_PREFIX)) {
    const host = req.get('host');
    return `${req.protocol}://${host}/api/apk/evidencias/${idEvidencia}/archivo`;
  }
  return rawUrlArchivo;
};
