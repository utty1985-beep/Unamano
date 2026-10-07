/* Squadra Live: encrypted signaling/text, WebRTC voice, explicit microphone opt-in. */
(()=>{'use strict';
const q=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let transport,stream,active=false,pressed=false,muted=false,volume=.8,heartbeat,session=0,starting=false,joined=false,unread=0,playing=null,playQueue=[],listenBusy=false;
const peers=new Map(),messages=[];let messageSeq=0,saveSerial=Promise.resolve();const historyReplies=new Map();
let holding=false,pressTimer=null,relayRecording=null,voiceSeq=0,memberCount=0;
const inboundVoice=new Map();
function startVoiceRelay(){
 if(!window.MediaRecorder)return;
 try{
  const t=transport,stamp=session,uid=t.id()+'-'+Date.now()+'-'+(++voiceSeq);
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(x=>MediaRecorder.isTypeSupported(x));
  const recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:16000});
  const rec={recorder,serial:Promise.resolve(),parts:0,bytes:0,failed:false};relayRecording=rec;
  const send=m=>{rec.serial=rec.serial.then(()=>{if(t!==transport||stamp!==session)throw Error('Uscita terminata');return t.send(m);}).catch(()=>{rec.failed=true;});};
  send({kind:'voice-start',uid,mime:recorder.mimeType});
  recorder.ondataavailable=e=>{if(!e.data.size)return;const part=rec.parts++;
   rec.serial=rec.serial.then(async()=>{const a=new Uint8Array(await e.data.arrayBuffer());rec.bytes+=a.length;if(rec.bytes>256000||part>63)throw Error('Voce troppo lunga');if(t!==transport||stamp!==session)return;
    let binary='';for(let offset=0;offset<a.length;offset+=8192)binary+=String.fromCharCode(...a.subarray(offset,offset+8192));const s=btoa(binary);for(let i=0;i<s.length;i+=12000)await t.send({kind:'voice-part',uid,part:part*100+Math.floor(i/12000),data:s.slice(i,i+12000)});
   }).catch(()=>{rec.failed=true;});
  };
  recorder.onstop=()=>{clearTimeout(rec.timer);rec.serial.then(async()=>{if(t!==transport||stamp!==session)return;if(rec.failed){status('Voce non inviata completamente · riprova.');await t.send({kind:'voice-cancel',uid}).catch(()=>{});}else await t.send({kind:'voice-end',uid,parts:rec.parts}).catch(()=>status('Voce non inviata · riprova.'));});};
  recorder.start(1000);rec.timer=setTimeout(()=>releaseTalk(),30000);
 }catch{status('Audio diretto attivo; invio vocale alternativo non disponibile.');}
}
function stopVoiceRelay(){const rec=relayRecording;relayRecording=null;if(rec){clearTimeout(rec.timer);try{if(rec.recorder.state!=='inactive')rec.recorder.stop();}catch{}}}
function receiveVoice(m){
 if(typeof m.uid!=='string'||m.uid.length>100)return;
 const k=m.id+':'+m.uid;
 for(const [id,v] of inboundVoice)if(Date.now()-v.at>45000){clearTimeout(v.timer);inboundVoice.delete(id);}
 if(m.kind==='voice-start'){
  if(inboundVoice.has(k)||inboundVoice.size>=8||typeof m.mime!=='string'||m.mime.length>100||!/^audio\/(webm|mp4|ogg)(;|$)/.test(m.mime))return;
  const p=peers.get(m.id),v={at:Date.now(),mime:m.mime,name:m.name,parts:new Map(),bytes:0,direct:!!(p?.remoteStream&&p.pc?.connectionState==='connected'&&!p.blocked)};
  v.timer=setTimeout(()=>inboundVoice.delete(k),45000);inboundVoice.set(k,v);return;
 }
 const v=inboundVoice.get(k);if(!v)return;
 if(m.kind==='voice-part'){
  if(!Number.isInteger(m.part)||m.part<0||m.part>6399||typeof m.data!=='string'||m.data.length>12000||!/^[A-Za-z0-9+/]*={0,2}$/.test(m.data)||v.parts.has(m.part))return;
  v.bytes+=m.data.length;if(v.bytes>350000){clearTimeout(v.timer);inboundVoice.delete(k);return;}v.parts.set(m.part,m.data);return;
 }
 if(m.kind==='voice-cancel'){clearTimeout(v.timer);inboundVoice.delete(k);return;}
 if(m.kind==='voice-end'){
  clearTimeout(v.timer);inboundVoice.delete(k);if(v.direct||!v.parts.size||!joined)return;
  if(!Number.isInteger(m.parts)||m.parts<1||m.parts>64)return;
  try{const arr=[...v.parts].sort((a,b)=>a[0]-b[0]),chunks=[];for(let i=0;i<arr.length;){const part=Math.floor(arr[i][0]/100);if(part!==chunks.length)throw Error('Parte mancante');let s='',seq=0;while(i<arr.length&&Math.floor(arr[i][0]/100)===part){if(arr[i][0]%100!==seq++)throw Error('Frammento mancante');s+=arr[i++][1];}chunks.push(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));}
   if(chunks.length!==m.parts)throw Error('Voce incompleta');playQueue=playQueue.filter(x=>!x.unavailable||x.name!==v.name);const blob=new Blob(chunks,{type:v.mime});playQueue.push({name:v.name,url:URL.createObjectURL(blob)});while(playQueue.length>30){const old=playQueue.shift();if(old.url)URL.revokeObjectURL(old.url);}syncBar();if(active&&!muted&&!pressed)listen();
  }catch{status('Voce incompleta · chiedi di ripetere.');}
 }
}
function releaseTalk(){holding=false;clearTimeout(pressTimer);if(pressed){stopTalking();listen();status('In ascolto');}}
function addMessage(m){if(m.uid&&messages.some(x=>x.uid===m.uid))return;messages.push(m);if(messages.length>200)messages.shift();messages.sort((a,b)=>(a.at||0)-(b.at||0));if(transport?.saveChat){const t=transport,items=messages.map(x=>({...x}));saveSerial=saveSerial.catch(()=>{}).then(()=>t===transport?t.saveChat(items):undefined);}}

