// Service Worker for Web Push Notifications
self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('push', (e) => {
  if (!e.data) return
  let payload
  try { payload = e.data.json() } catch { payload = { title: 'MagiTripHouse', body: e.data.text() } }

  const options = {
    body:    payload.body   ?? '',
    icon:    '/icon-192.png',
    badge:   '/icon-72.png',
    tag:     'magitriphouse-news',
    renotify: true,
    data:    { url: payload.url ?? '/' },
    actions: [{ action: 'open', title: 'Apri' }],
  }

  e.waitUntil(
    self.registration.showNotification(payload.title ?? 'MagiTripHouse', options)
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
