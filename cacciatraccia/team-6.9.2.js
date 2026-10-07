/* Squadra Live: encrypted signaling/text, WebRTC voice, explicit microphone opt-in. */
(()=>{'use strict';
const q=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let transport,stream,active=false,pressed=false,muted=false,volume=.8,heartbeat,session=0,starting=false,joined=false,unread=0,playing=null,playQueue=[],listenBusy=false;
const peers=new Map(),messages=[];
function status(s){if(q('teamVoiceStatus'))q('teamVoiceStatus').textContent=s;if(q('teamMapStatus'))q('teamMapStatus').textContent=s;}
function draw(){syncBar();if(!q('teamPeers'))return;q('teamPeers').innerHTML=[...peers.values()].map(p=>'<div><b>'+esc(p.name)+'</b> · '+(p.pc?.connectionState==='connected'?(p.talking?'🎙 Sta parlando':'● Audio collegato'):p.pc?.connectionState==='failed'?'Audio non raggiungibile su questa rete':'Collegamento audio…')+'</div>').join('')||'Nessun altro amico ha attivato l’audio.';q('teamMessages').innerHTML=messages.slice(-100).map(m=>'<p><b>'+esc(m.name)+':</b> '+esc(m.text)+(m.unread?' <button type="button" data-team-read="'+messages.indexOf(m)+'">Letto</button>':'')+'</p>').join('');q('teamMessages').querySelectorAll('[data-team-read]').forEach(b=>b.onclick=()=>{messages[Number(b.dataset.teamRead)].unread=false;draw();});drawMissed();}
function stopTalking(){const wasPressed=pressed;pressed=false;for(const p of peers.values())if(p.audio)p.audio.muted=muted;stream?.getAudioTracks().forEach(t=>t.enabled=false);q('teamPTT')?.classList.remove('active');q('teamMapTalk')?.classList.remove('active');if(active&&wasPressed)transport?.send({kind:'talk',talking:false}).catch(()=>{});}
function talk(){if(document.hidden)return; if(!active||!transport?.ready())return requestAudio();if(![...peers.values()].some(p=>p.pc?.connectionState==='connected'))return status('Attendi che un amico attivi e colleghi l’audio.');pressed=true;for(const p of peers.values()){if(p.audio)p.audio.muted=true;if(p.recording)p.recording.missed=true;}stream.getAudioTracks().forEach(t=>t.enabled=true);q('teamPTT')?.classList.add('active');q('teamMapTalk')?.classList.add('active');transport.send({kind:'talk',talking:true}).catch(()=>stopTalking());status('🎙 Stai parlando · rilascia per ascoltare');}
function remove(id){const p=peers.get(id);if(p){finishVoice(p);p.pc?.close();p.audio?.pause();p.audio?.remove();peers.delete(id);}draw();}
async function off(notify=true){playing?.pause();playing=null;listenBusy=false;session++;stopTalking();active=false;clearInterval(heartbeat);heartbeat=null;if(notify&&transport?.ready())await transport.send({kind:'bye'}).catch(()=>{});for(const id of [...peers.keys()])remove(id);stream?.getTracks().forEach(t=>t.stop());stream=null;q('teamAudio')&&(q('teamAudio').textContent='Attiva audio / microfono');status('Audio spento');syncBar();}
function connection(id,name){
 if(peers.has(id))return peers.get(id);if(peers.size>=8)return null;
 const p={name,at:Date.now(),talking:false,candidates:[],pc:new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]})};peers.set(id,p);
 stream.getTracks().forEach(t=>p.pc.addTrack(t,stream));
 p.pc.onicecandidate=e=>{if(e.candidate&&active)transport.send({kind:'ice',to:id,candidate:e.candidate.toJSON()}).catch(()=>{});};
 p.pc.ontrack=e=>{const a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.muted=muted||pressed;a.volume=volume;a.srcObject=e.streams[0]||new MediaStream([e.track]);p.audio?.remove();p.audio=a;p.remoteStream=a.srcObject;document.body.appendChild(a);a.onplaying=()=>{p.blocked=false;};a.play().catch(()=>{p.blocked=true;if(p.recording)p.recording.missed=true;status('Tocca “Ascolta” per sentire gli amici.');});};
 p.pc.onconnectionstatechange=()=>{if(p.pc.connectionState==='failed')status('Audio non raggiungibile su questa rete. Mappa e messaggi restano disponibili.');draw();};draw();return p;
}
async function receive(m){
 if(!transport||!m||m.id===transport.id()||typeof m.name!=='string'||m.name.length>30)return;
 if(m.kind==='text'&&typeof m.text==='string'&&m.text.length<=240){messages.push({name:m.name,text:m.text,unread:true});if(messages.length>100)messages.shift();draw();return;}
 if(!active){if(m.kind==='talk'&&m.talking){playQueue.push({name:m.name,unavailable:true});if(playQueue.length>30){const old=playQueue.shift();if(old.url)URL.revokeObjectURL(old.url);}syncBar();}return;}if(m.to&&m.to!==transport.id())return;
 try{
  if(m.kind==='bye'){remove(m.id);return;}
  if(m.kind==='hello'){
   const existed=peers.has(m.id),p=connection(m.id,m.name);if(!p)return;p.at=Date.now();
   if(!existed){await transport.send({kind:'hello',to:m.id});if(transport.id()<m.id){await p.pc.setLocalDescription(await p.pc.createOffer());await transport.send({kind:'offer',to:m.id,sdp:p.pc.localDescription.toJSON()});}}
   return;
  }
  const p=connection(m.id,m.name);if(!p)return;p.at=Date.now();
  if(m.kind==='talk'){const next=!!m.talking;if(next&&!p.talking)beginVoice(p);if(!next&&p.talking)finishVoice(p);p.talking=next;draw();return;}
  if(m.kind==='ice'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(m.candidate);else if(p.candidates.length<50)p.candidates.push(m.candidate);return;}
  if(m.kind==='offer'||m.kind==='answer'){
   if(!m.sdp||m.sdp.type!==m.kind||typeof m.sdp.sdp!=='string'||m.sdp.sdp.length>20000)return;
   await p.pc.setRemoteDescription(m.sdp);for(const c of p.candidates.splice(0))await p.pc.addIceCandidate(c);
   if(m.kind==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());await transport.send({kind:'answer',to:m.id,sdp:p.pc.localDescription.toJSON()});}
  }
 }catch{status('Collegamento audio da riprovare: spegni e riattiva audio.');}
}
async function on(){
 if(starting)return;if(active)return off();if(!transport?.ready())return status('Entra prima in una Squadra Live.');if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return status('Audio non supportato da questo browser.');
 starting=true;const stamp=session;
 try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(stamp!==session||!transport.ready()){s.getTracks().forEach(t=>t.stop());return;}stream=s;stream.getTracks().forEach(t=>t.enabled=false);active=true;syncBar();q('teamAudio').textContent='Spegni audio / microfono';status('Microfono pronto · tieni premuto per parlare');q('teamPermissionModal')?.classList.remove('open');await transport.send({kind:'hello'});heartbeat=setInterval(()=>{if(!transport.ready()){off(false);return;}transport.send({kind:'hello'}).catch(()=>{});for(const [id,p] of peers)if(Date.now()-p.at>35000)remove(id);},10000);}
 catch(e){if(stamp!==session||!joined)return;await off(false);status(e.name==='NotAllowedError'?'Microfono non autorizzato: apri le autorizzazioni e consenti l’accesso.':'Impossibile attivare audio. Riprova.');permissionPage(e.name);}finally{starting=false;}
}
function mount(){
 const host=q('pfcFriendsActive');if(!host||q('teamAudio'))return;
 q('pfcFriendsModal')?.setAttribute('aria-label','Squadra Live');q('pfcFriendsModal')?.querySelector('h2')&&(q('pfcFriendsModal').querySelector('h2').textContent='👥 Squadra Live');
 const box=document.createElement('section');box.innerHTML='<h3>🎙 Comunicazione della squadra</h3><p>Attiva l’audio su ogni telefono. Tieni premuto per parlare, rilascia per ascoltare. Usa un auricolare Bluetooth collegato al telefono. App aperta e Internet necessari.</p><button id="teamAudio" class="secondary">Attiva audio / microfono</button><p id="teamVoiceStatus" role="status">Audio spento</p><button id="teamPTT" class="primary wide" style="touch-action:none;user-select:none;min-height:68px">🎙 Tieni premuto per parlare</button><div class="pfcFriendsActions"><button id="teamMute" class="secondary">Silenzia ascolto</button><button id="teamListen" class="secondary">Riprendi ascolto</button></div><label>Volume ascolto<input id="teamVolume" type="range" min="0" max="1" step=".05" value=".8"></label><div id="teamPeers" aria-live="polite"></div><h3>Messaggi brevi</h3><label>Messaggio alla squadra<input id="teamText" maxlength="240" placeholder="Es. Vi aspetto alla macchina"></label><button id="teamSend" class="secondary">Invia messaggio</button><div id="teamMessages" aria-live="polite"></div><div id="teamMissed" aria-live="polite"></div><p class="note">Le voci ricevute mentre l’ascolto è silenziato vengono conservate temporaneamente su questo telefono per riascoltarle. Si cancellano dopo l’ascolto o quando esci dalla squadra.</p><p class="note">Sul sito usa il pulsante sullo schermo. Il tasto Volume+ e i pulsanti PTT esterni richiedono l’integrazione Android e una verifica sul dispositivo.</p>';
 host.appendChild(box);q('teamAudio').onclick=()=>active?off():requestAudio();
 bindTalk(q('teamPTT'));
 q('teamMute').onclick=()=>{muted=!muted;for(const p of peers.values()){if(p.audio)p.audio.muted=muted;if(muted&&p.recording)p.recording.missed=true;}syncBar();};
 q('teamVolume').oninput=e=>{volume=Number(e.target.value);for(const p of peers.values())if(p.audio)p.audio.volume=volume;};q('teamListen').onclick=listen;
 q('teamSend').onclick=async()=>{const text=q('teamText').value.trim();if(!text)return;if(!transport?.ready())return status('Entra nel gruppo per inviare messaggi.');try{await transport.send({kind:'text',text});messages.push({name:'Tu',text});q('teamText').value='';draw();}catch{status('Messaggio non inviato. Riprova.');}};
 const accessories=document.createElement('section');accessories.innerHTML='<h3>Accessori compatibili – Squadra Live</h3><p>Accessori facoltativi. La compatibilità del pulsante PTT con questa app Android va verificata prima dell’acquisto.</p><p><a href="https://www.pryme.com/index.php?l=product_detail&p=2532" target="_blank" rel="noopener noreferrer">PRYME BT-PTT-ZU Super Mini</a> · pulsante Bluetooth PTT</p><p><a href="https://ainaptt.com/shop-2/" target="_blank" rel="noopener noreferrer">AINA PTT Voice Responder</a> · PTT, microfono e altoparlante</p><h4>Possibile estensione futura</h4><p>Comunicazioni senza rete tramite radio esterne o collegamento diretto compatibile. La Squadra Live attuale richiede Internet.</p>';
 q('pfcFriendsModal').querySelector('.dialog').appendChild(accessories);draw();
}

