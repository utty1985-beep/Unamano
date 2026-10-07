/* Uscita con amici. Only current, explicitly shared positions leave this module. */
(function(){
 'use strict';
 const URL='https://cfnivvdtyhpgbwmbgoke.supabase.co';
 const KEY='sb_publishable_p_nrywLxqXT26U69v_SmPA_c1-4INqb';
 const q=id=>document.getElementById(id),enc=new TextEncoder(),dec=new TextDecoder();
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
 const b64=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const un64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const parse=value=>{
   let token=String(value||'').trim();if(token.includes('#'))token=new URLSearchParams(token.split('#')[1]).get('uscita')||'';
   const parts=token.split('.'),expires=Number(parts[1]);
   if(parts.length!==2||!/^[A-Za-z0-9_-]{43}$/.test(parts[0])||!Number.isSafeInteger(expires)||expires<=Date.now()||expires>Date.now()+9*3600000)throw Error('Invito non valido o scaduto. Chiedi un nuovo invito.');
   return {token,secret:parts[0],expires};
 };
 let api=null,client=null,channel=null,group=null,key=null,room='',epoch=0,connected=false,working=false;
 let ownId=b64(bytes(16)),ownName='',ownFix=null,ownFixAt=0,sharing=false,lastSend=0,sending=false,timer=null,layer=null,markers=new Map(),peers=new Map(),members=new Map(),syncSequence=0;
 let framed=false;
 const fresh=()=>[...peers.values()].filter(p=>Date.now()-p.receivedAt<45000);
 function showTeamMap(fit=true){
   q('pfcFriendsModal')?.classList.remove('open');api.showMap();
   if(!api.map().hasLayer(layer))layer.addTo(api.map());
   const points=fresh().map(p=>[p.lat,p.lng]);
   if(ownFix&&Date.now()-ownFixAt<45000)points.push([ownFix.lat,ownFix.lng]);
   if(fit&&points.length)api.map().fitBounds(window.L.latLngBounds(points),{padding:[55,65],maxZoom:17});
 }
 const distance=(a,b)=>{const r=x=>x*Math.PI/180,x=r(b.lat-a.lat),y=r(b.lng-a.lng),z=Math.sin(x/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));};
 const metres=d=>d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km';
 function status(t){if(q('pfcFriendsStatus'))q('pfcFriendsStatus').textContent=t;}
 function render(){
   if(!api)return;
   const freshPeers=fresh();
   if(group&&!api.map().hasLayer(layer))layer.addTo(api.map());
   const roster=group?[{id:ownId,name:ownName,mine:true},...members.values()]:[];
   if(q('teamMemberCount'))q('teamMemberCount').textContent=roster.length+(roster.length===1?' persona nel gruppo':' persone nel gruppo');
   if(q('teamMembers'))q('teamMembers').innerHTML=roster.map(p=>'<span>'+esc(p.name)+(p.mine?' (tu)':'')+'</span>').join(' · ');
   const caption=group?(connected?(sharing?'● Posizione condivisa':'⏸ Condivisione in pausa'):'Connessione interrotta · riconnessione…'):'Nessuna uscita attiva';
   status(caption+(group?' · scade alle '+new Date(group.expires).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):''));
   q('pfcFriendsIdle').hidden=!!group;q('pfcFriendsActive').hidden=!group;
   q('pfcFriendsPause').textContent=sharing?'⏸ Sospendi posizione':'▶ Riprendi posizione';
   const origin=ownFix&&Date.now()-ownFixAt<30000?ownFix:null;
   q('pfcFriendsList').innerHTML=freshPeers.length?freshPeers.map(p=>'<div class="pfcFriendRow"><b>👤 '+esc(p.name)+'</b><strong>'+(origin?metres(distance(origin,p)):'Attendo il tuo GPS')+'</strong><small>Aggiornato '+Math.max(0,Math.floor((Date.now()-p.receivedAt)/1000))+' s fa · GPS ±'+Math.round(p.acc)+' m</small><button type="button" data-friend="'+p.id+'">Vedi sulla mappa</button></div>').join(''):'<p class="muted">'+(group?'Nessuna posizione disponibile. Gli amici possono scrivere in chat anche con GPS o audio spenti. Per comparire nel radar devono condividere il GPS.':'Crea un’uscita o apri l’invito di un amico.')+'</p>';
   q('pfcFriendsList').querySelectorAll('[data-friend]').forEach(b=>b.onclick=()=>{const p=peers.get(b.dataset.friend);if(p){q('pfcFriendsModal').classList.remove('open');api.showMap();api.map().setView([p.lat,p.lng],17);}});
   const activeIds=new Set(freshPeers.map(p=>p.id));
   for(const [id,m] of markers)if(!activeIds.has(id)){layer.removeLayer(m);markers.delete(id);}
   for(const p of freshPeers){let m=markers.get(p.id);const label=esc(p.name)+(origin?' · '+metres(distance(origin,p)):'');
     if(!m){m=window.L.marker([p.lat,p.lng],{icon:window.L.divIcon({className:'pfcFriendMarker',html:'<span>👤</span>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(layer);m.bindTooltip(label,{permanent:true,direction:'top',className:'pfcFriendLabel'});markers.set(p.id,m);}
     else {m.setLatLng([p.lat,p.lng]);m.setTooltipContent(label);}
   }
   if(group&&freshPeers.length&&!framed){framed=true;showTeamMap();}
   const mapList=q('teamMapPositions');if(mapList)mapList.textContent=freshPeers.length?freshPeers.map(p=>p.name+(origin?' · '+metres(distance(origin,p)):'' )).join(' · '):(group?'Attendo il GPS dei compagni · '+roster.length+' nel gruppo':'');
   window.dispatchEvent(new CustomEvent('pfc:friends',{detail:{joined:!!group,connected,count:roster.length,members:roster,positionCount:freshPeers.length,caption}}));
 }
 async function seal(payload){const iv=bytes(12),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(room)},key,enc.encode(JSON.stringify(payload)));return {iv:b64(iv),data:b64(new Uint8Array(data))};}
 async function open(envelope){if(!envelope||typeof envelope.data!=='string'||envelope.data.length>40000||typeof envelope.iv!=='string')throw Error('Invalid message');const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(envelope.iv),additionalData:enc.encode(room)},key,un64(envelope.data));return JSON.parse(dec.decode(raw));}
 async function saveChat(items){
   if(!group||!key)return;const stamp=epoch,expires=group.expires,storageKey='pfc-chat:'+room;
   try{const packet=await seal(items.slice(-200));if(stamp===epoch)localStorage.setItem(storageKey,JSON.stringify({expires,packet}));}catch{}
 }
 async function loadChat(){
   try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith('pfc-chat:')){const v=JSON.parse(localStorage.getItem(k));if(!v||v.expires<=Date.now())localStorage.removeItem(k);}}const v=JSON.parse(localStorage.getItem('pfc-chat:'+room)||'null');return v&&v.expires>Date.now()?await openChat(v.packet):[];}catch{return [];}
 }
 async function openChat(envelope){
   if(!envelope||typeof envelope.data!=='string'||envelope.data.length>2000000)throw Error('Invalid history');
   const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(envelope.iv),additionalData:enc.encode(room)},key,un64(envelope.data));return JSON.parse(dec.decode(raw));
 }
 function valid(p){return p&&/^[A-Za-z0-9_-]{22}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=30&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180&&Number.isFinite(p.acc)&&p.acc>=0&&Number.isFinite(p.at)&&Math.abs(Date.now()-p.at)<30000;}
 async function sync(){
   if(!channel||!connected)return;const stamp=epoch,seq=++syncSequence;const nextMembers=new Map();const envelopes=Object.values(channel.presenceState()).flat().slice(0,100),next=new Map();
   await Promise.all(envelopes.map(async e=>{try{const p=await open(e.packet);if(p.id!==ownId&&p&&/^[A-Za-z0-9_-]{22}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=30&&Math.abs(Date.now()-p.memberAt)<30000)nextMembers.set(p.id,{id:p.id,name:p.name});if(p.id!==ownId&&valid(p))next.set(p.id,{...p,receivedAt:p.at});}catch{}}));
   if(stamp!==epoch||seq!==syncSequence)return;peers=next;members=nextMembers;render();
 }
 async function publish(force=false){
   if(!group||!channel||!connected||sending||!force&&Date.now()-lastSend<5000)return;
   const stamp=epoch,activeChannel=channel;sending=true;lastSend=Date.now();
   try{const hasFix=sharing&&!document.hidden&&ownFix&&Date.now()-ownFixAt<30000;const packet=await seal({id:ownId,name:ownName,memberAt:Date.now(),...(hasFix?{lat:ownFix.lat,lng:ownFix.lng,acc:ownFix.acc,at:ownFixAt}:{})});if(stamp!==epoch)return;const result=await activeChannel.track({packet});if(stamp!==epoch)await activeChannel.untrack();if(result!=='ok'&&stamp===epoch)status('Invio posizione non riuscito · riprovo');}
   catch{if(stamp===epoch)status('Invio posizione non riuscito · riprovo');}finally{sending=false;}
 }
 async function leave(){
   try{sessionStorage.removeItem('pfc-active-outing');}catch{}framed=false;
   window.dispatchEvent(new Event('pfc:team-left'));++epoch;const old=channel;channel=null;connected=false;sharing=false;group=null;key=null;peers.clear();members.clear();clearInterval(timer);timer=null;
   if(old){try{await old.untrack();await client.removeChannel(old);}catch{}}
   render();
 }
 async function join(invite){
   if(working)return;const name=q('pfcFriendsName').value.trim();if(!name)return status('Inserisci il tuo nome.');
   working=true;const button=q('pfcFriendsCreate');button.disabled=true;q('pfcFriendsJoin').disabled=true;
   try{
     if(!navigator.onLine)throw Error('Serve Internet per l’uscita con amici.');
     if(!crypto.subtle||!window.supabase)throw Error('Connessione amici non caricata. Ricarica con Internet.');
     const next=parse(invite);await leave();group=next;ownName=name.slice(0,30);sharing=true;
     const stamp=epoch;key=await crypto.subtle.importKey('raw',un64(group.secret),'AES-GCM',false,['encrypt','decrypt']);
     room='pfc-outing-'+b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(group.token))));
     client=client||window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
     channel=client.channel(room,{config:{presence:{key:ownId},broadcast:{ack:true},private:false}});
     channel.on('broadcast',{event:'team'},async e=>{const current=epoch;try{const m=await open(e.payload);if(current===epoch&&group&&Date.now()<group.expires&&m&&/^[A-Za-z0-9_-]{22}$/.test(m.id)&&Math.abs(Date.now()-m.at)<30000)window.dispatchEvent(new CustomEvent('pfc:team-message',{detail:m}));}catch{}});
     channel.on('presence',{event:'sync'},sync).subscribe(state=>{
       if(stamp!==epoch)return;
       connected=state==='SUBSCRIBED';if(connected){try{sessionStorage.setItem('pfc-active-outing',JSON.stringify({token:group.token,name:ownName,id:ownId}));localStorage.setItem('pfc-team-name',ownName);}catch{}showTeamMap(false);publish(true);sync();window.dispatchEvent(new CustomEvent('pfc:team-ready',{detail:{id:()=>ownId,name:()=>ownName,group:()=>room,expires:()=>group?.expires,saveChat,loadChat,ready:()=>stamp===epoch&&connected&&!!group&&Date.now()<group.expires,send:async payload=>{if(stamp!==epoch||!connected||!group||Date.now()>=group.expires)throw Error('Gruppo non connesso');const packet=await seal({...payload,id:ownId,name:ownName,at:Date.now()});if(stamp!==epoch)throw Error('Gruppo terminato');const result=await channel.send({type:'broadcast',event:'team',payload:packet});if(result!=='ok')throw Error('Invio non riuscito');}}}));}else {peers.clear();members.clear();}render();
     });
     timer=setInterval(async()=>{if(!group)return;if(Date.now()>=group.expires){await leave();status('Uscita terminata: invito scaduto.');return;}if(sharing&&!document.hidden&&Date.now()-ownFixAt>15000){const fix=await api.getFix();if(fix&&group&&stamp===epoch){ownFix=fix;ownFixAt=Date.now();}}await publish();render();},5000);
     q('pfcFriendsInvite').value=location.origin+location.pathname+'?v=6.9.8#uscita='+group.token;
     render();const fix=await api.getFix();if(fix&&stamp===epoch){ownFix={lat:+fix.lat,lng:+fix.lng,acc:Math.max(0,+fix.acc||0)};ownFixAt=Date.now();await publish(true);}else if(stamp===epoch)status('Gruppo attivo · abilita il GPS per condividere la posizione.');
   }catch(e){await leave();status(e.message||'Impossibile collegare l’uscita.');}
   finally{working=false;button.disabled=false;q('pfcFriendsJoin').disabled=false;}
 }
 function panel(){
   let m=q('pfcFriendsModal');if(m)return m;
   const css=document.createElement('style');css.textContent='.pfcFriendMarker span{display:grid;place-items:center;background:#246b9d;border:3px solid white;border-radius:50%;height:32px;box-shadow:0 2px 8px #0005}.pfcFriendLabel{font-weight:800;color:#174464}.pfcFriendRow{display:grid;grid-template-columns:1fr auto;gap:8px;border-bottom:1px solid #d7ded8;padding:14px 0}.pfcFriendRow small{grid-column:1/-1;color:#657266}#pfcFriendsStatus{padding:12px;background:#edf4ee;border-radius:12px;margin:10px 0}#pfcFriendsModal input{width:100%;margin:6px 0 12px}#pfcFriendsModal [hidden]{display:none!important}#pfcFriendsModal label{display:block}.pfcFriendsActions{display:flex;gap:8px;flex-wrap:wrap}';document.head.appendChild(css);
   m=document.createElement('div');m.id='pfcFriendsModal';m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Uscita con amici');
   m.innerHTML='<div class="dialog"><div class="sectionHead"><h2>👥 Uscita con amici</h2><button id="pfcFriendsClose" class="iconBtn" aria-label="Chiudi uscita amici">✕</button></div><p>Condividete soltanto la posizione attuale, con nome e distanza su mappa e radar. Gli appostamenti personali restano sul tuo telefono.</p><p class="muted">Funziona con Internet, GPS e app aperta. Chi riceve il link può entrare: invialo soltanto agli amici dell’uscita. Scade dopo 8 ore. Quando passi ad un’altra app la tua posizione viene sospesa.</p><div id="pfcFriendsStatus" role="status"></div><div id="pfcFriendsIdle"><label>Il tuo nome<input id="pfcFriendsName" maxlength="30" placeholder="Es. Luca"></label><button id="pfcFriendsCreate" class="primary">＋ Crea uscita e condividi posizione</button><label style="margin-top:18px">Invito ricevuto<input id="pfcFriendsToken" placeholder="Incolla il link dell’amico"></label><button id="pfcFriendsJoin" class="secondary">Entra nell’uscita e condividi posizione</button></div><div id="pfcFriendsActive" hidden><label>Invito al gruppo<input id="pfcFriendsInvite" readonly></label><div class="pfcFriendsActions"><button id="pfcFriendsCopy" class="secondary">Copia invito</button><button id="pfcFriendsShare" class="secondary">Condividi invito</button><button id="pfcFriendsPause" class="secondary">⏸ Sospendi posizione</button><button id="pfcFriendsLeave" class="danger">Esci dall’uscita</button></div><h3 id="teamMemberCount">1 persona nel gruppo</h3><div id="teamMembers" aria-live="polite"></div><div id="pfcFriendsList"></div></div></div>';
   document.body.appendChild(m);q('pfcFriendsClose').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open');};
   q('pfcFriendsCreate').onclick=()=>join(b64(bytes(32))+'.'+(Date.now()+8*3600000));q('pfcFriendsJoin').onclick=()=>join(q('pfcFriendsToken').value);
   q('pfcFriendsLeave').onclick=leave;
   q('pfcFriendsPause').onclick=async()=>{if(!channel)return;sharing=!sharing;if(sharing){const fix=await api.getFix();if(fix){ownFix=fix;ownFixAt=Date.now();}await publish(true);}else await publish(true);render();};
   q('pfcFriendsCopy').onclick=async()=>{try{await navigator.clipboard.writeText(q('pfcFriendsInvite').value);status('Invito copiato.');}catch{q('pfcFriendsInvite').select();status('Seleziona e copia il link dell’invito.');}};
   q('pfcFriendsShare').onclick=async()=>{const url=q('pfcFriendsInvite').value;try{if(navigator.share)await navigator.share({title:'Uscita con amici',text:'Apri l’invito e inserisci il tuo nome per vederci su mappa e radar.',url});else q('pfcFriendsCopy').click();}catch(e){if(e.name!=='AbortError')status('Condivisione non disponibile: copia l’invito.');}};
   return m;
 }
 function boot(){
   if(api||!window.__PFC_LIVE_API__)return;api=window.__PFC_LIVE_API__;panel();layer=window.L.layerGroup().addTo(api.map());
   const button=document.createElement('button');button.id='pfcFriendsBtn';button.type='button';button.className='secondary';button.innerHTML='<b>👥</b><span>Squadra Live</span><small>Nomi e distanze in tempo reale</small>';button.onclick=()=>{panel().classList.add('open');render();};q('pfc676Quick')?.appendChild(button);
   const alt=document.createElement('button');alt.id='pfcFriendsBackupBtn';alt.className='secondary';alt.textContent='👥 Uscita con amici';alt.onclick=button.onclick;q('page-backup')?.appendChild(alt);
   window.__PFC_FRIEND_POINTS__=()=>fresh().map(p=>({id:'friend_'+p.id,lat:p.lat,lng:p.lng,name:p.name,type:'Amico',__friend:true}));
   window.__PFC_SHOW_TEAM_MAP__=()=>showTeamMap();
   window.addEventListener('pfc:position',e=>{const f=e.detail;if(Number.isFinite(+f?.lat)&&Number.isFinite(+f?.lng)){ownFix={lat:+f.lat,lng:+f.lng,acc:Math.max(0,+f.acc||0)};ownFixAt=Date.now();publish();render();}});
   document.addEventListener('visibilitychange',async()=>{if(!channel)return;if(document.hidden){await publish(true);}else{const fix=await api.getFix();if(fix){ownFix=fix;ownFixAt=Date.now();}publish(true);}render();});
   window.addEventListener('pagehide',()=>{sharing=false;channel?.untrack();});
   let saved=null;try{saved=JSON.parse(sessionStorage.getItem('pfc-active-outing')||'null');q('pfcFriendsName').value=localStorage.getItem('pfc-team-name')||'';}catch{}
   const token=new URLSearchParams(location.hash.slice(1)).get('uscita');
   if(saved&&(!token||token===saved.token)){try{parse(saved.token);if(/^[A-Za-z0-9_-]{22}$/.test(saved.id))ownId=saved.id;q('pfcFriendsName').value=saved.name;join(saved.token);}catch{try{sessionStorage.removeItem('pfc-active-outing');}catch{}}}
   if(token&&(!saved||token!==saved.token)){q('pfcFriendsToken').value=token;panel().classList.add('open');status('Invito ricevuto: inserisci il nome e premi Entra.');}
   if(token)history.replaceState(null,'',location.pathname+location.search);
   render();
 }
 window.addEventListener('pfc:ready',boot);boot();
})();
