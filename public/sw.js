const CACHE = "monas-public-shell-v1";
const PUBLIC = ["/offline.html", "/manifest.webmanifest", "/icons/icon.svg"];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PUBLIC))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate")
    return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html")),
  );
});
