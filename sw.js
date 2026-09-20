/* Тренажёр CCNA · сервис-воркер: приложение открывается без интернета.
   Стратегия — отдать из кеша сразу, а в фоне забрать свежую версию на следующий запуск.
   При обновлении файлов поменяйте VER: старый кеш будет удалён. */
const VER="ccna-v12";
const ASSETS=["./","./index.html","./bank-a.js","./bank-b.js","./cli.js","./glossary.js","./drills.js",
  "./cases.js","./match.js","./lessons.js","./core.js","./ping.js","./app.js","./manifest.webmanifest",
  "./icon-180.png","./icon-192.png","./icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET"||new URL(req.url).origin!==location.origin) return;   // шрифты и прочее — мимо кеша
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{
      if(res&&res.status===200) caches.open(VER).then(c=>c.put(req,res.clone()));
      return res;
    }).catch(()=>hit);
    return hit||net;
  }));
});
