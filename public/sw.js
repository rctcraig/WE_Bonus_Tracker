const CACHE_NAME = "we-bonus-tracker-v2";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/we-icon-192.png",
  "/we-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

  const url = new URL(event.request.url);

  if (!APP_SHELL.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(url.pathname).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request);
    }),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "WE Bonus Tracker",
    body: "Production status updated.",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/we-icon-192.png",
      badge: "/we-icon-192.png",
      data: data.url ?? "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data ?? "/"));
});
