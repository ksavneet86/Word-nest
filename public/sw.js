// Minimal service worker — enables "Add to Home Screen" installability.
// Deliberately does not cache API responses or pages: this app is fully
// dynamic/DB-backed, and caching could show a guardian stale quiz progress.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through — no caching. Presence of a fetch handler is what makes
  // the app installable in Chromium-based browsers.
});