function validChat(x){return x&&typeof x.id==='string'&&typeof x.uid==='string'&&x.uid.length<=100&&typeof x.name==='string'&&x.name.length<=30&&typeof x.text==='string'&&x.text.length<=1000&&Number.isFinite(x.at)&&x.at<=(Date.now()+30000)&&x.at>=Date.now()-8*3600000;}
function status(s){if(q('teamVoiceStatus'))q('teamVoiceStatus').textContent=s;if(q('teamMapStatus'))q('teamMapStatus').textContent=s;}
function draw(){syncBar();if(!q('teamPeers'))return;q('teamPeers').innerHTML=[...peers.values()].map(p=>'<div><b>'+esc(p.name)+'</b> · '+(p.pc?.connectionState==='connected'?(p.talking?'🎙 Sta parlando':'● Audio collegato'):p.pc?.connectionState==='failed'?'Audio non raggiungibile su questa rete':'Collegamento audio…')+'</div>').join('')||'Nessun altro amico ha attivato l’audio.';q('teamMessages').innerHTML=messages.slice(-200).map(m=>'<p class="teamChatBubble"><b>'+esc(m.mine?'Tu':m.name)+'</b> <small>'+esc(new Date(m.at||Date.now()).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}))+'</small><br>'+esc(m.text)+(m.unread?' <button type="button" data-team-read="'+messages.indexOf(m)+'">Letto</button>':'')+'</p>').join('');q('teamMessages').querySelectorAll('[data-team-read]').forEach(b=>b.onclick=()=>{messages[Number(b.dataset.teamRead)].unread=false;draw();});drawMissed();}
function stopTalking(){stopVoiceRelay();const wasPressed=pressed;pressed=false;for(const p of peers.values())if(p.audio)p.audio.muted=muted;stream?.getAudioTracks().forEach(t=>t.enabled=false);q('teamPTT')?.classList.remove('active');q('teamMapTalk')?.classList.remove('active');if(active&&wasPressed)transport?.send({kind:'talk',talking:false}).catch(()=>{});}
async function talk(){if(document.hidden||pressed)return;if(!active||!transport?.ready()){await requestAudio();if(holding&&active&&transport?.ready())talk();return;}if(memberCount<2&&!peers.size)return status('Attendi che un compagno entri nella squadra.');pressed=true;playing?.pause();for(const p of peers.values()){if(p.audio)p.audio.muted=true;if(p.recording)p.recording.missed=true;}stream.getAudioTracks().forEach(t=>t.enabled=true);startVoiceRelay();q('teamPTT')?.classList.add('active');q('teamMapTalk')?.classList.add('active');transport.send({kind:'talk',talking:true}).catch(()=>stopTalking());status('🎙 Stai parlando · rilascia per ascoltare');}
function remove(id){const p=peers.get(id);if(p){finishVoice(p);p.pc?.close();p.audio?.pause();if(p.audio)p.audio.srcObject=null;p.audio?.remove();peers.delete(id);}draw();}
async function off(notify=true){playing?.pause();playing=null;listenBusy=false;session++;stopTalking();active=false;window.__PFC_NATIVE_TEAM__?.setAudio(false);clearInterval(heartbeat);heartbeat=null;stream?.getTracks().forEach(t=>t.stop());stream=null;const bye=notify&&transport?.ready()?transport.send({kind:'bye'}).catch(()=>{}):null;for(const id of [...peers.keys()])remove(id);stream?.getTracks().forEach(t=>t.stop());stream=null;q('teamAudio')&&(q('teamAudio').textContent='Attiva audio / microfono');status('Audio spento');syncBar();if(bye)await bye;}
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
 if(m.to&&m.to!==transport.id())return;
 if(['voice-start','voice-part','voice-end','voice-cancel'].includes(m.kind)){receiveVoice(m);return;}
 if(m.kind==='history-request'){if(Date.now()-(historyReplies.get(m.id)||0)<5000)return;historyReplies.set(m.id,Date.now());const items=messages.map(x=>({id:x.id,name:x.name,text:x.text,at:x.at,uid:x.uid}));for(let i=0;i<items.length;i+=8)await transport.send({kind:'history',to:m.id,items:items.slice(i,i+8)}).catch(()=>{});return;}
 if(m.kind==='history'&&Array.isArray(m.items)&&m.items.length<=8){for(const x of m.items)if(validChat(x))addMessage({...x,mine:x.id===transport.id(),unread:false});draw();return;}
 if(m.kind==='text'&&typeof m.text==='string'&&m.text.length<=1000){addMessage({id:m.id,name:m.name,text:m.text,at:m.at||Date.now(),uid:m.uid,unread:true});draw();return;}
 if(!active){if(m.kind==='talk'&&m.talking){playQueue.push({name:m.name,unavailable:true});if(playQueue.length>30){const old=playQueue.shift();if(old.url)URL.revokeObjectURL(old.url);}syncBar();}return;}if(m.to&&m.to!==transport.id())return;
 try{
  if(m.kind==='bye'){remove(m.id);return;}
  if(m.kind==='hello'){
   const existed=peers.has(m.id),p=connection(m.id,m.name);if(!p)return;p.at=Date.now();
   if(!existed)await transport.send({kind:'hello',to:m.id});
   if(transport.id()<m.id&&!p.pc.localDescription&&!p.negotiating){p.negotiating=true;try{await p.pc.setLocalDescription(await p.pc.createOffer());await transport.send({kind:'offer',to:m.id,sdp:p.pc.localDescription.toJSON()});}finally{p.negotiating=false;}}
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
async function on(supplied){
 const discard=()=>supplied?.getTracks().forEach(t=>t.stop());
 if(starting){discard();return;}if(active){if(supplied){discard();return;}return off();}if(!transport?.ready()){discard();return status('Entra prima in una Squadra Live.');}if((!supplied&&!navigator.mediaDevices?.getUserMedia)||!window.RTCPeerConnection){discard();return permissionPage('Unsupported');}
 starting=true;const stamp=session;
 try{const s=supplied||await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(!s.getAudioTracks().some(t=>t.readyState==='live')){s.getTracks().forEach(t=>t.stop());throw new DOMException('Nessun microfono attivo','NotFoundError');}s.getVideoTracks().forEach(t=>t.stop());if(stamp!==session||!transport.ready()){s.getTracks().forEach(t=>t.stop());return;}stream=s;stream.getTracks().forEach(t=>t.enabled=false);active=true;window.__PFC_NATIVE_TEAM__?.setAudio(true);syncBar();q('teamAudio').textContent='Spegni audio / microfono';status('Microfono pronto · tieni premuto per parlare');returnToMap();await transport.send({kind:'hello'});heartbeat=setInterval(()=>{if(!transport.ready()){off(false);return;}transport.send({kind:'hello'}).catch(()=>{});for(const [id,p] of peers)if(Date.now()-p.at>35000)remove(id);},10000);}
 catch(e){if(stamp!==session||!joined)return;await off(false);status(e.name==='NotAllowedError'?'Microfono non autorizzato: apri le autorizzazioni e consenti l’accesso.':'Impossibile attivare audio. Riprova.');permissionPage(e.name);}finally{starting=false;}
}
function mount(){
 const host=q('pfcFriendsActive');if(!host||q('teamAudio'))return;
 q('pfcFriendsModal')?.setAttribute('aria-label','Squadra Live');q('pfcFriendsModal')?.querySelector('h2')&&(q('pfcFriendsModal').querySelector('h2').textContent='👥 Squadra Live');
 const box=document.createElement('section');box.innerHTML='<h3>🎙 Comunicazione della squadra</h3><p>Attiva l’audio su ogni telefono. Tieni premuto per parlare, rilascia per ascoltare. Usa un auricolare Bluetooth collegato al telefono. App aperta e Internet necessari.</p><button id="teamAudio" class="secondary">Attiva audio / microfono</button><p id="teamVoiceStatus" role="status">Audio spento</p><button id="teamPTT" class="primary wide" style="touch-action:none;user-select:none;min-height:68px">🎙 Tieni premuto per parlare</button><div class="pfcFriendsActions"><button id="teamMute" class="secondary">Silenzia ascolto</button><button id="teamListen" class="secondary">Riprendi ascolto</button></div><label>Volume ascolto<input id="teamVolume" type="range" min="0" max="1" step=".05" value=".8"></label><div id="teamPeers" aria-live="polite"></div><h3>💬 Chat del gruppo</h3><p class="note">Ultimi 200 messaggi dell’uscita con nome e orario, conservati cifrati su questo telefono fino alla scadenza dell’invito (8 ore). Chi entra recupera la cronologia dai membri collegati. L’audio è facoltativo e si spegne quando passi a un’altra app.</p><label>Messaggio alla squadra<input id="teamText" maxlength="1000" placeholder="Es. Vi aspetto alla macchina"></label><button id="teamSend" class="secondary">Invia messaggio</button><div id="teamMessages" aria-live="polite"></div><div id="teamMissed" aria-live="polite"></div><p class="note">Se il collegamento diretto non riesce, la voce arriva al rilascio del microfono tramite il canale cifrato della squadra. Le voci ricevute mentre l’ascolto è silenziato vengono conservate temporaneamente su questo telefono per riascoltarle. Si cancellano dopo l’ascolto o quando esci dalla squadra.</p><p class="note">Sul sito usa il pulsante sullo schermo. Il tasto Volume+ e i pulsanti PTT esterni richiedono l’integrazione Android e una verifica sul dispositivo.</p>';
 host.appendChild(box);q('teamAudio').onclick=()=>active?off():requestAudio();
 bindTalk(q('teamPTT'));
 q('teamMute').onclick=()=>{muted=!muted;for(const p of peers.values()){if(p.audio)p.audio.muted=muted;if(muted&&p.recording)p.recording.missed=true;}syncBar();};
 q('teamVolume').oninput=e=>{volume=Number(e.target.value);for(const p of peers.values())if(p.audio)p.audio.volume=volume;};q('teamListen').onclick=listen;
 q('teamSend').onclick=async()=>{const text=q('teamText').value.trim();if(!text)return;if(text.length>1000)return status('Massimo 1000 caratteri.');if(!transport?.ready())return status('Entra nel gruppo per inviare messaggi.');try{const at=Date.now(),uid=transport.id()+'-'+at+'-'+(++messageSeq);await transport.send({kind:'text',text,uid});addMessage({id:transport.id(),name:transport.name?.()||'Tu',text,at,uid,mine:true});q('teamText').value='';draw();}catch{status('Messaggio non inviato. Riprova.');}};
 q('teamText').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();q('teamSend').click();}};
 const chatCss=document.createElement('style');chatCss.textContent='#teamMessages{max-height:45vh;overflow:auto;padding:8px;background:#edf4ee;border-radius:14px}.teamChatBubble{background:white;padding:10px;border-radius:12px;overflow-wrap:anywhere;white-space:pre-wrap}.teamChatBubble small{color:#657266}#teamMembers{padding:10px;background:#edf4ee;border-radius:12px}';document.head.appendChild(chatCss);
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
 if(q('teamMapLocate'))q('teamMapLocate').textContent='👥 '+memberCount+' '+(memberCount===1?'membro':'membri')+' · Vedi tutti';
 if(q('teamMute'))q('teamMute').textContent=muted?'Riattiva ascolto':'Silenzia ascolto';
}
function bindTalk(b){
 b.dataset.ctNoLongHelp='1';
 b.oncontextmenu=e=>e.preventDefault();b.ondragstart=e=>e.preventDefault();
 b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();holding=true;b.setPointerCapture?.(e.pointerId);talk();};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=releaseTalk;
 b.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();holding=true;talk();}};
 b.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();releaseTalk();}};
}
function closePermission(){q('teamPermissionModal')?.classList.remove('open');if(starting&&!active)session++;}
function returnToMap(){
 q('teamPermissionModal')?.classList.remove('open');q('pfcFriendsModal')?.classList.remove('open');
 if(starting&&!active)session++;
 window.__PFC_LIVE_API__?.showMap?.();document.querySelector('#page-map .mapWrap')?.scrollIntoView({block:'nearest'});
}
function hasNativePermission(){return !!window.HTMLUserMediaElement&&typeof document.createElement('usermedia').setConstraints==='function';}
function permissionPage(error){
 let m=q('teamPermissionModal');if(!m){
 m=document.createElement('div');m.id='teamPermissionModal';m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Attiva microfono');
 m.innerHTML='<div class="dialog"><div class="sectionHead"><h2>🎙 Attiva microfono</h2><button id="teamPermissionClose" class="iconBtn" aria-label="Chiudi autorizzazioni">✕</button></div><p id="teamPermissionHelp" role="status"></p><usermedia id="teamNativePermission" hidden></usermedia><button id="teamPermissionAllow" class="primary wide">Riprova microfono</button><div id="teamPermissionSteps" hidden><ol><li>Apri Chrome e tocca l’icona accanto all’indirizzo.</li><li>Apri <b>Autorizzazioni → Microfono → Consenti</b>.</li><li>Torna qui e premi <b>Riprova microfono</b>.</li></ol><details><summary>Uso l’app installata / non compare la richiesta</summary><p>Apri le Impostazioni del telefono: <b>App → Chrome (o il browser usato) → Autorizzazioni → Microfono</b>. Consenti l’accesso durante l’uso. Controlla anche che il microfono non sia disattivato nei comandi rapidi di Android.</p></details></div><p class="note">Parli solo mentre tieni premuto “Parla”.</p><button id="teamPermissionBack" class="secondary">Torna alla mappa</button></div>';
 document.body.appendChild(m);q('teamPermissionAllow').onclick=()=>on();q('teamPermissionClose').onclick=closePermission;q('teamPermissionBack').onclick=returnToMap;
 const native=q('teamNativePermission');if(hasNativePermission()){
 native.hidden=false;native.setConstraints({audio:{echoCancellation:true,noiseSuppression:true},video:false});
 native.style.cssText='display:block;margin:12px 0;font-size:16px;color:#173f2b;background-color:#ffffff;opacity:1;';
 native.addEventListener('stream',()=>{const s=native.stream;if(!s)return;if(!joined||!m.classList.contains('open')||active){s.getTracks().forEach(t=>t.stop());return;}on(s);});
 native.addEventListener('error',()=>permissionPage(native.error?.name||'NotAllowedError'));
 native.addEventListener('cancel',()=>{q('teamPermissionHelp').textContent='Richiesta annullata. Tocca il controllo microfono quando vuoi riprovare.';});
 }
 const css=document.createElement('style');css.textContent='#teamPermissionModal [hidden]{display:none!important}#teamPermissionModal ol{padding-left:24px;line-height:1.5}#teamPermissionModal li{margin:10px 0}';document.head.appendChild(css);
 }
 const modern=hasNativePermission(),blocked=error==='NotAllowedError',unsupported=error==='Unsupported';
 q('teamNativePermission').hidden=!modern||unsupported||!blocked;q('teamPermissionAllow').hidden=unsupported;
 q('teamPermissionSteps').hidden=!blocked;
 q('teamPermissionHelp').textContent=unsupported?'Questo browser non permette di usare il microfono. Apri l’app in Chrome e riprova.':blocked?(modern?'Tocca il controllo microfono qui sotto per riaprire la richiesta di autorizzazione. Se resta bloccato, segui i passaggi.':'Il microfono è bloccato. Consenti l’accesso nelle autorizzazioni del browser, poi torna qui e riprova.'):error==='NotFoundError'?'Nessun microfono disponibile. Controlla il microfono del telefono o l’auricolare, poi riprova.':error==='NotReadableError'||error==='AbortError'?'Il microfono non è disponibile. Chiudi le altre app che lo stanno usando e riprova.':error?'Non riesco ad attivare il microfono. Controlla il dispositivo e riprova.':'Premi Riprova microfono. Dopo Consenti, l’audio si attiva e torni alla mappa.';
 m.classList.add('open');if(!unsupported)q('teamPermissionAllow').focus();return m;
}
function requestAudio(){
 if(!joined){q('pfcFriendsBtn')?.click();return status('Crea una squadra o entra con un invito prima di attivare audio.');}
 if(!transport?.ready()){window.__PFC_RECONNECT_TEAM__?.();return status('Collegamento squadra interrotto · riconnessione. Rimani sulla mappa.');}
 if(active)return listen();if(starting)return;
 if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia)return permissionPage('Unsupported');
 status('Attendo l’autorizzazione del microfono…');return on();
}

