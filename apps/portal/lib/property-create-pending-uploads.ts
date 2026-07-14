/** Pending property documents saved in IndexedDB until the property exists. */

const DB_NAME = 'crossub-agent-property-uploads';
const DB_VERSION = 1;
const STORE = 'pending';

export type PendingPropertyUploadRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  title: string;
  slotId: string;
  source: 'leasing' | 'management';
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Could not open upload queue'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = run(store);
        request.onerror = () => reject(request.error ?? new Error('Upload queue failed'));
        request.onsuccess = () => resolve(request.result as T);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error('Upload queue transaction failed'));
      }),
  );
}

export function fileToPendingUploadRecord(
  file: File,
  input: {
    id: string;
    title: string;
    slotId: string;
    source: 'leasing' | 'management';
  },
): PendingPropertyUploadRecord {
  return {
    id: input.id,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    title: input.title,
    slotId: input.slotId,
    source: input.source,
    blob: file,
  };
}

export async function queuePropertyPendingUploads(
  propertyId: string,
  records: PendingPropertyUploadRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await withStore('readwrite', (store) => store.put(records, propertyId));
}

export async function peekPropertyPendingUploads(
  propertyId: string,
): Promise<PendingPropertyUploadRecord[]> {
  try {
    const records = await withStore<PendingPropertyUploadRecord[] | undefined>('readonly', (store) =>
      store.get(propertyId),
    );
    return records ?? [];
  } catch {
    return [];
  }
}

export async function clearPropertyPendingUploads(propertyId: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(propertyId));
  } catch {
    // Best-effort cleanup.
  }
}
