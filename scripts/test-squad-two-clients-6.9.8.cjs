const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto:crypto}=require('node:crypto');
const lib=new Function(fs.readFileSync('cacciatraccia/vendor/supabase-2.95.3.js','utf8')+';return supabase;')();
function participant(name,lat){
 const nodes=new Map(),events={},storage=new Map();let realtimeClient;
 class El{constructor(id){this.value='';this.hidden=false;this.textContent='';this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s),contains:s=>this.classes.has(s)};if(id)nodes.set(id,this);}set innerHTML(v){this.html=v;for(const m of v.matchAll(/id="([^"]+)"/g))new El(m[1]);}get innerHTML(){return this.html||'';}querySelectorAll(){return [];}appendChild(){}setAttribute(){}select(){}}
 const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),get length(){return storage.size},key:i=>[...storage.keys()][i]};
 const ctx={crypto,TextEncoder,TextDecoder,btoa,atob,URLSearchParams,location:{origin:'https://example.test',pathname:'/app/',hash:'',search:''},history:{replaceState(){}},sessionStorage:store,localStorage:store,navigator:{onLine:true},setInterval,clearInterval,setTimeout,clearTimeout,console};
 ctx.document={hidden:false,head:new El(),body:new El(),getElementById:id=>nodes.get(id),createElement:()=>new El(),addEventListener:(n,f)=>(events[n]??=[]).push(f)};ctx.window=ctx;ctx.addEventListener=(n,f)=>(events[n]??=[]).push(f);ctx.dispatchEvent=e=>{for(const f of events[e.type]||[])f(e);};ctx.Event=class{constructor(type){this.type=type;}};ctx.CustomEvent=class extends ctx.Event{constructor(type,opt){super(type);this.detail=opt.detail;}};
 ['pfc676Quick','page-backup'].forEach(id=>new El(id));
 const map={hasLayer:()=>true,setView(){},fitBounds(){}};ctx.__PFC_LIVE_API__={map:()=>map,getFix:async()=>({lat,lng:0,acc:1}),showMap(){}};
 ctx.L={layerGroup:()=>({addTo(){return this},removeLayer(){}}),latLngBounds:p=>p,marker:()=>({addTo(){return this},bindTooltip(){},setLatLng(){},setTooltipContent(){},setIcon(){}}),divIcon:()=>({})};
 ctx.supabase={createClient:(...a)=>(realtimeClient=lib.createClient(...a))};vm.createContext(ctx);vm.runInContext(fs.readFileSync('cacciatraccia/friends-6.9.8-reconnect.js','utf8'),ctx);nodes.get('pfcFriendsName').value=name;
 return {nodes,ctx,client:()=>realtimeClient};
}
const wait=async fn=>{for(let i=0;i<260;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Squad state timed out');};
const a=participant('Test Mario',0),b=participant('Test Amico',.001);const timeout=setTimeout(()=>{console.error('Squad integration timeout');process.exit(2)},65000);
(async()=>{
 await a.nodes.get('pfcFriendsCreate').onclick();b.nodes.get('pfcFriendsToken').value=a.nodes.get('pfcFriendsInvite').value;await b.nodes.get('pfcFriendsJoin').onclick();
 await wait(()=>[a,b].every(p=>p.nodes.get('teamMemberCount').textContent.includes('2 persone')));
 assert.equal(a.ctx.__PFC_FRIEND_POINTS__()[0].name,'Test Amico');assert.equal(b.ctx.__PFC_FRIEND_POINTS__()[0].name,'Test Mario');
 // Interrupt the creator's actual socket: reconnect must retain membership and recover.
 a.client().realtime.disconnect();await wait(()=>a.nodes.get('pfcFriendsStatus').textContent.includes('interrotta'));assert(a.nodes.get('teamMemberCount').textContent.includes('2 persone'));
 await wait(()=>a.nodes.get('pfcFriendsStatus').textContent.includes('Posizione condivisa')&&a.ctx.__PFC_FRIEND_POINTS__().length===1);
 assert(a.nodes.get('teamMemberCount').textContent.includes('2 persone'));assert.equal(a.ctx.document.body.classes.size,0);await b.nodes.get('pfcFriendsLeave').onclick();await wait(()=>a.nodes.get('teamMemberCount').textContent.includes('1 persona'));assert.equal(a.ctx.__PFC_FRIEND_POINTS__().length,0,'explicit group exit removes companion');
 console.log('PASS actual application Squadra: two independent clients join same encrypted invite, both display 2 members and companion GPS; forced actual socket interruption retains roster and reconnect restores GPS without opening setup. Synthetic identities/coordinates, no phone hardware.');
})().catch(e=>{console.error(e.message);for(const p of [a,b])console.error({status:p.nodes.get('pfcFriendsStatus').textContent,count:p.nodes.get('teamMemberCount').textContent,members:p.nodes.get('teamMembers').innerHTML,socket:p.client()?.realtime.connectionState(),channels:p.client()?.getChannels().map(c=>({state:c.state,presenceKeys:Object.keys(c.presenceState())}))});process.exitCode=1}).finally(async()=>{for(const p of [a,b])await p.nodes.get('pfcFriendsLeave').onclick();clearTimeout(timeout);});
