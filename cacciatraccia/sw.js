const CACHE='passione-funghi-caccia-v6-3-19-tilt-freeze';
const SHELL=['./','./index.html','./styles.css?v=4.1.3','./app-loader.js?v=6.3.19','./manifest.webmanifest','./icon.svg',...Array.from({length:25},(_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.3.19`)];

self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  await Promise.allSettled(SHELL.map(u=>c.add(new Request(u,{cache:'reload'}))));
  await self.skipWaiting();
})()));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE && k!=='cacciatraccia-offline-tiles-v1').map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url),same=u.origin===location.origin;
  if(same){
    e.respondWith((async()=>{
      try{
        const r=await fetch(e.request,{cache:'no-store'});
        const c=await caches.open(CACHE);c.put(e.request,r.clone()).catch(()=>{});
        return r;
      }catch{
        const cached=await caches.match(e.request,{ignoreSearch:true});
        if(cached)return cached;
        if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
        return Response.error();
      }
    })());
  }else{
    e.respondWith((async()=>{
      const cached=await caches.match(e.request);if(cached)return cached;
      try{const r=await fetch(e.request);const c=await caches.open(CACHE);c.put(e.request,r.clone()).catch(()=>{});return r}catch{return Response.error()}
    })());
  }
});
