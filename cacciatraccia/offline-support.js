/* Public app files are cached; sessions, cloud backups and live positions never are. */
(()=>{'use strict';
let registration;const worker=new URL('sw-offline.js',document.currentScript.src);
function label(text){const e=document.getElementById('pfcOfflineStatus');if(e)e.textContent=text;}
async function register(){
 if(!('serviceWorker'in navigator)){label('Cache dell’app non disponibile in questo browser');return null}
 if(registration)return registration;
 try{
  registration=await navigator.serviceWorker.register(worker.href,{scope:new URL('./',worker).pathname,updateViaCache:'none'});
  const ready=()=>{if(registration.active&&new URL(registration.active.scriptURL).pathname===worker.pathname&&registration.active.state==='activated')label(navigator.onLine?'App pronta anche senza rete':'Offline · dati salvati sul dispositivo')};
  ready();registration.installing?.addEventListener('statechange',ready);navigator.serviceWorker.addEventListener('controllerchange',ready);
  return registration;
 }catch{label('Preparazione offline non completata: riapri con Internet');return null}
}
function ui(){
 const card=document.getElementById('page-backup');if(card&&!document.getElementById('pfcOfflineStatus')){const p=document.createElement('p');p.id='pfcOfflineStatus';p.className='notice';p.setAttribute('role','status');p.textContent='Preparo l’app per l’uso offline…';card.prepend(p)}
 const subtitle=document.querySelector('.brand small');if(subtitle)subtitle.textContent=navigator.onLine?'Dati sul dispositivo · backup cloud':'Offline · GPS e dati disponibili';
 if(!navigator.onLine)label('Offline · punti, foto e camminate salvati qui. I backup ripartono quando torna Internet.');
}
window.PFC_OFFLINE={register};
document.addEventListener('DOMContentLoaded',()=>{ui();register()},{once:true});
window.addEventListener('pfc:ready',ui);window.addEventListener('online',()=>{ui();register()});window.addEventListener('offline',ui);
})();
