import { apiClient } from '../../../lib/apiClient';
import type { EvidenciaItem, SeccionApkId } from '../types/apk.types';

const DB_NAME = 'pf_apk_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

export interface OfflinePatchCamposItem {
  key: string;
  kind: 'PATCH_CAMPOS';
  idOperacion: string;
  payload: Record<string, string>;
  createdAt: number;
}

export interface OfflineUploadFotoItem {
  key: string;
  kind: 'UPLOAD_FOTO';
  idOperacion: string;
  seccion: SeccionApkId;
  tipo_foto: string;
  data_url: string;
  id_tecnico: string;
  createdAt: number;
}

export type OfflineQueueItem = OfflinePatchCamposItem | OfflineUploadFotoItem;

export const isNetworkError = (err: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('err_network') ||
    msg.includes('timeout') ||
    msg.includes('error de conexión')
  );
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB'));
  });

const runTx = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
};

export const enqueuePatchCampos = async (
  idOperacion: string,
  payload: Record<string, string>
): Promise<void> => {
  const item: OfflinePatchCamposItem = {
    key: `patch:${idOperacion}`,
    kind: 'PATCH_CAMPOS',
    idOperacion,
    payload,
    createdAt: Date.now(),
  };
  await runTx('readwrite', (store) => store.put(item));
};

export const enqueueUploadFoto = async (
  idOperacion: string,
  seccion: SeccionApkId,
  tipo_foto: string,
  data_url: string,
  id_tecnico: string
): Promise<OfflineUploadFotoItem> => {
  const item: OfflineUploadFotoItem = {
    key: `foto:${idOperacion}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    kind: 'UPLOAD_FOTO',
    idOperacion,
    seccion,
    tipo_foto,
    data_url,
    id_tecnico,
    createdAt: Date.now(),
  };
  await runTx('readwrite', (store) => store.put(item));
  return item;
};

export const getPendingItems = async (idOperacion?: string): Promise<OfflineQueueItem[]> => {
  const all = (await runTx('readonly', (store) => store.getAll())) as OfflineQueueItem[];
  const sorted = all.sort((a, b) => a.createdAt - b.createdAt);
  return idOperacion ? sorted.filter((i) => i.idOperacion === idOperacion) : sorted;
};

export const pendingPhotosToEvidencias = (items: OfflineQueueItem[]): EvidenciaItem[] =>
  items
    .filter((i): i is OfflineUploadFotoItem => i.kind === 'UPLOAD_FOTO')
    .map((i) => ({
      seccion: i.seccion,
      tipo_foto: i.tipo_foto,
      url_archivo: i.data_url,
      fecha_subida: new Date(i.createdAt).toISOString(),
    }));

const removeItem = async (key: string): Promise<void> => {
  await runTx('readwrite', (store) => store.delete(key));
};

export const flushOfflineQueue = async (
  idOperacion?: string
): Promise<{ synced: number; remaining: number }> => {
  const pending = await getPendingItems(idOperacion);
  let synced = 0;

  for (const item of pending) {
    try {
      if (item.kind === 'PATCH_CAMPOS') {
        await apiClient.patch(`/apk/ordenes/${item.idOperacion}/gestionar`, item.payload);
      } else if (item.kind === 'UPLOAD_FOTO') {
        await apiClient.post(`/apk/ordenes/${item.idOperacion}/evidencia`, {
          seccion: item.seccion,
          tipo_foto: item.tipo_foto,
          data_url: item.data_url,
          id_tecnico: item.id_tecnico,
        });
      }
      await removeItem(item.key);
      synced++;
    } catch (err) {
      if (isNetworkError(err)) {
        break;
      }
      // Si el servidor rechaza con 4xx (ej. orden ya cerrada), descartar item para no trabar la cola
      await removeItem(item.key);
    }
  }

  const remaining = (await getPendingItems(idOperacion)).length;
  return { synced, remaining };
};
