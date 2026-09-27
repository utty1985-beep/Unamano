(function(){
let prefs={city:'',categories:[],notifications_enabled:false};
let localBoard=false;
let liveChannel=null;
let patchedCreateJob=false;
let patchedLogout=false;
const PUSH_PUBLIC_KEY='BBqUijPcpNzkaPOlA_3x-x9vF-3eRskVhtDgAESwMeDws9D2KlNaSCG4Gde3ilG-TpPHc5enhSj9P53EkcU-9NM';
const byId=id=>document.getElementById(id);
const norm=s=>String(s||'').trim().toLowerCase();
const isToday=v=>{const a=new Date(v),b=new Date();return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()};

function ensureBabysitter(){
  if(typeof CATS!=='undefined'&&!CATS.some(x=>x[1]==='Babysitter')){
    CATS.unshift(['👶','Babysitter']);
    if(typeof populateUi==='function')populateUi();
  }
}

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

function addUi(){
  if(!byId('localBoardBox')){
    const strip=byId('categoryStrip');
    if(strip){
      const box=document.createElement('div');
      box.id='localBoardBox';box.className='card';
      box.style.marginTop='12px';
      box.innerHTML='<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>📍 Bacheca di oggi nella tua città</b><div id="localBoardText" class="small">Accedi e imposta la tua città.</div></div><div class="actions" style="margin:0"><button id="myCityToday" class="btn p sm">Oggi nella mia città</button><button id="allCities" class="btn g sm">Tutte</button></div></div>';
      strip.insertAdjacentElement('afterend',box);
      byId('myCityToday').onclick=showMyCityToday;
      byId('allCities').onclick=showAll;
    }
  }
  const aside=document.querySelector('#profile aside');
  if(aside&&!byId('workerPrefsCard')){
    const card=document.createElement('div');
    card.id='workerPrefsCard';card.className='card';
    card.innerHTML='<h3 style="margin-top:0">🔔 Lavori che mi interessano</h3><div class="small">Scegli le categorie per cui vuoi essere avvisato nella tua città. Le notifiche push possono arrivare anche con UnaMano chiusa.</div><div id="workerCats" class="skills"></div><label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input id="workerNotify" type="checkbox" style="width:auto;margin-top:3px"><span>Avvisami quando arriva una nuova richiesta compatibile.</span></label><button id="saveWorkerPrefs" class="btn p" style="width:100%;margin-top:10px">Salva preferenze</button><div id="workerHint" class="small" style="margin-top:8px"></div>';
    aside.appendChild(card);
    byId('saveWorkerPrefs').onclick=savePrefs;
  }
  drawPrefs();drawBoardInfo();
}

async function pushStateText(){
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))return 'Questo dispositivo/browser non supporta le notifiche push.';
  if(Notification.permission==='denied')return 'Notifiche bloccate dal telefono/browser: riattivale dalle impostazioni del sito.';
  if(Notification.permission!=='granted')return 'Attiva le notifiche e il telefono ti chiederà il permesso.';
  try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();return sub?'Notifiche push attive anche con UnaMano chiusa.':'Permesso concesso: premi Salva preferenze per completare l’attivazione.';}catch(e){return 'Impossibile verificare lo stato delle notifiche.'}
}

function drawPrefs(){
  const w=byId('workerCats');if(!w)return;
  w.innerHTML=CATS.map(x=>'<label class="chip"><input type="checkbox" style="width:auto;margin:0 5px 0 0" value="'+x[1]+'" '+(prefs.categories.includes(x[1])?'checked':'')+'>'+x[0]+' '+x[1]+'</label>').join('');
  if(byId('workerNotify'))byId('workerNotify').checked=prefs.notifications_enabled;
  pushStateText().then(t=>{if(byId('workerHint'))byId('workerHint').textContent=t});
}

function drawBoardInfo(){
  const el=byId('localBoardText');if(!el)return;
  if(!session){el.textContent='Accedi e imposta la tua città.';return}
  if(!prefs.city){el.textContent='Imposta la tua città nel profilo.';return}
  const n=jobs.filter(j=>j.status==='open'&&norm(j.city)===norm(prefs.city)&&isToday(j.created_at)).length;
  el.textContent=prefs.city+': '+n+' '+(n===1?'richiesta pubblicata oggi':'richieste pubblicate oggi');
}

