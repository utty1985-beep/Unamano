(function(){
  const PUSH_PUBLIC_KEY='BBqUijPcpNzkaPOlA_3x-x9vF-3eRskVhtDgAESwMeDws9D2KlNaSCG4Gde3ilG-TpPHc5enhSj9P53EkcU-9NM';
  const q=id=>document.getElementById(id);
  const ready=()=>typeof session!=='undefined'&&!!session?.user?.id&&typeof sb!=='undefined'&&!!sb;
  let installed=false;

  function toastMsg(msg,type){try{if(typeof toast==='function')return toast(msg,type)}catch(e){} console.log(msg)}
  function keyBytes(s){const pad='='.repeat((4-s.length%4)%4),b=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}

  async function ensureSubscription(){
    if(!ready())throw new Error('Accedi prima di attivare le notifiche.');
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Le notifiche push non sono supportate su questo dispositivo.');
    if(Notification.permission!=='granted'){
      const p=await Notification.requestPermission();
      if(p!=='granted')throw new Error('Permesso notifiche non concesso.');
    }
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(window.UNAMANO_CONFIG?.vapidPublicKey||PUSH_PUBLIC_KEY)});
    const json=sub.toJSON(),endpoint=json.endpoint||sub.endpoint,p256dh=json.keys?.p256dh,auth=json.keys?.auth;
    if(!endpoint||!p256dh||!auth)throw new Error('Dati push incompleti.');
    const r=await sb.from('push_subscriptions').upsert({user_id:session.user.id,endpoint,p256dh,auth,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
    if(r.error)throw r.error;
    return sub;
  }

  async function setEnabled(enabled){
    if(!ready())return;
    const btn=q('ownerPushAppBtn');if(btn){btn.disabled=true;btn.textContent=enabled?'Attivazione…':'Disattivazione…'}
    try{
      if(enabled)await ensureSubscription();
      const r=await sb.from('worker_preferences').upsert({user_id:session.user.id,push_application_notifications_enabled:!!enabled,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(r.error)throw r.error;
      const cb=q('ownerPushAppNotify');if(cb)cb.checked=!!enabled;
      const st=q('ownerPushAppStatus');if(st)st.textContent=enabled?'Notifiche candidature attive su questo account.':'Notifiche candidature disattivate.';
      toastMsg(enabled?'Notifiche candidature attivate.':'Notifiche candidature disattivate.');
    }catch(e){
      const cb=q('ownerPushAppNotify');if(cb)cb.checked=!enabled;
      toastMsg(e?.message||'Non riesco a modificare le notifiche.','warn');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=(q('ownerPushAppNotify')?.checked?'Disattiva notifiche candidature':'Attiva notifiche candidature')}
    }
  }

  async function loadState(){
    if(!ready())return;
    const r=await sb.from('worker_preferences').select('push_application_notifications_enabled').eq('user_id',session.user.id).maybeSingle();
    const enabled=!!r.data?.push_application_notifications_enabled;
    const cb=q('ownerPushAppNotify');if(cb)cb.checked=enabled;
    const btn=q('ownerPushAppBtn');if(btn)btn.textContent=enabled?'Disattiva notifiche candidature':'Attiva notifiche candidature';
    const st=q('ownerPushAppStatus');
    if(st){
      if(!('Notification'in window))st.textContent='Notifiche push non supportate su questo dispositivo.';
      else if(Notification.permission==='denied')st.textContent='Notifiche bloccate nelle impostazioni del browser/telefono.';
      else st.textContent=enabled?'Notifiche candidature abilitate.':'Attivale per essere avvisato quando qualcuno si candida.';
    }
  }

  function install(){
    if(installed)return true;
    const box=q('umNotifyChannels');
    if(!box)return false;
    installed=true;
    const wrap=document.createElement('div');
    wrap.id='ownerPushAppWrap';
    wrap.style.marginTop='12px';
    wrap.innerHTML=`<label style="display:flex;gap:8px;align-items:flex-start"><input id="ownerPushAppNotify" type="checkbox" style="width:auto;margin-top:3px" disabled><span><b>Push · nuove candidature</b><br><span class="small">Ricevi un avviso sul telefono anche con UnaMano chiusa.</span></span></label><button id="ownerPushAppBtn" class="btn p sm" type="button" style="margin-top:9px">Attiva notifiche candidature</button><div id="ownerPushAppStatus" class="small" style="margin-top:6px"></div>`;
    const emailLabel=q('ownerEmailAppNotify')?.closest('label');
    if(emailLabel)emailLabel.insertAdjacentElement('beforebegin',wrap);else box.appendChild(wrap);
    q('ownerPushAppBtn').onclick=()=>setEnabled(!q('ownerPushAppNotify')?.checked);
    loadState();
    return true;
  }

  function boot(){let n=0;const t=setInterval(()=>{n++;if(install()||n>80)clearInterval(t)},250)}
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
