// Messta Service Worker: PWA Direct Install Engine & Web Push
const CACHE_NAME = "messta-cache-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// PWA Installability Fetch Handler
self.addEventListener("fetch", (event) => {
  // Only handle GET requests; pass-through APIs, backend & cross-origin auth directly
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("phonepe")
  ) {
    return;
  }

  // Network-first strategy with offline asset fallback to satisfy Chrome PWA install criteria
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
        });
      })
  );
});

// 1. Listen for Incoming Web Push Events from Node.js Backend
self.addEventListener("push", (event) => {
  let data = {
    title: "Messta Dining Alert",
    body: "Check your meal ticket and counter pickup status.",
    icon: "/messta-icon.png",
    badge: "/messta-icon.png",
    url: "/profile",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    console.warn("Could not parse push payload as JSON:", err);
  }

  const options = {
    body: data.body,
    icon: data.icon || "/messta-icon.png",
    badge: data.badge || "/messta-icon.png",
    tag: data.tag || "messta-notification",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/profile",
    },
    actions: [{ action: "open_app", title: "View Ticket →" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 2. Handle User Click on Notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/profile";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
