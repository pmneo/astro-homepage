// Throttles /api/hips/* (HiPS tiles, fetched internally by Aladin Lite — not our own JS, so this
// is the only way to cap its concurrency without patching the vendored library) and
// /api/image-cache (gallery thumbnails) to a single shared pool of at most MAX_CONCURRENT in
// flight at once, combined — not 4 each. Both compete for the same browser connection pool as
// everything else on the page (6 concurrent per origin on HTTP/1.1), so a shared cap models that
// actual constraint more accurately than two independent ones would. This is what was starving the
// scroll-scrubbed background video of a connection slot right after page load. Plain JS, not TS —
// this runs directly as a browser script, no build step involved.

const MAX_CONCURRENT = 4;
let active = 0;
let maxObservedActive = 0;
const queue = [];

function next() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return;
  active++;
  if (active > maxObservedActive) maxObservedActive = active;
  const { request, resolve, reject } = queue.shift();
  fetch(request).then(
    (res) => {
      active--;
      resolve(res);
      next();
    },
    (err) => {
      active--;
      reject(err);
      next();
    },
  );
}

self.addEventListener("message", (event) => {
  if (event.data === "stats" && event.ports[0]) {
    event.ports[0].postMessage({ active, queued: queue.length, maxObservedActive });
  }
});

function throttledFetch(request) {
  return new Promise((resolve, reject) => {
    queue.push({ request, resolve, reject });
    next();
  });
}

// Activates as fast as possible (skips the usual "wait for all tabs to close" step) — a stale
// version sitting around doing nothing until a future reload would defeat the point of this
// existing at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/hips/") || url.pathname === "/api/image-cache") {
    event.respondWith(throttledFetch(event.request));
  }
});