function beginVoice(p){
 // Keep only missed voice snippets in memory; never upload or persist audio.
 if(!p.remoteStream||!window.MediaRecorder){if(muted||p.blocked||(document.hidden&&!window.__PFC_NATIVE_TEAM__?.active)){playQueue.push({name:p.name,unavailable:true});syncBar();}return;}
 try{const r=new MediaRecorder(p.remoteStream),chunks=[],stamp=session,record={r,missed:muted||p.blocked||(document.hidden&&!window.__PFC_NATIVE_TEAM__?.active)||pressed};p.recording=record;
 r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};r.onstop=()=>{clearTimeout(record.timer);if(stamp!==session||!joined)return;if(record.missed||muted||p.blocked){if(chunks.length){const blob=new Blob(chunks,{type:r.mimeType});playQueue.push({name:p.name,url:URL.createObjectURL(blob)});}else playQueue.push({name:p.name,unavailable:true});while(playQueue.length>30){const old=playQueue.shift();if(old.url)URL.revokeObjectURL(old.url);}syncBar();}};
 r.start();record.timer=setTimeout(()=>finishVoice(p),60000);
 }catch{if(muted||p.blocked||(document.hidden&&!window.__PFC_NATIVE_TEAM__?.active)){playQueue.push({name:p.name,unavailable:true});syncBar();}}
}
function finishVoice(p){const r=p.recording;if(r){p.recording=null;clearTimeout(r.timer);r.missed ||= muted||p.blocked||(document.hidden&&!window.__PFC_NATIVE_TEAM__?.active);try{if(r.r.state!=='inactive')r.r.stop();}catch{}}}
async function listen(){
 if(!active)return requestAudio();muted=false;for(const p of peers.values())if(p.audio){p.audio.muted=pressed;try{await p.audio.play();p.blocked=false;}catch{p.blocked=true;status('Ascolto bloccato: tocca nuovamente Ascolta.');}}syncBar();
 if(pressed||listenBusy)return;if(playQueue.length){const entry=playQueue[0];if(entry.unavailable){status('Voce non ascoltata di '+entry.name+': chiedi di ripetere.');return;}
 listenBusy=true;const stamp=session,a=new Audio(entry.url);playing=a;a.volume=volume;
 a.onended=()=>{if(stamp!==session)return;if(playQueue[0]===entry){playQueue.shift();URL.revokeObjectURL(entry.url);}listenBusy=false;playing=null;syncBar();if(playQueue.length)listen();else status('In ascolto');};
 a.onerror=()=>{listenBusy=false;playing=null;status('Messaggio non riprodotto. Riprova Ascolta.');};try{await a.play();status('Ascolti il messaggio di '+entry.name);}catch{listenBusy=false;playing=null;status('Tocca Ascolta per riprodurre il messaggio.');}return;}
 status(messages.some(m=>m.unread)?'In ascolto · tocca Squadra per leggere i messaggi.':'In ascolto');
}
function mountBar(){
 if(q('teamMapBar'))return;const wrap=document.querySelector('#page-map .mapWrap');if(!wrap)return;
 const css=document.createElement('style');css.textContent=`#teamMapBar{margin:8px 0 14px;padding:8px;background:#173f2b;border-radius:16px;color:white}#teamMapBar[hidden]{display:none!important}.teamMapControls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.teamMapControls button{position:relative;display:grid;place-items:center;gap:4px;min-height:66px;padding:8px 4px;border:0;border-radius:12px;background:#e7efe9;color:#173f2b;font-weight:800;font-size:14px}.teamMapControls svg{width:26px;height:26px;fill:currentColor}.teamMapControls #teamMapTalk{background:#2f7051;color:white;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}.teamMapControls #teamMapTalk.active,#teamPTT.active{background:#b2362d;color:white}#teamPTT{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}#teamMapTalk svg{width:30px;height:30px}#teamMapTalk{border-radius:50%!important;width:76px;height:76px;justify-self:center}#teamMapPositions{font-size:13px;margin:8px 4px}#teamMapLocate{width:100%;margin-top:8px}#teamMapStatus{margin:6px 4px 0;font-size:12px;line-height:1.4}#teamMapBadge{position:absolute;top:3px;right:5px;background:#c12c27;color:white;border-radius:16px;padding:2px 6px;font-size:12px}#teamMapBadge[hidden]{display:none}.teamUnread{animation:teamNotice 1s ease-in-out infinite}@keyframes teamNotice{50%{box-shadow:inset 0 0 0 3px #ff4d42;background:#ffd4cc}}@media(prefers-reduced-motion:reduce){.teamUnread{animation:none;box-shadow:inset 0 0 0 3px #ff4d42}}`;document.head.appendChild(css);
 const bar=document.createElement('section');bar.id='teamMapBar';bar.setAttribute('aria-label','Comandi della squadra vicino alla mappa');bar.innerHTML='<div class="teamMapControls"><button id="teamMapSquad" type="button"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="8" r="5"/><circle cx="5" cy="11" r="4"/><circle cx="27" cy="11" r="4"/><path d="M8 29V21a8 8 0 0 1 16 0v8zM0 27v-8a5 5 0 0 1 7-4v12zm25 0V15a5 5 0 0 1 7 4v8z"/></svg><span>Squadra</span><span id="teamMapBadge" hidden></span></button><button id="teamMapTalk" type="button" aria-label="Tieni premuto per parlare"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="2" width="10" height="18" rx="5"/><path d="M6 15h3a7 7 0 0 0 14 0h3a10 10 0 0 1-8.5 10v4H23v3H9v-3h5.5v-4A10 10 0 0 1 6 15z"/></svg><span>Premi e parla</span></button><button id="teamMapListen" type="button"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 18v-3a14 14 0 0 1 28 0v3h-3v-3a11 11 0 0 0-22 0v3z"/><rect x="1" y="16" width="7" height="13" rx="3"/><rect x="24" y="16" width="7" height="13" rx="3"/></svg><span>Ascolta</span></button></div><p id="teamMapStatus" role="status">Attiva l’audio per comunicare con la squadra.</p>';
 wrap.insertAdjacentElement('afterend',bar);q('teamMapSquad').onclick=()=>q('pfcFriendsBtn')?.click();bindTalk(q('teamMapTalk'));q('teamMapListen').onclick=listen;const locate=document.createElement('button');locate.id='teamMapLocate';locate.type='button';locate.className='secondary';locate.textContent='👥 Vedi tutti sulla mappa';locate.onclick=()=>window.__PFC_SHOW_TEAM_MAP__?.();bar.appendChild(locate);const positions=document.createElement('p');positions.id='teamMapPositions';positions.setAttribute('aria-live','polite');bar.appendChild(positions);syncBar();
}
window.addEventListener('pfc:friends',e=>{joined=!!e.detail?.joined;memberCount=e.detail?.count||0;if(joined)mountBar();if(joined&&e.detail?.connected===false){stopTalking();status(e.detail.caption||'Collegamento squadra interrotto · riconnessione');}syncBar();});

