const CACHE='passione-funghi-caccia-v6-7-3';
const assets=[
  './6.7.3.html','./styles.css?v=4.1.2','./app-loader-6.7.3.js?v=6.7.3-final',
  './gps-6.7.3.js?v=6.7.3','./manifest.webmanifest','./icon.svg',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  ...[...Array(25).keys(),27,28,29,30,32,33,34,35,38].map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.7.3-final`)
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Install only a complete offline build; retain the previous worker on failure.
  await cache.addAll(assets);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET')return;
  // Leave weather, auth and other applications on the same origin untouched.
  const root=new URL('./',self.location).pathname;
  const mapLibrary=url.origin==='https://cdn.jsdelivr.net'&&(
    url.pathname.startsWith('/npm/leaflet@1.9.4/dist/')||
    url.pathname.startsWith('/npm/@tomickigrzegorz/leaflet-rotate@0.3.0/'));
  if(!mapLibrary&&(url.origin!==self.location.origin||!url.pathname.startsWith(root)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached&&request.mode!=='navigate')return cached;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),5000);
    try{
      const response=await fetch(request,{signal:abort.signal,cache:'no-store'});
      if(response.ok){await cache.put(request,response.clone());return response;}
      return cached||response;
    }catch{
      if(cached)return cached;
      if(request.mode==='navigate')return (await cache.match('./6.7.3.html'))||Response.error();
      return Response.error();
    }finally{clearTimeout(timer);}
  })());
});
