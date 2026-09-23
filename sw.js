const CACHE="ccna-signal-v15";
const SHELL=[
  "./","./index.html","./manifest.webmanifest","./signal-icon.svg",
  "./styles/tokens.css","./styles/base.css","./styles/components.css","./styles/screens.css","./styles/responsive.css","./styles/signal.css","./styles/course.css",
  "./data/cards-basics.js","./data/cards-advanced.js","./data/cli-tasks.js","./data/glossary.js","./data/drills.js","./data/cases.js","./data/match-sets.js","./data/lessons.js","./data/course-checks.js",
  "./app/globals.js","./app/storage.js","./app/day-goal.js","./app/srs.js","./app/diagram.js","./app/glossary-popup.js","./app/claude.js","./app/achievements.js","./app/ping.js",
  "./app/screens/cards-ask.js","./app/screens/mix.js","./app/screens/cards.js","./app/screens/practice.js","./app/screens/cases.js","./app/screens/match.js","./app/screens/cli.js","./app/screens/lessons.js","./app/screens/course.js","./app/screens/home.js","./app/screens/training.js","./app/screens/progress.js",
  "./app/nav.js","./app/settings.js","./app/feedback.js","./app/render.js","./app/events.js","./app/signal-home.js","./app/main.js"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET"||new URL(request.url).origin!==location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
    return response;
  }).catch(()=>caches.match(request).then(hit=>hit||caches.match("./index.html"))));
});
