/* 싱가포르 여행 일정 - 오프라인 캐시 (Service Worker) */
const CACHE = 'sg-trip-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // 같은 출처(앱 파일)만 캐시 우선 — 외부 블로그/지도는 평소대로 네트워크
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () {
        // 오프라인 + 미캐시 → 메인 페이지로 폴백 (앱 내비게이션)
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
