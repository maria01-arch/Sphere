// Firebase config values are not secret (they're already public in the
// client bundle), so hardcoding them here is normal practice — but this
// file is static and can't read env vars at runtime, so these must be
// filled in by hand to match your NEXT_PUBLIC_FIREBASE_* values.
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDEjh-ktBQc6p2uJ-QzNbKhDT4Tpe9AHfs",
  authDomain: "flitters-fb8d4.firebaseapp.com",
  projectId: "flitters-fb8d4",
  storageBucket: "flitters-fb8d4.firebasestorage.app",
  messagingSenderId: "788841426434",
  appId: "1:788841426434:web:9609736f220c45ceabc11b",
})

const messaging = firebase.messaging()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// FCM's own background-message handler — replaces the old manual 'push'
// listener. Firebase payloads have their own shape (payload.notification /
// payload.data), different from the raw JSON this app used to send itself.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Flitters'
  const body = payload.notification?.body || payload.data?.body || 'You have a new notification'
  const url = payload.data?.url || payload.fcmOptions?.link || '/'
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false
  })
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({type:'window'}).then(clientList => {
      for(const client of clientList) {
        if(client.url === '/' && 'focus' in client) return client.focus()
      }
      if(clients.openWindow) return clients.openWindow(event.notification.data.url || '/')
    })
  )
})
