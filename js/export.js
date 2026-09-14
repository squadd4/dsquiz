import { getAllSubmissions } from "./storage.js";

const SECRET_TAP_COUNT = 5;
const SECRET_TAP_WINDOW_MS = 4000;
const SECRET_CORNER_RATIO = 0.14;

const CSV_COLUMNS = [
  ["ID", "client_record_id"],
  ["Nome e Apelido", "nome"],
  ["Email", "email"],
  ["Telefone", "telefone"],
  ["Código Postal", "codigo_postal"],
  ["Privacidade aceite", "confirmacao_dados"],
  ["Marcar Test-Drive", "marcar_test_drive"],
  ["Data de criação", "created_at"],
  ["Estado", "status"],
  ["Data de sincronização", "synced_at"]
];

let exportInProgress = false;
let secretTapTimes = [];

function csvValue(value) {
  if (typeof value === "boolean") {
    return value ? "SIM" : "NÃO";
  }

  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(records) {
  const header = CSV_COLUMNS.map(([label]) => csvValue(label)).join(";");
  const rows = records.map((record) => CSV_COLUMNS.map(([, key]) => csvValue(record[key])).join(";"));
  return `sep=;\r\n${[header, ...rows].join("\r\n")}\r\n`;
}

function exportFilename() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `ds-modo-silencio-leads-${timestamp}.csv`;
}

export async function downloadLeadsCsv() {
  if (exportInProgress) {
    return;
  }

  exportInProgress = true;
  try {
    const records = await getAllSubmissions();
    const blob = new Blob(["\uFEFF", buildCsv(records)], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = exportFilename();
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    exportInProgress = false;
  }
}

function handleSecretCornerTap(event) {
  const inTopRightCorner = (
    event.clientX >= window.innerWidth * (1 - SECRET_CORNER_RATIO)
    && event.clientY <= window.innerHeight * SECRET_CORNER_RATIO
  );

  if (!inTopRightCorner) {
    secretTapTimes = [];
    return;
  }

  const now = Date.now();
  secretTapTimes = secretTapTimes.filter((time) => now - time <= SECRET_TAP_WINDOW_MS);
  secretTapTimes.push(now);

  if (secretTapTimes.length >= SECRET_TAP_COUNT) {
    secretTapTimes = [];
    void downloadLeadsCsv();
  }
}

export function initialiseLeadExport() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "F9") {
      event.preventDefault();
      void downloadLeadsCsv();
    }
  });

  window.addEventListener("pointerup", handleSecretCornerTap, { passive: true });
}
