const CACHE='cacciatraccia-v4-hosted-1';
const SHELL=['./', './index.html', './styles.css', './app-loader.js', './manifest.webmanifest', './icon.svg', './parts/app.part01.txt', './parts/app.part02.txt', './parts/app.part03.txt', './parts/app.part04.txt', './parts/app.part05.txt', './parts/app.part06.txt', './parts/app.part07.txt', './parts/app.part08.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  const same=u.origin===location.origin;
  if(same){e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,cp));return r;}).catch(()=>caches.match('./index.html'))));return;}
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,cp));return r;}).catch(()=>caches.match(e.request)));
});