async function ensurePushSubscription(){
  if(!session?.user?.id)throw new Error('Accedi prima di attivare le notifiche.');
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Notifiche push non supportate su questo dispositivo.');
  if(Notification.permission!=='granted'){
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Permesso notifiche non concesso.');
  }
  const publicKey=window.UNAMANO_CONFIG?.vapidPublicKey||PUSH_PUBLIC_KEY;
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey)});}
  const json=sub.toJSON();
  const endpoint=json.endpoint||sub.endpoint;
  const p256dh=json.keys?.p256dh;
  const auth=json.keys?.auth;
  if(!endpoint||!p256dh||!auth)throw new Error('Dati della sottoscrizione push incompleti.');
  const r=await sb.rpc('save_push_subscription',{p_endpoint:endpoint,p_p256dh:p256dh,p_auth:auth});
  if(r.error)throw r.error;
  return sub;
}

async function removeCurrentPushSubscription(){
  if(!('serviceWorker'in navigator)||!('PushManager'in window))return;
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(!sub)return;
    if(session?.user?.id)await sb.rpc('remove_push_subscription',{p_endpoint:sub.endpoint});
    await sub.unsubscribe();
  }catch(e){}
}

async function loadPrefs(autoLocal){
  if(!session?.user?.id)return;
  const uid=session.user.id;
  const pr=await sb.from('profiles').select('city').eq('id',uid).maybeSingle();
  const wr=await sb.from('worker_preferences').select('categories,notifications_enabled').eq('user_id',uid).maybeSingle();
  prefs={city:pr.data?.city||'',categories:wr.data?.categories||[],notifications_enabled:!!wr.data?.notifications_enabled};
  if(autoLocal&&prefs.city){localBoard=true;if(byId('cityFilter'))byId('cityFilter').value=prefs.city;}
  addUi();patchRender();setupLive();patchActions();
  if(prefs.notifications_enabled&&'Notification'in window&&Notification.permission==='granted')ensurePushSubscription().then(()=>drawPrefs()).catch(()=>{});
}

