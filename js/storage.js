const DB_NAME = "ds-silencio";
const DB_VERSION = 2;
const STORE_NAME = "pending_submissions";
const ARCHIVE_STORE_NAME = "submissions_archive";
const FALLBACK_KEY = "ds_silencio_pending_submissions";
const FALLBACK_ARCHIVE_KEY = "ds_silencio_submissions_archive";

let databasePromise;

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    if (await navigator.storage.persisted?.()) {
      return true;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB indisponível"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        let pendingStore;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          pendingStore = database.createObjectStore(STORE_NAME, { keyPath: "client_record_id" });
          pendingStore.createIndex("status", "status", { unique: false });
          pendingStore.createIndex("created_at", "created_at", { unique: false });
        } else {
          pendingStore = request.transaction.objectStore(STORE_NAME);
        }

        if (!database.objectStoreNames.contains(ARCHIVE_STORE_NAME)) {
          const archiveStore = database.createObjectStore(ARCHIVE_STORE_NAME, { keyPath: "client_record_id" });
          archiveStore.createIndex("created_at", "created_at", { unique: false });

          pendingStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              archiveStore.put(cursor.value);
              cursor.continue();
            }
          };
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Falha ao abrir IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB bloqueada"));
    });
  }
  return databasePromise;
}

async function runTransaction(mode, action, storeName = STORE_NAME) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request;

    try {
      request = action(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error ?? request?.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Transação cancelada"));
  });
}

function getFallbackRecords(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setFallbackRecords(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

function putFallbackRecord(key, record) {
  const records = getFallbackRecords(key).filter((item) => item.client_record_id !== record.client_record_id);
  records.push(record);
  setFallbackRecords(key, records);
}

function runMultiStoreTransaction(storeNames, action) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, "readwrite");
    const stores = Object.fromEntries(storeNames.map((name) => [name, transaction.objectStore(name)]));

    try {
      action(stores);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao guardar os dados"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transação cancelada"));
  }));
}

function createFallbackId() {
  const random = Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12);
  const time = Date.now().toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${time}${random}`.slice(0, 36);
}

export function generateClientRecordId() {
  return globalThis.crypto?.randomUUID?.() ?? createFallbackId();
}

export async function saveSubmission(record) {
  try {
    await runMultiStoreTransaction([STORE_NAME, ARCHIVE_STORE_NAME], (stores) => {
      stores[STORE_NAME].put(record);
      stores[ARCHIVE_STORE_NAME].put(record);
    });
  } catch {
    putFallbackRecord(FALLBACK_KEY, record);
    putFallbackRecord(FALLBACK_ARCHIVE_KEY, record);
  }
  return record;
}

export async function getPendingSubmissions() {
  let indexedRecords = [];
  try {
    indexedRecords = await runTransaction("readonly", (store) => store.getAll());
  } catch {
    // A fila alternativa continua disponível.
  }

  const merged = new Map();
  [...indexedRecords, ...getFallbackRecords(FALLBACK_KEY)].forEach((record) => {
    if (record?.client_record_id) {
      merged.set(record.client_record_id, record);
    }
  });
  return [...merged.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export async function getAllSubmissions() {
  let archivedRecords = [];
  let pendingRecords = [];

  try {
    archivedRecords = await runTransaction("readonly", (store) => store.getAll(), ARCHIVE_STORE_NAME);
    pendingRecords = await runTransaction("readonly", (store) => store.getAll());
  } catch {
    // A cópia alternativa em localStorage continua disponível para exportação.
  }

  const merged = new Map();
  [
    ...archivedRecords,
    ...getFallbackRecords(FALLBACK_ARCHIVE_KEY),
    ...pendingRecords,
    ...getFallbackRecords(FALLBACK_KEY)
  ].forEach((record) => {
    if (record?.client_record_id) {
      merged.set(record.client_record_id, record);
    }
  });

  return [...merged.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export async function removeSubmission(clientRecordId) {
  try {
    await runMultiStoreTransaction([STORE_NAME, ARCHIVE_STORE_NAME], (stores) => {
      const archiveRequest = stores[ARCHIVE_STORE_NAME].get(clientRecordId);
      archiveRequest.onsuccess = () => {
        if (archiveRequest.result) {
          stores[ARCHIVE_STORE_NAME].put({
            ...archiveRequest.result,
            status: "sent",
            synced_at: new Date().toISOString()
          });
        }
      };
      stores[STORE_NAME].delete(clientRecordId);
    });
  } catch {
    // Pode existir apenas na fila alternativa.
  }

  const queue = getFallbackRecords(FALLBACK_KEY).filter((item) => item.client_record_id !== clientRecordId);
  try {
    setFallbackRecords(FALLBACK_KEY, queue);

    const archive = getFallbackRecords(FALLBACK_ARCHIVE_KEY);
    const archivedRecord = archive.find((item) => item.client_record_id === clientRecordId);
    if (archivedRecord) {
      putFallbackRecord(FALLBACK_ARCHIVE_KEY, {
        ...archivedRecord,
        status: "sent",
        synced_at: new Date().toISOString()
      });
    }
  } catch {
    // Sem armazenamento persistente, não há mais nenhuma ação silenciosa possível.
  }
}
