// ═══════════════════════════════════════════════
//  Service Worker — المتميز للتوصيل
// ═══════════════════════════════════════════════

const CACHE_NAME = 'elmotamyez-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

// التثبيت — تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('Cache addAll error:', err);
        });
      })
  );
  self.skipWaiting();
});

// التفعيل — مسح الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// الجلب — Network First للبيانات الحية، Cache للملفات الثابتة
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // تجاهل طلبات Firebase (لازم تكون live دايماً)
  if (url.includes('firestore') || url.includes('firebaseio') || 
      url.includes('googleapis.com/identitytoolkit') || url.includes('firebase')) {
    return; // اترك المتصفح يتعامل معها مباشرة
  }

  // تجاهل صفحات السائق والأدمن تماماً (يفتحوها من المتصفح عادي)
  if (url.includes('driver') || url.includes('admin')) {
    return; // اترك المتصفح يتعامل معها مباشرة بدون كاش
  }

  // للملفات الثابتة — Cache First مع تحديث في الخلفية
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// استقبال الإشعارات Push
self.addEventListener('push', (event) => {
  let data = { title: '🛵 المتميز', body: 'طلب جديد وصل!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-96.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    tag: 'new-order',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// الضغط على الإشعار — فتح التطبيق
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // لو في نافذة مفتوحة، ركّز عليها
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // غير كده افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
