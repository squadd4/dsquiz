import { getPendingSubmissions, removeSubmission } from "./storage.js";

const ENDPOINT = "/api/submit_quiz";
const SYNC_INTERVAL_MS = 3 * 60 * 1000;

let syncPromise = null;
let listenersStarted = false;

async function sendSubmission(record) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Submissão não aceite");
  }

  const result = await response.json();
  if (result?.success !== true) {
    throw new Error("Resposta inválida");
  }
  return result;
}

export function syncPendingSubmissions() {
  if (syncPromise) {
    return syncPromise;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return Promise.resolve();
  }

  syncPromise = (async () => {
    const records = await getPendingSubmissions();
    for (const record of records) {
      try {
        await sendSubmission(record);
        await removeSubmission(record.client_record_id);
      } catch {
        // A fila é mantida e a experiência nunca mostra estados técnicos ao visitante.
        break;
      }
    }
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export function startBackgroundSync() {
  if (listenersStarted) {
    return;
  }
  listenersStarted = true;

  const syncSilently = () => void syncPendingSubmissions();
  window.addEventListener("online", syncSilently);
  window.addEventListener("focus", syncSilently);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncSilently();
    }
  });
  window.setInterval(syncSilently, SYNC_INTERVAL_MS);
  syncSilently();
}