window.addEventListener('pfc:team-ready',async e=>{transport=e.detail;joined=true;mount();mountBar();draw();const t=transport;const history=await t.loadChat?.()||[];if(t!==transport)return;if(Array.isArray(history))for(const x of history.slice(-200))if(validChat(x))addMessage({...x,unread:false});draw();await t.send({kind:'history-request'}).catch(()=>{});});
window.addEventListener('pfc:team-message',e=>receive(e.detail));
window.addEventListener('pfc:team-left',()=>{releaseTalk();off(false);transport=null;joined=false;messages.length=0;historyReplies.clear();for(const v of inboundVoice.values())clearTimeout(v.timer);inboundVoice.clear();for(const v of playQueue)if(v.url)URL.revokeObjectURL(v.url);playQueue=[];playing?.pause();playing=null;listenBusy=false;q('teamPermissionModal')?.classList.remove('open');draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseTalk();if(!window.__PFC_NATIVE_TEAM__?.active){off();status('Audio sospeso · premi Ascolta per riattivarlo quando torni.');}}});window.addEventListener('blur',()=>{releaseTalk();});window.addEventListener('pagehide',()=>{releaseTalk();if(!window.__PFC_NATIVE_TEAM__?.active)off(false);});
window.addEventListener('pfc:native-tick',()=>{if(active&&transport?.ready())transport.send({kind:'hello'}).catch(()=>{});});
window.addEventListener('pfc:native-state',()=>{if(document.hidden&&!window.__PFC_NATIVE_TEAM__?.active)off(false);});
})();
