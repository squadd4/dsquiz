const CACHE_NAME = "ds-modo-silencio-v9";

const VIDEO_ASSETS = [
  "./videos/slide-3.mp4",
  "./videos/slide-4.mp4",
  "./videos/slide-5.mp4",
  "./videos/slide-6.mp4"
];

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/main.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/video-player.js",
  "./js/storage.js",
  "./js/sync.js",
  "./js/export.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./png/Slide%204k%20-%201.png",
  "./png/Slide%204k%20-%202.png",
  "./png/Slide%204k%20-%205.png",
  "./png/Slide%204k%20-%206.png",
  "./png/Slide%204k%20-%207.png",
  "./png/Slide%204k%20-%208.png",
  "./png/Slide%204k%20-%209.png",
  "./png/Button.png",
  "./png/Button-1.png",
  "./png/Button-2.png",
  "./png/Button-3.png",
  "./png/button%20off-1.png",
  "./novas%20imagens/Slide%204k%20-%203.jpg",
  "./novas%20imagens/Slide%204k%20-%204.jpg",
  "./novas%20imagens/Slide%204k%20-%2010.jpg",
  "./novas%20imagens/button%20on.png",
  "./novas%20imagens/button%20on-1.png",
  "./novas%20imagens/Button.png",
  "./novas%20imagens/Button-1.png",
  "./novas%20imagens/Nome%20%26%20Apelido.png",
  "./novas%20imagens/Email.png",
  "./novas%20imagens/Telefone.png",
  "./novas%20imagens/C%C3%B3digo%20Postal.png",
  ...VIDEO_ASSETS
];

async function fetchAndCacheCompleteVideo(request, cache) {
  const cached = await cache.match(request.url);
  if (cached?.status === 200) {
    return cached;
  }

  const response = await fetch(request.url, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin"
  });

  if (response.ok && response.status === 200) {
    await cache.put(request.url, response.clone());
  }
  return response;
}

function parseRangeHeader(rangeHeader, totalSize) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2]) || totalSize <= 0) {
    return null;
  }

  let start;
  let end;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalSize - 1;
  }

  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(end)
    || start < 0
    || start >= totalSize
    || end < start
  ) {
    return null;
  }

  return { start, end: Math.min(end, totalSize - 1) };
}

async function respondToVideoRangeRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  let completeResponse;

  try {
    completeResponse = await fetchAndCacheCompleteVideo(request, cache);
  } catch {
    completeResponse = await cache.match(request.url);
  }

  if (!completeResponse || completeResponse.status !== 200) {
    return Response.error();
  }

  const videoBlob = await completeResponse.blob();
  const requestedRange = parseRangeHeader(request.headers.get("range") ?? "", videoBlob.size);
  if (!requestedRange) {
    return new Response(null, {
      status: 416,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes */${videoBlob.size}`
      }
    });
  }

  const { start, end } = requestedRange;
  const partialBlob = videoBlob.slice(start, end + 1, completeResponse.headers.get("Content-Type") || "video/mp4");

  return new Response(partialBlob, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(partialBlob.size),
      "Content-Range": `bytes ${start}-${end}/${videoBlob.size}`,
      "Content-Type": completeResponse.headers.get("Content-Type") || "video/mp4"
    }
  });
}

async function respondToCompleteVideoRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    return await fetchAndCacheCompleteVideo(request, cache);
  } catch {
    return (await cache.match(request.url)) ?? Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.includes("/backend/")) {
    event.respondWith(fetch(request));
    return;
  }

  const isMp4 = url.pathname.toLowerCase().endsWith(".mp4");
  if (isMp4 && request.headers.has("range")) {
    event.respondWith(respondToVideoRangeRequest(request));
    return;
  }

  if (isMp4) {
    event.respondWith(respondToCompleteVideoRequest(request));
    return;
  }

  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      } catch {
        return (await caches.match("./index.html")) ?? Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
