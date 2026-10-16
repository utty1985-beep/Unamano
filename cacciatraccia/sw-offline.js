/* Offline app shell and maps only. Never cache authentication, backups or live GPS. */
const SHELL_CACHE='passione-funghi-caccia-offline-20261016-6-9-13-r2';
const SAVED_TILES='cacciatraccia-offline-tiles-v1',VIEWED_TILES='pfc-viewed-tiles-v1';
const ASSETS=["./", "./index.html", "./offline-support.js?v=20261016-offline1", "./manifest.webmanifest", "./icon.svg", "./styles.css?v=4.1.2", "./home-6.8.1.css?v=6.8.1-realistic2", "./simple-6.9.6.css?v=20261016-outdoor-6-9-13", "./open-meteo-only.js?v=free-weather-20261016", "./wind-local-names.js?v=20261016-wind2", "./wind-engine-6.9.3.js?v=local-wind-20261015", "./wind-6.9.3-modes.js?v=weather-openmeteo-20261016", "./dog-6.9.3-pair.js?v=6.9.3-pair1", "./app-6.9.8.js?v=20261016-outdoor-6-9-13-carfix", "./home-6.9.6.js?v=20261016-outdoor-6-9-13", "./vendor/supabase-2.95.3.js", "./native-team-6.9.9.js?v=position-only-20261015", "./friends-6.9.8-reconnect.js?v=20261016-private-session", "./activity-6.9.3-modes.js?v=20261016-funghi-meteo", "./wind-ui-6.9.11.js?v=20261016-r1", "./puglia-rules.js?v=20261015", "./puglia-restrictions.js?v=20261015", "./cloud-backup.js?v=20261016-backoff2", "./account-local.js?v=20261016-tombstones2", "./auth-required.js?v=20261016-logout2", "./vendor/leaflet/leaflet.js?v=1.9.4", "./vendor/leaflet/leaflet.css?v=1.9.4", "./vendor/leaflet-rotate.js?v=0.3.0", "./assets/bosco-cervo-porcini-6.8.1.webp", "./data/aree-protette-puglia.json", "./data/normativa-puglia.json", "./vendor/leaflet/images/layers.png", "./vendor/leaflet/images/layers-2x.png", "./vendor/leaflet/images/marker-shadow.png", "./vendor/leaflet/images/marker-icon.png", "./vendor/leaflet/images/marker-icon-2x.png"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL_CACHE);await cache.addAll(ASSETS);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('passione-funghi-caccia-')&&name!==SHELL_CACHE)await caches.delete(name);await self.clients.claim()})()));
const isTile=url=>(url.hostname==='server.arcgisonline.com'&&/^\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/\d+\/\d+\/\d+$/.test(url.pathname))||(url.hostname==='tile.openstreetmap.org'&&/^\/\d+\/\d+\/\d+\.png$/.test(url.pathname));
async function timeoutFetch(request,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(request,{signal:c.signal})}finally{clearTimeout(t)}}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),base=new URL('./',self.location);
 if(request.method!=='GET')return;
 const local=url.origin===base.origin&&url.pathname.startsWith(base.pathname);
 if(!local&&!isTile(url))return;
 event.respondWith((async()=>{
  if(isTile(url)){
   const pinned=await caches.open(SAVED_TILES),viewed=await caches.open(VIEWED_TILES);
   const saved=await pinned.match(request)||await viewed.match(request);if(saved)return saved;
   try{const response=await timeoutFetch(request,7000);if(response.ok||response.type==='opaque'){await viewed.put(request,response.clone()).catch(()=>{});const keys=await viewed.keys();for(const key of keys.slice(0,Math.max(0,keys.length-800)))await viewed.delete(key);return response}throw Error('tile unavailable')}
   catch{return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf2ed"/><path d="M0 0H256V256H0Z" fill="none" stroke="#bbcabb"/><text x="128" y="128" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#536653">Area non scaricata</text></svg>',{headers:{'Content-Type':'image/svg+xml'}})}
  }
  const cache=await caches.open(SHELL_CACHE);
  if(request.mode==='navigate'){
   try{const response=await timeoutFetch(request,4000);if(response.ok){/* The install snapshot stays consistent with its exact script versions. */return response}throw Error('navigation unavailable')}
   catch{return await cache.match(new URL('index.html',base).href)||Response.error()}
  }
  const saved=await cache.match(request);if(saved)return saved;
  try{const response=await timeoutFetch(request,10000);if(response.ok)await cache.put(request,response.clone()).catch(()=>{});return response}catch{return Response.error()}
 })());
});
