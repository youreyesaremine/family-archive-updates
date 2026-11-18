/* service-worker.js — نسخة الويب (الآيفون) من أرشيف العائلة
   يحفظ ملفات الواجهة فقط داخل نطاقه (مجلد web/) ليعمل التطبيق دون إنترنت.
   أي طلب خارج هذا المجلد (حزم الأفراد p/ و d/ و o/، ملف الاسترداد r/، GitHub API، سكربت Google) لا يمرّ عليه إطلاقاً،
   فتصل البيانات المشفّرة دائماً بأحدث نسخة من الشبكة. عند تغيير الملفات ارفع رقم VERSION. */
const VERSION = 'fa-web-v1';
const SCOPE = new URL(self.registration.scope).pathname;          // مثل: /family-archive-updates/web/

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([SCOPE, SCOPE + 'index.html', SCOPE + 'manifest.json'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;   // البيانات والخدمات الخارجية: شبكة فقط
  if (req.mode === 'navigate') {                                                                         // الصفحة: الشبكة أولاً، والمحفوظ عند انقطاع الإنترنت
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(SCOPE + 'index.html', c)); return r; })
      .catch(() => caches.match(SCOPE + 'index.html').then(r => r || caches.match(SCOPE))));
    return;
  }
  if (url.pathname.startsWith(SCOPE + 'assets/')) {                                                      // ملفات Vite بأسماء فريدة: من المحفوظ أولاً
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {                                                          // بقية ملفات الواجهة: المحفوظ فوراً ثم تحديثه في الخلفية
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
