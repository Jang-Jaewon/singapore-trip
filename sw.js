/* 싱가포르 여행 일정 - 오프라인 캐시 (Service Worker) */
const CACHE = 'sg-trip-v2';
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
  // 외부(블로그/지도)는 네트워크 그대로
  if (url.origin !== self.location.origin) return;
  // 네트워크 우선: 온라인이면 항상 최신을 받고 캐시도 갱신, 실패(오프라인)하면 캐시로 폴백.
  // → 새 배포가 기기에 자동 반영되면서도 오프라인(크루즈) 사용은 유지된다.
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
