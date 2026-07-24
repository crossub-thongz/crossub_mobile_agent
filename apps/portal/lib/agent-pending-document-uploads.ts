/** Offline agent document uploads queued in IndexedDB until the API reconnects. */

const DB_NAME = 'crossub-agent-document-uploads';
const DB_VERSION = 1;
const STORE = 'pending';

export type PendingAgentDocumentUpload = {
  id: string;
  fileName: string;
  mimeType: string;
  title: string;
  category: string;
  propertyAddress: string;
  propertyId?: string;
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

export async function queueAgentDocumentUpload(
  record: PendingAgentDocumentUpload,
): Promise<void> {
  const existing = await peekAgentDocumentUploads();
  await withStore('readwrite', (store) => store.put([...existing, record], 'all'));
}

export async function peekAgentDocumentUploads(): Promise<PendingAgentDocumentUpload[]> {
  try {
    const records = await withStore<PendingAgentDocumentUpload[] | undefined>('readonly', (store) =>
      store.get('all'),
    );
    return records ?? [];
  } catch {
    return [];
  }
}

export async function removeAgentDocumentUpload(id: string): Promise<void> {
  const remaining = (await peekAgentDocumentUploads()).filter((r) => r.id !== id);
  if (remaining.length === 0) {
    await withStore('readwrite', (store) => store.delete('all'));
  } else {
    await withStore('readwrite', (store) => store.put(remaining, 'all'));
  }
}

export async function clearAgentDocumentUploads(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete('all'));
  } catch {
    // Best-effort cleanup.
  }
}
