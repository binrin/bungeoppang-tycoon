const CACHE='bungeoppang-v1.1.1';
const FILES=["./", "./index.html", "./style.css", "./core.mjs", "./app.mjs", "./manifest.webmanifest", "./assets/bicon.png", "./assets/micon.png", "./assets/bg_0.png", "./assets/bg_8.png", "./assets/bg_10.png", "./assets/f_0.png", "./assets/c_0.png", "./assets/c_1.png", "./assets/c_2.png", "./assets/c_3.png", "./assets/pm_0.png", "./assets/icon.png", "./assets/Jua-Regular.ttf", "./assets/OFL.txt"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bungeoppang-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
