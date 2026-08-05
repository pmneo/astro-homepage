// The real service worker (fetch throttling for HiPS tiles/gallery thumbnails, see commit
// fc2c7c2) was reverted in d40d710 — it didn't help, and everything it touches is proxied/cached
// server-side now anyway (see diskCache.ts, imageCache.ts). Deleting this file wasn't enough on its
// own: a browser that already installed the old sw.js keeps using it and only checks for an update
// on its own schedule, regardless of whether the page still calls navigator.serviceWorker.register()
// (it doesn't, see the removed ServiceWorkerRegistration.tsx) — so this replaces it with a minimal
// worker whose only job is to uninstall itself and get out of the way for good.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
