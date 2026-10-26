
const CACHE_NAME = "pcp-med-reference-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./medications-data.js",
  "./app.js",
  "./manifest.json",
  "./MedicationImages/Tablet.svg",
  "./MedicationImages/IVBag.svg",
  "./MedicationImages/Syringe.svg",
  "./MedicationImages/Inhaler.svg",
  "./MedicationImages/Oxygen.svg",
  "./MedicationImages/Buccal.svg",
  "./MedicationImages/Eyedrops.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith("pcp-med-reference-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestURL = new URL(event.request.url);

  if (requestURL.origin !== self.location.origin) return;

  event.respondWith(
    fetch(new Request(event.request, { cache: "no-store" }))
      .then(response => {
        if (!response.ok) return response;

        return caches.open(CACHE_NAME)
          .then(cache =>
            cache.put(event.request, response.clone())
              .then(() => response)
          );
      })
      .catch(() =>
        caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;

          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return Response.error();
        })
      )
  );
});
