const CACHE='passione-funghi-caccia-v6-7-8-final';
const TILE_CACHE='cacciatraccia-offline-tiles-v1';
const SHELL=['./6.7.8.html','./styles.css?v=4.1.2','./home-6.7.8.css?v=6.7.8-final','./home-6.7.8.js?v=6.7.8-final','./app-6.7.8.js?v=6.7.8-final','./manifest.webmanifest','./icon.svg'];
const LIBS=['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(SHELL);await Promise.allSettled(LIBS.map(u=>c.add(u)));await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('passione-funghi-caccia-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url),root=new URL('./',self.location).pathname;if(r.method!=='GET')return;
 const local=u.origin===self.location.origin&&u.pathname.startsWith(root);
 const library=LIBS.includes(u.href);
 const tile=u.hostname==='server.arcgisonline.com'&&u.pathname.includes('/tile/')||u.hostname==='tile.openstreetmap.org';
 if(!local&&!library&&!tile)return;
 e.respondWith((async()=>{
  const c=await caches.open(tile?TILE_CACHE:CACHE),cached=await c.match(r);
  if(cached&&(r.mode!=='navigate'))return cached;
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);
  try{const response=await fetch(r,{signal:ac.signal,cache:'no-store'});if(response.ok||response.type==='opaque'){await c.put(r,response.clone());if(tile){const keys=await c.keys();for(const k of keys.slice(0,Math.max(0,keys.length-160)))await c.delete(k)}return response}return cached||response}
  catch{if(cached)return cached;if(r.mode==='navigate')return (await c.match('./6.7.8.html'))||Response.error();return Response.error()}
  finally{clearTimeout(timer)}
 })());
});
