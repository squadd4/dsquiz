export const VIDEO_SOURCES = Object.freeze({
  "video-3": "./videos/slide-3.mp4",
  "video-4": "./videos/slide-4.mp4",
  "video-5": "./videos/slide-5.mp4",
  "video-6": "./videos/slide-6.mp4",
});

const delayedTimers = new Map();

function getVideo(videoId) {
  return document.getElementById(videoId);
}

function ensureSource(video) {
  if (!video || video.dataset.sourceAttached === "true") {
    return;
  }

  const source = VIDEO_SOURCES[video.id];
  if (!source) {
    return;
  }

  video.src = new URL(source, document.baseURI).href;
  video.dataset.sourceAttached = "true";
  video.load();
}

export async function toggleVideo(videoId, trigger) {
  const video = getVideo(videoId);
  if (!video) {
    return;
  }

  ensureSource(video);

  if (!video.paused && !video.ended) {
    video.pause();
    trigger?.classList.remove("is-playing");
    return;
  }

  try {
    await video.play();
    trigger?.classList.add("is-playing");
  } catch {
    // Os vídeos são fornecidos mais tarde; o poster mantém a composição sem expor erros técnicos.
    video.classList.remove("is-ready", "is-playing");
    trigger?.classList.remove("is-playing");
  }
}

export async function attemptVideoPlay(videoId) {
  const video = getVideo(videoId);
  if (!video) {
    return;
  }

  ensureSource(video);
  try {
    await video.play();
  } catch {
    // Autoplay com som pode ser bloqueado pelo browser. O ecrã continua interativo.
  }
}

export function pauseVideosExcept(activeSlideId) {
  document.querySelectorAll("video").forEach((video) => {
    if (!video.closest(`#${activeSlideId}`)) {
      video.pause();
      video.closest(".slide")?.querySelectorAll(".is-playing").forEach((element) => {
        element.classList.remove("is-playing");
      });
    }
  });
}

export function resetVideos() {
  document.querySelectorAll("video").forEach((video) => {
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // O vídeo pode ainda não ter metadata carregada.
    }
    video.classList.remove("is-ready", "is-playing");
  });

  document.querySelectorAll(".microphone-button.is-playing").forEach((button) => {
    button.classList.remove("is-playing");
  });
}

export function revealDelayedMicrophone(slideId, delay = 3000) {
  hideDelayedMicrophone(slideId);
  const slide = document.getElementById(slideId);
  const microphone = slide?.querySelector("[data-delayed-microphone]");
  if (!microphone) {
    return;
  }

  const timer = window.setTimeout(() => {
    microphone.classList.add("is-visible");
    delayedTimers.delete(slideId);
  }, delay);
  delayedTimers.set(slideId, timer);
}

export function hideDelayedMicrophone(slideId) {
  const timer = delayedTimers.get(slideId);
  if (timer) {
    window.clearTimeout(timer);
    delayedTimers.delete(slideId);
  }
  document.getElementById(slideId)?.querySelector("[data-delayed-microphone]")?.classList.remove("is-visible");
}

export function initialiseVideoPlayers() {
  document.querySelectorAll("[data-video-target]").forEach((trigger) => {
    trigger.addEventListener("click", () => toggleVideo(trigger.dataset.videoTarget, trigger));
  });

  document.querySelectorAll("video").forEach((video) => {
    video.addEventListener("canplay", () => video.classList.add("is-ready"));
    video.addEventListener("play", () => video.classList.add("is-playing"));
    video.addEventListener("pause", () => video.classList.remove("is-playing"));
    video.addEventListener("ended", () => {
      video.classList.remove("is-playing");
      video.closest(".slide")?.querySelectorAll(".is-playing").forEach((element) => {
        element.classList.remove("is-playing");
      });
    });
    video.addEventListener("error", () => video.classList.remove("is-ready", "is-playing"));
  });
}
