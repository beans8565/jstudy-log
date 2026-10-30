// 앱 화면 파일만 캐시 (데이터는 항상 서버에서 받음). 새 버전 배포 시 VERSION을 올린다.
const VERSION = "jlog-v14";
const SHELL = ["./", "index.html", "db.js", "config.js", "manifest.json", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase·CDN은 건드리지 않음
  // 네트워크 우선 → 실패 시 캐시 (항상 최신 화면, 오프라인일 때만 캐시)
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
