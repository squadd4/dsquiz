import {
  attemptVideoPlay,
  hideDelayedMicrophone,
  initialiseVideoPlayers,
  pauseVideosExcept,
  resetVideos,
  revealDelayedMicrophone,
} from "./video-player.js";
import { initialiseLeadExport } from "./export.js";
import { generateClientRecordId, requestPersistentStorage, saveSubmission } from "./storage.js";
import { startBackgroundSync, syncPendingSubmissions } from "./sync.js";

const experience = document.getElementById("experience");
const slides = [...document.querySelectorAll(".slide")];
const leadForm = document.getElementById("lead-form");
const formError = document.getElementById("form-error");
const backButton = document.getElementById("back-button");
const postalCodeField = document.getElementById("codigo-postal");

let currentSlide = "1";
let navigationHistory = [];
let submissionInProgress = false;

function updateBackButton() {
  const canGoBack = navigationHistory.length > 0 && currentSlide !== "1" && currentSlide !== "8";
  backButton.disabled = !canGoBack;
  backButton.classList.toggle("is-hidden", !canGoBack);
}

function showSlide(slideNumber, { remember = true } = {}) {
  const target = document.querySelector(`[data-slide="${slideNumber}"]`);
  if (!target || String(slideNumber) === currentSlide) {
    return;
  }

  if (remember) {
    navigationHistory.push(currentSlide);
  }

  currentSlide = String(slideNumber);
  experience.dataset.currentSlide = currentSlide;

  slides.forEach((slide) => {
    const active = slide === target;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.inert = !active;
  });

  hideDelayedMicrophone("slide-5");
  pauseVideosExcept(target.id);

  if (currentSlide === "5") {
    revealDelayedMicrophone("slide-5", 3000);
  }

  if (currentSlide === "6") {
    void attemptVideoPlay("video-6");
  }

  updateBackButton();
  window.dispatchEvent(new CustomEvent("ds:slidechange", { detail: { slide: currentSlide } }));
}

async function requestFullscreen() {
  if (document.fullscreenElement || typeof document.documentElement.requestFullscreen !== "function") {
    return;
  }
  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    // Fullscreen pode ser desativado pelo browser ou pelas políticas do quiosque.
  }
}

function clearValidationState() {
  formError.textContent = "";
  leadForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
}

function firstInvalidField() {
  return leadForm.querySelector(":invalid");
}

function validateLeadForm() {
  clearValidationState();

  if (!leadForm.checkValidity()) {
    const invalidField = firstInvalidField();
    invalidField?.setAttribute("aria-invalid", "true");
    if (invalidField?.id === "confirmacao-dados") {
      formError.textContent = "É necessário aceitar as políticas de privacidade.";
    } else {
      formError.textContent = "Preencha corretamente todos os campos obrigatórios.";
    }
    invalidField?.focus({ preventScroll: true });
    return false;
  }

  return true;
}

function createSubmission(markTestDrive) {
  const data = new FormData(leadForm);
  return {
    client_record_id: generateClientRecordId(),
    nome: String(data.get("nome") ?? "").trim(),
    email: String(data.get("email") ?? "").trim().toLowerCase(),
    telefone: String(data.get("telefone") ?? "").trim(),
    codigo_postal: String(data.get("codigo_postal") ?? "").trim().toUpperCase(),
    confirmacao_dados: true,
    marcar_test_drive: Boolean(markTestDrive),
    created_at: new Date().toISOString(),
    status: "pending",
  };
}

async function submitLead(markTestDrive) {
  if (submissionInProgress || !validateLeadForm()) {
    return;
  }

  submissionInProgress = true;
  leadForm.querySelector(".form-actions")?.classList.add("is-busy");

  try {
    const record = createSubmission(markTestDrive);
    await saveSubmission(record);
    showSlide("8");
    void syncPendingSubmissions();
  } catch {
    formError.textContent = "Não foi possível guardar os dados. Tente novamente.";
  } finally {
    submissionInProgress = false;
    leadForm.querySelector(".form-actions")?.classList.remove("is-busy");
  }
}

function resetExperience() {
  hideDelayedMicrophone("slide-5");
  resetVideos();
  leadForm.reset();
  navigationHistory = [];
  clearValidationState();
  showSlide("1", { remember: false });
  updateBackButton();
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => showSlide(button.dataset.next));
});

document.querySelector("[data-request-fullscreen]")?.addEventListener("click", () => {
  void requestFullscreen();
});

backButton.addEventListener("click", () => {
  const previousSlide = navigationHistory.pop();
  if (previousSlide) {
    showSlide(previousSlide, { remember: false });
  }
});

leadForm.addEventListener("input", (event) => {
  if (event.target === postalCodeField) {
    const digits = postalCodeField.value.replace(/\D/g, "").slice(0, 7);
    postalCodeField.value = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
  }

  if (event.target instanceof HTMLElement) {
    event.target.removeAttribute("aria-invalid");
  }
  formError.textContent = "";
});

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const markTestDrive = submitter instanceof HTMLButtonElement && submitter.dataset.testDrive === "true";
  void submitLead(markTestDrive);
});

document.querySelector("[data-restart]")?.addEventListener("click", resetExperience);

initialiseVideoPlayers();
initialiseLeadExport();
void requestPersistentStorage();
document.addEventListener("pointerdown", () => {
  void requestPersistentStorage();
}, { once: true, capture: true });
startBackgroundSync();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // A app continua funcional quando aberta por file:// ou num servidor sem Service Worker.
    });
  });
}
