// Service worker Firebase Cloud Messaging — notifikasi saat aplikasi tertutup
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBSypeJd6IjdLNjqsB9v0NzABhRNTUIWeg",
  authDomain: "smartppsu.firebaseapp.com",
  projectId: "smartppsu",
  storageBucket: "smartppsu.firebasestorage.app",
  messagingSenderId: "482242242213",
  appId: "1:482242242213:web:170067d7ddb4443ed68f4c",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || payload.data || {};
  self.registration.showNotification(n.title || "Smart PPSU", {
    body: n.body || "",
    data: { url: (payload.data && payload.data.url) || "/notifikasi" },
  });
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || "/notifikasi"));
});
