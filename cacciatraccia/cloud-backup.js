/* Versioned account-private snapshots. A server backup never silently replaces local data. */
(()=>{'use strict';
const q=id=>document.getElementById(id);let ctx,api,busy=false,pending=false,timer,rows=[];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deadline=promise=>{let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('network timeout')),15000)})]).finally(()=>clearTimeout(timer))};
const active=()=>ctx&&window.__PFC_ACCOUNT_CONTEXT__?.id===ctx.id;
const key=()=> 'pfc-cloud-meta:'+ctx.id;
const meta=()=>{try{return JSON.parse(localStorage.getItem(key())||'{}')}catch{return{}}};
function status(text){if(active()&&q('cloudStatus'))q('cloudStatus').textContent=text;}
function device(){let id=localStorage.getItem('pfc-backup-device');if(!id){id=crypto.randomUUID();localStorage.setItem('pfc-backup-device',id)}return id;}
async function checksum(data){const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)));return [...new Uint8Array(raw)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function networkError(e){return /jwt|session|refresh|unauthor|401/i.test(e?.message||'')?'Accedi nuovamente online per riprendere il backup. I dati restano sul dispositivo.':'Backup in attesa di rete o servizio. I dati restano salvati sul dispositivo.';}
async function identity(){const {data,error}=await deadline(ctx.client.auth.getUser());if(error||data?.user?.id!==ctx.id)throw error||Error('Sessione non valida');if(!active())throw Error('Account cambiato');}
async function list(){
 if(!active()||!navigator.onLine)return;
 try{const {data,error}=await deadline(ctx.client.from('pfc_backups').select('id,created_at,device_id,label').eq('user_id',ctx.id).order('created_at',{ascending:false}).limit(20));if(error)throw error;if(active()){rows=data||[];render()}}catch(e){status(networkError(e))}
}
async function backup(force=false){
 if(!active())return false;if(busy){pending=true;return false}
 if(!navigator.onLine){pending=true;status('Offline · backup in attesa. Le modifiche sono salvate sul dispositivo.');return false}
 busy=true;pending=false;const button=q('syncNowBtn');if(button)button.disabled=true;
 try{
  const payload=api.backup(),hash=await checksum(payload);
  if(!meta().checksum&&!payload.data.points.length&&!payload.data.diary.length&&!payload.data.outings.length&&!payload.data.car){const existing=await deadline(ctx.client.from('pfc_backups').select('id').eq('user_id',ctx.id).limit(1));if(existing.error)throw existing.error;if(existing.data?.length){await list();status('Backup già disponibili nel tuo account: scegli una versione da ripristinare su questo dispositivo.');return true}}if(!force&&meta().checksum===hash){status('Backup cloud aggiornato · '+new Date(meta().at).toLocaleString('it-IT'));return true}
  if(JSON.stringify(payload).length>7500000)throw Error('Backup troppo grande: esporta il file locale completo.');
  status('Salvo il backup cloud privato…');await identity();
  const {data,error}=await deadline(ctx.client.from('pfc_backups').insert({user_id:ctx.id,device_id:device(),checksum:hash,label:force?'Backup manuale':'Backup automatico',data:payload}).select('id,created_at').single());
  if(error&&error.code!=='23505')throw error;if(!active())return false;
  localStorage.setItem(key(),JSON.stringify({checksum:hash,at:data?.created_at||new Date().toISOString()}));
  status('Backup cloud salvato · '+new Date(meta().at).toLocaleString('it-IT'));
  // Retention is restricted by RLS to this account; deletion never affects local points.
  const old=await deadline(ctx.client.from('pfc_backups').select('id').eq('user_id',ctx.id).order('created_at',{ascending:false}).range(20,200));
  if(!old.error&&old.data?.length)await deadline(ctx.client.from('pfc_backups').delete().in('id',old.data.map(x=>x.id)));
  await list();return true;
 }catch(e){pending=true;status(/troppo grande/.test(e.message||'')?e.message:networkError(e));return false}
 finally{busy=false;if(button&&active())button.disabled=false;if(pending&&navigator.onLine){clearTimeout(timer);timer=setTimeout(()=>backup(),30000)}}
}
async function restore(id,mode){
 if(busy||!active())return;if(!navigator.onLine)return status('Serve Internet per scaricare questo backup.');
 const row=rows.find(r=>r.id===id);if(!row)return;
 if(!confirm(mode==='replace'?'Sostituire i dati di questo dispositivo con il backup scelto? Prima viene conservata una copia locale della situazione attuale.':'Unire il backup ai dati di questo dispositivo? I punti locali più recenti vengono conservati.'))return;
 busy=true;
 try{await identity();const {data,error}=await deadline(ctx.client.from('pfc_backups').select('data').eq('id',id).eq('user_id',ctx.id).single());if(error)throw error;if(!active())return;api.restoreBackup(data.data,mode);localStorage.removeItem(key());status('Backup ripristinato. I dati precedenti sono nelle versioni locali. Riapri l’app per applicare anche tutte le impostazioni.');queue();}
 catch(e){status(e.message||'Ripristino non riuscito. I dati precedenti sono conservati.')}
 finally{busy=false;}
}
function render(){const el=q('pfcCloudVersions');if(!el)return;el.innerHTML=rows.length?rows.map(r=>'<div class="item"><b>'+escape(new Date(r.created_at).toLocaleString('it-IT'))+'</b><div class="meta">'+escape(r.label)+(r.device_id===device()?' · questo dispositivo':' · altro dispositivo')+'</div><div class="rowBtns"><button type="button" class="mini" data-cloud-merge="'+r.id+'">Ripristina unendo</button><button type="button" class="mini" data-cloud-replace="'+r.id+'">Sostituisci con questa versione</button></div></div>').join(''):'<p class="note">Nessun backup caricato. Il primo viene salvato automaticamente quando sei online.</p>';
 el.querySelectorAll('[data-cloud-merge]').forEach(b=>b.onclick=()=>restore(b.dataset.cloudMerge,'merge'));el.querySelectorAll('[data-cloud-replace]').forEach(b=>b.onclick=()=>restore(b.dataset.cloudReplace,'replace'));
}
function queue(){if(!active())return;pending=true;clearTimeout(timer);timer=setTimeout(()=>backup(),3000)}
function boot(){
 if(api||!window.__PFC_LIVE_API__||!window.__PFC_ACCOUNT_CONTEXT__)return;ctx=window.__PFC_ACCOUNT_CONTEXT__;api=window.__PFC_LIVE_API__;
 const card=q('cloudStatus')?.closest('.card');if(!card)return;
 card.querySelector('h3').textContent='☁️ Backup cloud privato';const note=card.querySelector('.note');if(note)note.textContent='Copie automatiche di punti, foto, diario, camminate, auto e impostazioni. Fino a 20 versioni private del tuo account. Il ripristino è sempre una tua scelta.';
 const box=document.createElement('div');box.id='pfcCloudVersions';card.appendChild(box);
 const sync=q('syncNowBtn');sync.disabled=false;sync.textContent='Salva backup adesso';sync.onclick=()=>backup(true);
 const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Mostra backup disponibili';refresh.onclick=list;sync.parentElement.appendChild(refresh);
 window.addEventListener('pfc:data-changed',queue);window.addEventListener('pfc:point-deleted',queue);window.addEventListener('pfc:activity-mode',queue);window.addEventListener('online',()=>{list();queue()});window.addEventListener('offline',()=>status('Offline · modifiche sul dispositivo, backup in attesa di rete.'));
 setInterval(()=>{if(!document.hidden&&navigator.onLine)backup()},5*60000);
 list();queue();window.PFC_CLOUD_BACKUP={backup,list,restore};
}
window.addEventListener('pfc:ready',boot);window.addEventListener('pfc:authenticated',boot);boot();
})();
