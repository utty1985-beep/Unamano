const CACHE='passione-funghi-caccia-v6-7-7';
const assets=[
  './6.7.7.html','./styles.css?v=4.1.2','./home-6.7.7.css?v=6.7.7','./home-6.7.7.js?v=6.7.7','./app-loader-6.7.7.js?v=6.7.7',
  './gps-6.7.4.js?v=6.7.4','./manifest.webmanifest','./icon.svg',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  ...[...Array(25).keys(),27,28,29,30,32,33,34,35,38].map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.7.4-final`)
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);await cache.addAll(assets);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('passione-funghi-caccia-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
  const root=new URL('./',self.location).pathname;
  const mapLibrary=url.origin==='https://cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/leaflet@1.9.4/dist/');
  if(!mapLibrary&&(url.origin!==self.location.origin||!url.pathname.startsWith(root)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(request);
    if(cached&&request.mode!=='navigate')return cached;
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),5000);
    try{const response=await fetch(request,{signal:ac.signal,cache:'no-store'});if(response.ok){await cache.put(request,response.clone());return response}return cached||response}
    catch{if(cached)return cached;if(request.mode==='navigate')return (await cache.match('./6.7.7.html'))||Response.error();return Response.error()}
    finally{clearTimeout(timer)}
  })());
});