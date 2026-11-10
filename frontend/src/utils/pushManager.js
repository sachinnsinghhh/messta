import { API_BASE_URL } from "../config/api";

// Helper to convert base64 VAPID public key to Uint8Array
function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerPushSubscription(userId, userEmail = "", role = "user") {
  if (!isPushNotificationSupported() || !userId) {
    return { success: false, message: "Push notifications not supported on this browser." };
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, message: "Notification permission was denied." };
    }

    // 3. Fetch VAPID Public Key from Backend
    const keyRes = await fetch(`${API_BASE_URL}/api/notifications/vapid-key`);
    const keyData = await keyRes.json();
    if (!keyData.success || !keyData.publicKey) {
      throw new Error("Could not retrieve VAPID public key from backend.");
    }

    // 4. Subscribe to Push Manager
    const applicationServerKey = urlB64ToUint8Array(keyData.publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 5. Send Subscription to Backend
    const subRes = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        userId,
        userEmail,
        role,
      }),
    });

    const subData = await subRes.json();
    localStorage.setItem("messta_push_enabled", "true");

    return { success: true, subscription, data: subData };
  } catch (error) {
    console.warn("Push subscription error:", error);
    return { success: false, message: error.message };
  }
}

export async function sendTestPushNotification(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/test-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch (error) {
    console.warn("Error sending test push notification:", error);
    return { success: false, message: error.message };
  }
}
