// Messta Service Worker: Web Push Notification & Offline Caching Engine

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
    actions: [
      { action: "open_app", title: "View Ticket →" },
    ],
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
