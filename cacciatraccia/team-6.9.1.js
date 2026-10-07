/* Squadra Live: encrypted signaling/text, WebRTC voice, explicit microphone opt-in. */
(()=>{'use strict';
const q=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let transport,stream,active=false,pressed=false,muted=false,volume=.8,heartbeat,session=0,starting=false;
const peers=new Map(),messages=[];
function status(s){if(q('teamVoiceStatus'))q('teamVoiceStatus').textContent=s;}
function draw(){if(!q('teamPeers'))return;q('teamPeers').innerHTML=[...peers.values()].map(p=>'<div><b>'+esc(p.name)+'</b> · '+(p.pc?.connectionState==='connected'?(p.talking?'🎙 Sta parlando':'● Audio collegato'):p.pc?.connectionState==='failed'?'Audio non raggiungibile su questa rete':'Collegamento audio…')+'</div>').join('')||'Nessun altro amico ha attivato l’audio.';q('teamMessages').innerHTML=messages.slice(-30).map(m=>'<p><b>'+esc(m.name)+':</b> '+esc(m.text)+'</p>').join('');}
function stopTalking(){pressed=false;stream?.getAudioTracks().forEach(t=>t.enabled=false);q('teamPTT')?.classList.remove('active');if(active)transport?.send({kind:'talk',talking:false}).catch(()=>{});}
function talk(){if(!active||!transport?.ready()||document.hidden)return status('Attiva l’audio nel gruppo prima di parlare.');if(![...peers.values()].some(p=>p.pc?.connectionState==='connected'))return status('Attendi che un amico attivi e colleghi l’audio.');pressed=true;stream.getAudioTracks().forEach(t=>t.enabled=true);q('teamPTT')?.classList.add('active');transport.send({kind:'talk',talking:true}).catch(()=>stopTalking());status('🎙 Stai parlando · rilascia per ascoltare');}
function remove(id){const p=peers.get(id);if(p){p.pc?.close();p.audio?.pause();p.audio?.remove();peers.delete(id);}draw();}
async function off(notify=true){session++;stopTalking();active=false;clearInterval(heartbeat);heartbeat=null;if(notify&&transport?.ready())await transport.send({kind:'bye'}).catch(()=>{});for(const id of [...peers.keys()])remove(id);stream?.getTracks().forEach(t=>t.stop());stream=null;q('teamAudio')&&(q('teamAudio').textContent='Attiva audio / microfono');status('Audio spento');}
function connection(id,name){
 if(peers.has(id))return peers.get(id);if(peers.size>=8)return null;
 const p={name,at:Date.now(),talking:false,candidates:[],pc:new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]})};peers.set(id,p);
 stream.getTracks().forEach(t=>p.pc.addTrack(t,stream));
 p.pc.onicecandidate=e=>{if(e.candidate&&active)transport.send({kind:'ice',to:id,candidate:e.candidate.toJSON()}).catch(()=>{});};
 p.pc.ontrack=e=>{const a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.muted=muted;a.volume=volume;a.srcObject=e.streams[0]||new MediaStream([e.track]);p.audio?.remove();p.audio=a;document.body.appendChild(a);a.play().catch(()=>status('Tocca “Riprendi ascolto” per sentire gli amici.'));};
 p.pc.onconnectionstatechange=()=>{if(p.pc.connectionState==='failed')status('Audio non raggiungibile su questa rete. Mappa e messaggi restano disponibili.');draw();};draw();return p;
}
async function receive(m){
 if(!transport||!m||m.id===transport.id()||typeof m.name!=='string'||m.name.length>30)return;
 if(m.kind==='text'&&typeof m.text==='string'&&m.text.length<=240){messages.push({name:m.name,text:m.text});draw();return;}
 if(!active)return;if(m.to&&m.to!==transport.id())return;
 try{
  if(m.kind==='bye'){remove(m.id);return;}
  if(m.kind==='hello'){
   const existed=peers.has(m.id),p=connection(m.id,m.name);if(!p)return;p.at=Date.now();
   if(!existed){await transport.send({kind:'hello',to:m.id});if(transport.id()<m.id){await p.pc.setLocalDescription(await p.pc.createOffer());await transport.send({kind:'offer',to:m.id,sdp:p.pc.localDescription.toJSON()});}}
   return;
  }
  const p=connection(m.id,m.name);if(!p)return;p.at=Date.now();
  if(m.kind==='talk'){p.talking=!!m.talking;draw();return;}
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
 try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(stamp!==session||!transport.ready()){s.getTracks().forEach(t=>t.stop());return;}stream=s;stream.getTracks().forEach(t=>t.enabled=false);active=true;q('teamAudio').textContent='Spegni audio / microfono';status('Microfono pronto · tieni premuto per parlare');await transport.send({kind:'hello'});heartbeat=setInterval(()=>{if(!transport.ready()){off(false);return;}transport.send({kind:'hello'}).catch(()=>{});for(const [id,p] of peers)if(Date.now()-p.at>35000)remove(id);},10000);}
 catch(e){await off(false);status(e.name==='NotAllowedError'?'Consenti il microfono nelle autorizzazioni del browser.':'Impossibile attivare audio. Riprova.');}finally{starting=false;}
}
function mount(){
 const host=q('pfcFriendsActive');if(!host||q('teamAudio'))return;
 q('pfcFriendsModal')?.setAttribute('aria-label','Squadra Live');q('pfcFriendsModal')?.querySelector('h2')&&(q('pfcFriendsModal').querySelector('h2').textContent='👥 Squadra Live');
 const box=document.createElement('section');box.innerHTML='<h3>🎙 Comunicazione della squadra</h3><p>Attiva l’audio su ogni telefono. Tieni premuto per parlare, rilascia per ascoltare. Usa un auricolare Bluetooth collegato al telefono. App aperta e Internet necessari.</p><button id="teamAudio" class="secondary">Attiva audio / microfono</button><p id="teamVoiceStatus" role="status">Audio spento</p><button id="teamPTT" class="primary wide" style="touch-action:none;user-select:none;min-height:68px">🎙 Tieni premuto per parlare</button><div class="pfcFriendsActions"><button id="teamMute" class="secondary">Silenzia ascolto</button><button id="teamListen" class="secondary">Riprendi ascolto</button></div><label>Volume ascolto<input id="teamVolume" type="range" min="0" max="1" step=".05" value=".8"></label><div id="teamPeers" aria-live="polite"></div><h3>Messaggi brevi</h3><label>Messaggio alla squadra<input id="teamText" maxlength="240" placeholder="Es. Vi aspetto alla macchina"></label><button id="teamSend" class="secondary">Invia messaggio</button><div id="teamMessages" aria-live="polite"></div><p class="note">Sul sito usa il pulsante sullo schermo. Il tasto Volume+ e i pulsanti PTT esterni richiedono l’integrazione Android e una verifica sul dispositivo.</p>';
 host.appendChild(box);q('teamAudio').onclick=on;
 const b=q('teamPTT');b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);talk();};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{if(pressed){stopTalking();status('In ascolto');}};b.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();talk();}};b.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();stopTalking();}};
 q('teamMute').onclick=()=>{muted=!muted;for(const p of peers.values())if(p.audio)p.audio.muted=muted;q('teamMute').textContent=muted?'Riattiva ascolto':'Silenzia ascolto';};
 q('teamVolume').oninput=e=>{volume=Number(e.target.value);for(const p of peers.values())if(p.audio)p.audio.volume=volume;};q('teamListen').onclick=()=>{for(const p of peers.values())p.audio?.play().catch(()=>status('Ascolto bloccato dal browser.'));};
 q('teamSend').onclick=async()=>{const text=q('teamText').value.trim();if(!text)return;if(!transport?.ready())return status('Entra nel gruppo per inviare messaggi.');try{await transport.send({kind:'text',text});messages.push({name:'Tu',text});q('teamText').value='';draw();}catch{status('Messaggio non inviato. Riprova.');}};
 const accessories=document.createElement('section');accessories.innerHTML='<h3>Accessori compatibili – Squadra Live</h3><p>Accessori facoltativi. La compatibilità del pulsante PTT con questa app Android va verificata prima dell’acquisto.</p><p><a href="https://www.pryme.com/index.php?l=product_detail&p=2532" target="_blank" rel="noopener noreferrer">PRYME BT-PTT-ZU Super Mini</a> · pulsante Bluetooth PTT</p><p><a href="https://ainaptt.com/shop-2/" target="_blank" rel="noopener noreferrer">AINA PTT Voice Responder</a> · PTT, microfono e altoparlante</p><h4>Possibile estensione futura</h4><p>Comunicazioni senza rete tramite radio esterne o collegamento diretto compatibile. La Squadra Live attuale richiede Internet.</p>';
 q('pfcFriendsModal').querySelector('.dialog').appendChild(accessories);draw();
}
window.addEventListener('pfc:team-ready',e=>{transport=e.detail;messages.length=0;mount();draw();});
window.addEventListener('pfc:team-message',e=>receive(e.detail));
window.addEventListener('pfc:team-left',()=>{off(false);transport=null;messages.length=0;draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)off();});window.addEventListener('blur',stopTalking);window.addEventListener('pagehide',()=>off(false));
})();
