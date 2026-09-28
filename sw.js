const C='unamano-v24-20260928';
const CORE=['./','./index.html','./manifest.webmanifest','./config.js','./theme-v2.css','./worker-features.js','./empty-city-demo.js','./profile-chat.js','./accepted-chat.js','./chat-access-guard.js','./account-delete.js','./moderation-admin.js','./chat-bootstrap.js','./profile-privacy-enhancements.js','./marketplace-polish.js','./candidate-actions.js','./activity-live.js','./workflow-fixes.js','./multi-applications.js','./site-assistant.js','./custom-categories.js','./notification-channels.js','./seo-meta.js','./soft-theme.js','./icon.svg','./privacy.html','./termini.html','./segnala.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)));
});
self.addEventListener('push',e=>{
  let d={};
  try{d=e.data?e.data.json():{}}catch(err){d={body:e.data?e.data.text():'Nuova richiesta disponibile'}}
  const title=d.title||'UnaMano · Nuova richiesta';
  const options={body:d.body||'È stata pubblicata una nuova richiesta compatibile con le tue preferenze.',icon:d.icon||'./icon.svg',badge:d.badge||'./icon.svg',tag:d.tag||'unamano-job',renotify:true,vibrate:Array.isArray(d.vibrate)?d.vibrate:[180,80,180],data:{url:d.url||'./'}};
  e.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification?.data?.url||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url);return c.focus();}}if(clients.openWindow)return clients.openWindow(url);}));
});