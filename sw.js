/* 싱가포르 여행 일정 - 오프라인 캐시 (Service Worker) */
const CACHE = 'sg-trip-v4';
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

  var isNav = e.request.mode === 'navigate';

  // 네트워크 우선: 온라인이면 최신을 받고 캐시도 갱신. 단 정상(2xx, 동일출처 basic)
  // 응답만 저장해 404/5xx 가 정상 캐시를 덮어쓰지 않게 한다(오프라인 폴백 보호).
  var network = fetch(e.request).then(function (resp) {
    if (resp && resp.ok && resp.type === 'basic') {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return resp;
  });

  var fromCache = function () {
    return caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      // navigate 인데 정확 매치가 없으면 메인 페이지로 폴백(./index.html → ./)
      if (isNav) return caches.match('./index.html').then(function (h) { return h || caches.match('./'); });
      return undefined;
    });
  };

  if (isNav) {
    // 느린/행(hang) 네트워크(배 위 캡티브·위성 와이파이 등) 대비:
    // 3초 내 응답 없으면 캐시로 폴백, 캐시도 없으면 네트워크를 계속 기다린다.
    var timeout = new Promise(function (resolve) {
      setTimeout(function () { fromCache().then(function (c) { resolve(c || network.catch(fromCache)); }); }, 3000);
    });
    e.respondWith(Promise.race([network.catch(fromCache), timeout]));
  } else {
    e.respondWith(network.catch(fromCache));
  }
});