async function savePrefs(){
  if(!session?.user?.id)return;
  const city=(byId('pc')?.value||prefs.city||'').trim();
  const categories=[...document.querySelectorAll('#workerCats input:checked')].map(x=>x.value);
  if(!city){toast('Inserisci prima la tua città nel profilo.','warn');return}
  if(!categories.length){toast('Scegli almeno una categoria.','warn');return}
  let notify=!!byId('workerNotify')?.checked;
  try{
    if(notify)await ensurePushSubscription();
    else await removeCurrentPushSubscription();
  }catch(e){
    notify=false;
    if(byId('workerNotify'))byId('workerNotify').checked=false;
    toast(e?.message||'Non riesco ad attivare le notifiche.','warn');
  }
  const uid=session.user.id;
  const a=await sb.from('profiles').update({city,updated_at:new Date().toISOString()}).eq('id',uid);
  const b=await sb.from('worker_preferences').upsert({user_id:uid,categories,notifications_enabled:notify,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(a.error||b.error){toast((a.error||b.error).message,'err');return}
  prefs={city,categories,notifications_enabled:notify};localBoard=true;
  if(byId('cityFilter'))byId('cityFilter').value=city;
  drawPrefs();drawBoardInfo();patchRender();setupLive();
  if(navigator.vibrate)navigator.vibrate([80,50,80]);
  toast(notify?'Preferenze salvate e notifiche push attive.':'Preferenze salvate.');
}

function getVisibleJobs(){
  const q=(byId('search')?.value||'').trim().toLowerCase();
  const c=byId('cat')?.value||activeCategory;
  const city=(byId('cityFilter')?.value||'').trim().toLowerCase();
  let list=jobs.filter(j=>j.status==='open'&&(!q||(`${j.title} ${j.description} ${j.category} ${j.city}`).toLowerCase().includes(q))&&(!c||j.category===c)&&(!city||norm(j.city).includes(city)));
  if(localBoard&&prefs.city)list=list.filter(j=>norm(j.city)===norm(prefs.city)&&isToday(j.created_at));
  return list;
}

function patchRender(){
  window.renderJobs=function(){
    const list=getVisibleJobs();
    byId('count').textContent=list.length?list.length+' '+(list.length===1?'richiesta':'richieste'):'';
    byId('jobs').innerHTML=list.length?list.map(jobCard).join(''):'<div class="card empty"><span class="emoji">🔎</span><b>Nessuna richiesta trovata</b><div class="small">Prova a cambiare filtri o zona.</div></div>';
    updateStats();drawBoardInfo();
  };
  renderJobs();
}

function showMyCityToday(){
  if(!session){need(()=>{});return}
  if(!prefs.city){go('profile');toast('Inserisci la tua città nel profilo.','warn');return}
  localBoard=true;if(byId('cityFilter'))byId('cityFilter').value=prefs.city;go('home');patchRender();
  setTimeout(()=>byId('feed')?.scrollIntoView({behavior:'smooth'}),50);
}
function showAll(){localBoard=false;if(byId('cityFilter'))byId('cityFilter').value='';patchRender()}

function notifyLiveJob(j){
  if(!prefs.notifications_enabled)return;
  if(document.visibilityState==='visible')toast('Nuova richiesta a '+j.city+': '+j.title);
  if(navigator.vibrate)navigator.vibrate([180,80,180]);
}

function setupLive(){
  if(!session?.user?.id)return;
  if(liveChannel)try{sb.removeChannel(liveChannel)}catch(e){}
  const uid=session.user.id;
  liveChannel=sb.channel('jobs-live-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'jobs'},p=>{
    const j=p.new;if(!j||j.owner_id===uid||j.status!=='open')return;
    if(norm(j.city)===norm(prefs.city)&&prefs.categories.includes(j.category)){
      notifyLiveJob(j);
      if(localBoard&&isToday(j.created_at)){if(!jobs.some(x=>x.id===j.id))jobs.unshift(j);patchRender()}
    }
  }).subscribe();
}

async function sendPushForJob(jobId){
  if(!jobId||!session?.user?.id)return;
  try{const r=await sb.functions.invoke('send-job-push',{body:{job_id:jobId}});if(r.error)console.warn('push dispatch failed',r.error)}catch(e){console.warn('push dispatch failed',e)}
}
window.sendPushForJob=sendPushForJob;

function patchActions(){
  if(!patchedCreateJob&&typeof window.createJob==='function'){
    const original=window.createJob;
    window.createJob=async function(){
      const before=new Set((typeof jobs!=='undefined'?jobs:[]).map(j=>j.id));
      const result=await original.apply(this,arguments);
      try{const created=(typeof jobs!=='undefined'?jobs:[]).find(j=>j.owner_id===session?.user?.id&&!before.has(j.id));if(created)sendPushForJob(created.id)}catch(e){}
      return result;
    };
    patchedCreateJob=true;
  }
  if(!patchedLogout&&typeof window.logout==='function'){
    const originalLogout=window.logout;
    window.logout=async function(){await removeCurrentPushSubscription();return originalLogout.apply(this,arguments)};
    patchedLogout=true;
  }
}

function patchProfileHooks(){
  if(typeof window.loadProfile==='function'&&!window.loadProfile.__workerPrefsPatched){
    const original=window.loadProfile;
    const wrapped=async function(){const r=await original.apply(this,arguments);addUi();await loadPrefs(false);return r};
    wrapped.__workerPrefsPatched=true;window.loadProfile=wrapped;
  }
  if(typeof window.saveProfile==='function'&&!window.saveProfile.__workerPrefsPatched){
    const original=window.saveProfile;
    const wrapped=async function(){const r=await original.apply(this,arguments);prefs.city=(byId('pc')?.value||prefs.city).trim();drawBoardInfo();return r};
    wrapped.__workerPrefsPatched=true;window.saveProfile=wrapped;
  }
}

window.addEventListener('load',()=>{
  ensureBabysitter();addUi();patchRender();patchProfileHooks();patchActions();
  let tries=0;const t=setInterval(()=>{
    tries++;ensureBabysitter();addUi();patchProfileHooks();patchActions();
    if(session?.user?.id){clearInterval(t);loadPrefs(true)}
    if(tries>30)clearInterval(t);
  },300);
});
})();
