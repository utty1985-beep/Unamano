const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map(),events={},connections=[],sent=[],audios=[];
class Element{
 constructor(id=''){this.id=id;this.hidden=false;this.textContent='';this.dataset={};this.attrs={};this.classes=new Set();this.classList={add:(...s)=>s.forEach(x=>this.classes.add(x)),remove:(...s)=>s.forEach(x=>this.classes.delete(x)),contains:s=>this.classes.has(s),toggle:(s,v)=>{if(v??!this.classes.has(s))this.classes.add(s);else this.classes.delete(s);}};if(id)elements.set(id,this);}
 set id(v){this._id=v;if(v)elements.set(v,this);}
 get id(){return this._id;}
 set innerHTML(s){this.selectorCache={};this.html=s;for(const m of s.matchAll(/id="([^"]+)"/g))new Element(m[1]);}
 get innerHTML(){return this.html||'';}
 querySelector(s){return this.dialog||(this.dialog=new Element());}
 querySelectorAll(s){if(this.selectorCache?.[s])return this.selectorCache[s];const a=s.match(/\[([^\]]+)\]/)?.[1];if(!a)return [];const list=[...this.innerHTML.matchAll(new RegExp(a+'="([^\"]+)"','g'))].map(m=>{const b=new Element();const key=a.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());b.dataset[key]=m[1];return b;});(this.selectorCache??={})[s]=list;return list;}
 appendChild(e){e.parentElement=this;return e;}setAttribute(k,v){this.attrs[k]=v;}focus(){}scrollIntoView(){}remove(){}setPointerCapture(){}click(){return this.onclick?.();}insertAdjacentElement(_,e){this.nextElementSibling=e;}
}
const doc={hidden:false,head:new Element(),body:new Element(),createElement:tag=>tag==='audio'?new Audio():new Element(),getElementById:id=>elements.get(id),querySelector:()=>elements.get('wrap'),addEventListener:(n,f)=>(events[n]??=[]).push(f)};
for(const id of ['pfcFriendsActive','pfcFriendsModal','pfcFriendsBtn','wrap'])new Element(id);
elements.get('pfcFriendsBtn').onclick=()=>elements.get('pfcFriendsModal').classList.add('open');
class Audio extends Element{constructor(url){super();audios.push(this);this.url=url;this.paused=true;}play(){this.paused=false;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}}
const track={readyState:'live',enabled:false,stopped:false,stop(){this.stopped=true;}};const stream={getTracks:()=>[track],getAudioTracks:()=>[track],getVideoTracks:()=>[]};
class Peer{constructor(){this.connectionState='connected';connections.push(this);}addTrack(){}close(){}createOffer(){return Promise.resolve({type:'offer',sdp:'fake'});}setLocalDescription(x){this.localDescription={toJSON:()=>x};return Promise.resolve();}}
class Recorder{constructor(){this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['voice'])});this.onstop();}}
let gum=async()=>stream;const mediaDevices={getUserMedia:(...a)=>gum(...a)};
const ctx={document:doc,navigator:{mediaDevices},RTCPeerConnection:Peer,MediaRecorder:Recorder,MediaStream:class{},Audio,Blob,URL:{createObjectURL:()=> 'blob:voice',revokeObjectURL(){}},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},console};ctx.window=ctx;ctx.addEventListener=(n,f)=>(events[n]??=[]).push(f);
vm.createContext(ctx);vm.runInContext(fs.readFileSync('cacciatraccia/team-6.9.7.js','utf8'),ctx);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const dispatch=async(n,detail)=>{for(const f of events[n]||[])f({detail});await flush();};
const q=id=>elements.get(id);const saved=[];const transport={id:()=> 'zMario',name:()=> 'Mario',expires:()=>Date.now()+8*3600000-120000,loadChat:async()=>[],saveChat:async xs=>saved.push(xs),ready:()=>true,send:async m=>{sent.push(m);}};
(async()=>{
 await dispatch('pfc:team-ready',transport);assert.equal(q('wrap').nextElementSibling.id,'teamMapBar');assert.equal(q('teamMapBar').hidden,false);
 let prevented=false;q('teamMapTalk').oncontextmenu({preventDefault(){prevented=true;}});assert(prevented);
 gum=async()=>{const e=Error('Denied');e.name='NotAllowedError';throw e;};await q('teamAudio').click();await flush();assert(q('teamPermissionHelp').textContent.includes('bloccato'));assert(q('teamPermissionModal').classList.contains('open'));assert.equal(track.enabled,false);
 gum=async()=>stream;await q('teamPermissionAllow').click();await flush();assert.equal(q('teamPermissionModal').classList.contains('open'),false);assert.equal(q('teamAudio').textContent,'Spegni audio / microfono');assert.equal(track.enabled,false);
 await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'hello'});assert.equal(connections.length,1);connections[0].ontrack({streams:[stream]});await flush();
 q('teamMapTalk').onpointerdown({button:0,pointerId:1,preventDefault(){}});assert.equal(track.enabled,true);assert(q('teamMapTalk').classList.contains('active'));q('teamMapTalk').onpointercancel();assert.equal(track.enabled,false);assert(!q('teamMapTalk').classList.contains('active'));
 await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'text',text:'Alla macchina'});assert.equal(q('teamMapBadge').textContent,1);assert(q('teamMapSquad').classList.contains('teamUnread'));
 await dispatch('pfc:team-ready',transport);assert.equal(q('teamMapBadge').textContent,1);q('teamMapSquad').click();assert.equal(q('teamMapBadge').textContent,1);q('teamMessages').querySelectorAll('[data-team-read]')[0].onclick();assert.equal(q('teamMapBadge').hidden,true);
 q('teamMute').click();await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'talk',talking:true});await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'talk',talking:false});assert(q('teamMissed').innerHTML.includes('Messaggio vocale da ascoltare'));
 await q('teamMapListen').click();await flush();assert.equal(q('teamMapStatus').textContent,'Ascolti il messaggio di Luca');assert.equal(q('teamMapBadge').textContent,1);audios.at(-1).onended();await flush();assert.equal(q('teamMapBadge').hidden,true);
 await dispatch('pfc:team-left');assert.equal(q('teamMapBar').hidden,true);assert.equal(q('teamMapBadge').hidden,true);assert.equal(track.enabled,false);assert(track.stopped);
 // Text chat works with audio stopped and synchronizes history without duplicates.
 await dispatch('pfc:team-ready',transport);q('teamText').value='Sono al parcheggio';await q('teamSend').click();await flush();assert(q('teamMessages').innerHTML.includes('Sono al parcheggio'));assert(saved.at(-1).some(m=>m.text==='Sono al parcheggio'));
 const msg={id:'Luca',name:'Luca',text:'Arrivo',at:Date.now(),uid:'msg-1'};await dispatch('pfc:team-message',{...msg,kind:'text'});await dispatch('pfc:team-message',{...msg,kind:'text'});assert.equal((q('teamMessages').innerHTML.match(/Arrivo/g)||[]).length,1);
 await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'history',to:'zMario',items:[{...msg,uid:'older',text:'Prima della tua entrata',at:Date.now()-60000}]});assert(q('teamMessages').innerHTML.includes('Prima della tua entrata'));
 await dispatch('pfc:team-message',{id:'Luca',name:'Luca',kind:'history-request'});assert(sent.some(m=>m.kind==='history'&&m.to==='Luca'));
 track.stopped=false;await q('teamAudio').click();await flush();doc.hidden=true;await dispatch('visibilitychange');assert(track.stopped);assert.equal(track.enabled,false);assert.equal(q('teamAudio').textContent,'Attiva audio / microfono');doc.hidden=false;
 track.stopped=false;await q('teamAudio').click();await flush();await dispatch('blur');assert(track.stopped);assert.equal(track.enabled,false);
 await dispatch('pfc:team-left');
 // A permission result arriving after exit must stop its tracks and leave the bar hidden.
 await dispatch('pfc:team-ready',transport);let resolve;gum=()=>new Promise(r=>resolve=r);q('teamAudio').click();await flush();await dispatch('pfc:team-left');const late={stopped:false,enabled:false,stop(){this.stopped=true;}};late.readyState='live';resolve({getTracks:()=>[late],getAudioTracks:()=>[late],getVideoTracks:()=>[]});await flush();assert(late.stopped);assert.equal(q('teamMapBar').hidden,true);
 console.log('PASS runtime 6.9.7: text history/deduplication, immediate microphone stop on blur/hidden, map-adjacent controls, contextmenu suppression, denied/granted and cancelled microphone request, muted microphone until hold, pointer cancellation, reconnect-safe unread badge, missed voice queue/playback, exit cleanup. DOM/media mocks; no real-device verification.');
})().catch(e=>{console.error(e);process.exit(1)});