function drawMissed(){const host=q('teamMissed');if(!host)return;host.innerHTML=playQueue.map((m,i)=>'<p>'+esc(m.name)+(m.unavailable?' · Voce non recuperabile, chiedi di ripetere. <button data-team-dismiss="'+i+'">Ho visto</button>':' · Messaggio vocale da ascoltare')+'</p>').join('');host.querySelectorAll('[data-team-dismiss]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.teamDismiss);if(playQueue[i]?.unavailable)playQueue.splice(i,1);syncBar();});}
function syncBar(){
 drawMissed();
 unread=messages.filter(m=>m.unread).length+playQueue.length+[...peers.values()].filter(p=>p.recording?.missed).length;
 const b=q('teamMapSquad');if(b){b.classList.toggle('teamUnread',unread>0);b.setAttribute('aria-label','Squadra'+(unread?' · '+unread+' notifiche da ascoltare o leggere':''));q('teamMapBadge').textContent=unread||'';q('teamMapBadge').hidden=!unread;}
 if(q('teamMapBar'))q('teamMapBar').hidden=!joined;
 if(q('teamMapListen')){q('teamMapListen').setAttribute('aria-pressed',String(active&&!muted));q('teamMapListen').title=active&&!muted?'In ascolto · riproduci messaggi in attesa':'Attiva ascolto';}
 if(q('teamMute'))q('teamMute').textContent=muted?'Riattiva ascolto':'Silenzia ascolto';
}
function bindTalk(b){
 b.dataset.ctNoLongHelp='1';
 b.oncontextmenu=e=>e.preventDefault();b.ondragstart=e=>e.preventDefault();
 b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);talk();};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{if(pressed){stopTalking();status('In ascolto');}};
 b.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();talk();}};
 b.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(pressed){stopTalking();status('In ascolto');}}};
}
function permissionPage(error){
 let m=q('teamPermissionModal');if(!m){m=document.createElement('div');m.id='teamPermissionModal';m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Autorizza audio');m.innerHTML='<div class="dialog"><div class="sectionHead"><h2>🎙 Autorizza audio</h2><button id="teamPermissionClose" class="iconBtn" aria-label="Chiudi autorizzazioni">✕</button></div><p id="teamPermissionHelp"></p><button id="teamPermissionAllow" class="primary wide">Consenti microfono e abilita audio</button><p class="note">Il microfono trasmette soltanto mentre tieni premuto “Parla”. Per sentire gli amici usa “Ascolta”.</p><button id="teamPermissionBack" class="secondary">Torna alla mappa</button></div>';document.body.appendChild(m);q('teamPermissionAllow').onclick=requestAudio;q('teamPermissionClose').onclick=q('teamPermissionBack').onclick=()=>m.classList.remove('open');}
 q('teamPermissionHelp').textContent=error==='NotAllowedError'?'Il permesso è bloccato o è stato rifiutato. In Chrome tocca l’icona accanto all’indirizzo, apri Autorizzazioni e consenti Microfono. Se usi l’app installata, controlla anche Impostazioni Android → App → questa app o il browser → Autorizzazioni → Microfono. Poi torna qui e premi Consenti.':error==='NotFoundError'?'Nessun microfono trovato. Collega o abilita un microfono e riprova.':'Quando compare la richiesta del telefono, scegli “Consenti” per il microfono. L’audio si attiva appena autorizzato.';
 m.classList.add('open');q('teamPermissionAllow').focus();return m;
}
function requestAudio(){if(!joined||!transport?.ready()){q('pfcFriendsBtn')?.click();return status('Crea una squadra o entra con un invito prima di attivare audio.');}if(active)return listen();permissionPage();return on();}
function beginVoice(p){
 // Keep only missed voice snippets in memory; never upload or persist audio.
 if(!p.remoteStream||!window.MediaRecorder){if(muted||p.blocked||document.hidden){playQueue.push({name:p.name,unavailable:true});syncBar();}return;}
 try{const r=new MediaRecorder(p.remoteStream),chunks=[],stamp=session,record={r,missed:muted||p.blocked||document.hidden||pressed};p.recording=record;
 r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};r.onstop=()=>{clearTimeout(record.timer);if(stamp!==session||!joined)return;if(record.missed||muted||p.blocked){if(chunks.length){const blob=new Blob(chunks,{type:r.mimeType});playQueue.push({name:p.name,url:URL.createObjectURL(blob)});}else playQueue.push({name:p.name,unavailable:true});while(playQueue.length>30){const old=playQueue.shift();if(old.url)URL.revokeObjectURL(old.url);}syncBar();}};
 r.start();record.timer=setTimeout(()=>finishVoice(p),60000);
 }catch{if(muted||p.blocked||document.hidden){playQueue.push({name:p.name,unavailable:true});syncBar();}}
}
function finishVoice(p){const r=p.recording;if(r){p.recording=null;clearTimeout(r.timer);r.missed ||= muted||p.blocked||document.hidden;try{if(r.r.state!=='inactive')r.r.stop();}catch{}}}
async function listen(){
 if(!active)return requestAudio();muted=false;for(const p of peers.values())if(p.audio){p.audio.muted=pressed;try{await p.audio.play();p.blocked=false;}catch{p.blocked=true;status('Ascolto bloccato: tocca nuovamente Ascolta.');}}syncBar();
 if(listenBusy)return;if(playQueue.length){const entry=playQueue[0];if(entry.unavailable){status('Voce non ascoltata di '+entry.name+': non è disponibile una registrazione. Chiedi di ripetere.');q('pfcFriendsBtn')?.click();q('teamMissed')?.scrollIntoView({block:'center'});return;}
 listenBusy=true;const stamp=session,a=new Audio(entry.url);playing=a;a.volume=volume;
 a.onended=()=>{if(stamp!==session)return;if(playQueue[0]===entry){playQueue.shift();URL.revokeObjectURL(entry.url);}listenBusy=false;playing=null;syncBar();if(playQueue.length)listen();else status('In ascolto');};
 a.onerror=()=>{listenBusy=false;playing=null;status('Messaggio non riprodotto. Riprova Ascolta.');};try{await a.play();status('Ascolti il messaggio di '+entry.name);}catch{listenBusy=false;playing=null;status('Tocca Ascolta per riprodurre il messaggio.');}return;}
 status(messages.some(m=>m.unread)?'In ascolto · tocca Squadra per leggere i messaggi.':'In ascolto');
}
function mountBar(){
 if(q('teamMapBar'))return;const wrap=document.querySelector('#page-map .mapWrap');if(!wrap)return;
 const css=document.createElement('style');css.textContent=`#teamMapBar{margin:8px 0 14px;padding:8px;background:#173f2b;border-radius:16px;color:white}#teamMapBar[hidden]{display:none!important}.teamMapControls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.teamMapControls button{position:relative;display:grid;place-items:center;gap:4px;min-height:66px;padding:8px 4px;border:0;border-radius:12px;background:#e7efe9;color:#173f2b;font-weight:800;font-size:14px}.teamMapControls svg{width:26px;height:26px;fill:currentColor}.teamMapControls #teamMapTalk{background:#2f7051;color:white;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}.teamMapControls #teamMapTalk.active,#teamPTT.active{background:#b2362d;color:white}#teamPTT{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}#teamMapStatus{margin:6px 4px 0;font-size:12px;line-height:1.4}#teamMapBadge{position:absolute;top:3px;right:5px;background:#c12c27;color:white;border-radius:16px;padding:2px 6px;font-size:12px}#teamMapBadge[hidden]{display:none}.teamUnread{animation:teamNotice 1s ease-in-out infinite}@keyframes teamNotice{50%{box-shadow:inset 0 0 0 3px #ff4d42;background:#ffd4cc}}@media(prefers-reduced-motion:reduce){.teamUnread{animation:none;box-shadow:inset 0 0 0 3px #ff4d42}}`;document.head.appendChild(css);
 const bar=document.createElement('section');bar.id='teamMapBar';bar.setAttribute('aria-label','Comandi della squadra vicino alla mappa');bar.innerHTML='<div class="teamMapControls"><button id="teamMapSquad" type="button"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="8" r="5"/><circle cx="5" cy="11" r="4"/><circle cx="27" cy="11" r="4"/><path d="M8 29V21a8 8 0 0 1 16 0v8zM0 27v-8a5 5 0 0 1 7-4v12zm25 0V15a5 5 0 0 1 7 4v8z"/></svg><span>Squadra</span><span id="teamMapBadge" hidden></span></button><button id="teamMapTalk" type="button" aria-label="Tieni premuto per parlare"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="2" width="10" height="18" rx="5"/><path d="M6 15h3a7 7 0 0 0 14 0h3a10 10 0 0 1-8.5 10v4H23v3H9v-3h5.5v-4A10 10 0 0 1 6 15z"/></svg><span>Parla</span></button><button id="teamMapListen" type="button"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 18v-3a14 14 0 0 1 28 0v3h-3v-3a11 11 0 0 0-22 0v3z"/><rect x="1" y="16" width="7" height="13" rx="3"/><rect x="24" y="16" width="7" height="13" rx="3"/></svg><span>Ascolta</span></button></div><p id="teamMapStatus" role="status">Attiva l’audio per comunicare con la squadra.</p>';
 wrap.insertAdjacentElement('afterend',bar);q('teamMapSquad').onclick=()=>q('pfcFriendsBtn')?.click();bindTalk(q('teamMapTalk'));q('teamMapListen').onclick=listen;syncBar();
}
window.addEventListener('pfc:friends',e=>{joined=!!e.detail?.joined;if(joined)mountBar();syncBar();});

window.addEventListener('pfc:team-ready',e=>{transport=e.detail;joined=true;mount();mountBar();draw();});
window.addEventListener('pfc:team-message',e=>receive(e.detail));
window.addEventListener('pfc:team-left',()=>{off(false);transport=null;joined=false;messages.length=0;for(const v of playQueue)if(v.url)URL.revokeObjectURL(v.url);playQueue=[];playing?.pause();playing=null;listenBusy=false;q('teamPermissionModal')?.classList.remove('open');draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTalking();for(const p of peers.values())if(p.recording)p.recording.missed=true;}});window.addEventListener('blur',stopTalking);window.addEventListener('pagehide',()=>off(false));
})();
