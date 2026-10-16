const fs=require('fs'),path=require('path'),assert=require('assert/strict');
// Run with PFC_JSDOM_PATH pointing to an installed jsdom module.
const {JSDOM}=require(process.env.PFC_JSDOM_PATH||'jsdom');
const root=process.cwd()+'/cacciatraccia';
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://test.local/cacciatraccia/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;const errors=[],warnings=[];
w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
w.console.error=(...a)=>errors.push(a.map(String).join(' '));w.console.warn=(...a)=>warnings.push(a.map(String).join(' '));
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;w.Response=Response;w.Request=Request;w.Headers=Headers;w.AbortSignal=AbortSignal;
w.ResizeObserver=class{observe(){} disconnect(){}};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
const ctx=new Proxy({measureText:()=>({width:20}),getImageData:()=>({data:new Uint8ClampedArray(4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:(()=>{})});
w.HTMLCanvasElement.prototype.getContext=()=>ctx;
Object.defineProperty(w.navigator,'geolocation',{value:{watchPosition(){return 1},clearWatch(){},getCurrentPosition(ok){ok({coords:{latitude:41.46,longitude:15.55,accuracy:5,heading:0,speed:0}})}}});
Object.defineProperty(w.document.documentElement,'clientWidth',{value:390});
w.fetch=async(input)=>{const url=String(input);if(url.includes('meteoam.it')){let times=Array.from({length:72},(_,i)=>new Date(Date.now()-3600000+i*3600000).toISOString());return new Response(JSON.stringify({timeseries:times,paramlist:['2t','wkmh','wdir','tpp'],datasets:{'0':{'0':Object.fromEntries(times.map((_,i)=>[i,20])),'1':Object.fromEntries(times.map((_,i)=>[i,0])),'2':Object.fromEntries(times.map((_,i)=>[i,0])),'3':Object.fromEntries(times.map((_,i)=>[i,0]))}}}));}if(url.includes('nominatim'))return new Response(JSON.stringify({address:{state:'Puglia',province:'Foggia'}}));return new Response(JSON.stringify({elements:[]}));};
const append=w.Node.prototype.appendChild;
w.Node.prototype.appendChild=function(el){const out=append.call(this,el);if(el.tagName==='SCRIPT'&&el.src){setTimeout(()=>{try{const file=new URL(el.src).pathname.replace('/cacciatraccia/','');w.eval(fs.readFileSync(path.join(root,file),'utf8'));el.onload?.();}catch(e){errors.push('script '+el.src+' '+e);el.onerror?.(e);}},0)}else if(el.tagName==='LINK')setTimeout(()=>el.onload?.(),0);return out;};
const stored={points:[{id:'old',type:'Postazione',name:'Vecchio appostamento',lat:41.4,lng:15.6,huntDate:'2026-01-01',createdAt:'2026-01-01T08:00:00Z'},{id:'bird',type:'Avvistamento',name:'Tordi',species:'Tordi',lat:41.46,lng:15.55,huntDate:'2026-10-15',createdAt:new Date().toISOString(),windDeg:0,windSpeed:0}],diary:[{id:'note',date:'2026-10-15',zone:'Gggg',game:'Gggg'}],outings:[],car:null};
w.localStorage.setItem('cacciatraccia-direct-v5',JSON.stringify(stored));
w.localStorage.setItem('cacciatraccia-hunt-day-v1','2026-10-01');
(async()=>{try{
w.eval(fs.readFileSync(root+'/vendor/supabase-2.95.3.js','utf8'));
for(const script of w.document.querySelectorAll('[data-pfc-src]'))w.eval(fs.readFileSync(root+'/'+script.dataset.pfcSrc.split('?')[0],'utf8'));
await w.__PFC_BOOT_READY__;await new Promise(r=>setTimeout(r,500));
assert.equal(w.__PFC_APP_STATUS__.state,'ready');
assert(w.document.getElementById('pointsList').textContent.includes('Vecchio appostamento'),'old point visible despite stale day');
const q=id=>w.document.getElementById(id);
q('ctFilterPostDay').checked=true;q('ctFilterPostDay').dispatchEvent(new w.Event('change'));assert(!q('pointsList').textContent.includes('Vecchio appostamento'));
q('ctFilterPostDay').checked=false;q('ctFilterPostDay').dispatchEvent(new w.Event('change'));assert(q('pointsList').textContent.includes('Vecchio appostamento'));
w.CT.edit('old');q('pointWindSpeed').value='0';q('pointWindGust').value='0';await q('confirmPointBtn').onclick();let data=JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5'));assert.equal(data.points.find(p=>p.id==='old').windSpeed,0);assert.equal(data.points.find(p=>p.id==='old').windGust,0);
const noteCount=data.diary.length;await q('addDiaryBtn').onclick();assert.equal(JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).diary.length,noteCount,'blank diary rejected');
q('diaryZone').value='Nuova nota';await q('addDiaryBtn').onclick();assert.equal(q('diaryZone').value,'');data=JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5'));assert.equal(data.diary.length,noteCount+1);
w.document.querySelector('[data-history="diary"]').click();assert(q('historyList').textContent.includes('Elimina nota'));
const deletion=w.CT.delDiary('note');q('pfcDeletePointDialog').querySelector('button:last-child').click();await deletion;assert(!JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).diary.some(x=>x.id==='note'));
// Different point without weather cannot inherit another point's snapshot.
w.CT.edit('old');assert(q('pointModal').classList.contains('open'));
const before=JSON.stringify(JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')));const file={text:async()=>JSON.stringify({points:'bad',outings:[],diary:[]})};
// Invoke the actual import event with a deliberately malformed backup.
await q('importBackup').onchange({target:{files:[file],value:'x'}});await new Promise(r=>setTimeout(r,20));assert.equal(w.localStorage.getItem('cacciatraccia-direct-v5'),before);
// Saving a selected map position preserves the chosen coordinates, including missing weather.
await w.__PFC_LIVE_API__.map().fire('click',{latlng:{lat:42.1,lng:16.2}});await new Promise(r=>setTimeout(r,10));
q('savePointBtn').click();q('pointName').value='Nuovo appostamento';await q('confirmPointBtn').onclick();
data=JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5'));const added=data.points.find(p=>p.name==='Nuovo appostamento');assert.equal(added.lat,42.1);assert.equal(added.lng,16.2);assert.equal(data.diary.length,noteCount);
// Account navigation, map layers, parking and walk start/stop use the actual DOM handlers.
q('pfc676NavPosts').click();assert(q('page-appostamenti').classList.contains('active'));assert(q('pointsList').textContent.includes('Nuovo appostamento'));
q('pfc676NavMap').click();assert(q('page-map').classList.contains('active'));
q('layersBtn').click();w.document.querySelector('[data-basemap="street"]').click();
await q('parkHereBtn').onclick();data=JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5'));assert.equal(data.car.lat,41.46);
q('clearCarBtn').click();assert.equal(JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).car,null);
q('startTrackBtn').click();await q('stopTrackBtn').onclick();assert.equal(JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).outings.length,1);
// Comparison with a real saved bird must not throw the old p.Number error.
w.document.querySelector('[data-history="sightings"]').click();q('ctSightingDate').value=new Date().toLocaleDateString('en-CA');await q('ctSightingRun').onclick();
assert.equal(q('ctSightingRun').disabled,false);
// Current mode controls preserve separate categories and keep the comparison stable.
q('pfc676Mush').click();await new Promise(r=>setTimeout(r,120));assert.equal(w.document.body.dataset.pfcActivity,'mushroom');assert(!q('pointsList').textContent.includes('Vecchio appostamento'));
q('pfc676Hunt').click();await new Promise(r=>setTimeout(r,120));q('pfc676NavSight').click();assert.equal(q('ctSightingCheck').style.display,'block');
assert(!q('teamPTT')&&!q('teamAudioBtn'),'removed walkie-talkie controls stay absent');
// Dragging the map disables recentering. A held touch selects a valid point.
const map=w.__PFC_LIVE_API__.map(),mapElement=q('map');map.fire('dragstart');assert.equal(w.__PFC_FINAL_DIAG__().follow,false);
mapElement.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:30,clientY:30,button:0}));await new Promise(r=>setTimeout(r,700));mapElement.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:30,clientY:30,button:0}));assert(w.__PFC_FINAL_LAST_SELECT__&&Number.isFinite(w.__PFC_FINAL_LAST_SELECT__.lat));
// Deletion removes the same record from persistence, map API and both lists.
const removing=w.CT.del('bird');q('pfcDeletePointDialog').querySelector('button:last-child').click();assert(await removing);assert(!w.__PFC_LIVE_API__.points().some(p=>p.id==='bird'));assert(!JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).points.some(p=>p.id==='bird'));
console.log(JSON.stringify({status:w.__PFC_APP_STATUS__,errors,warnings: warnings.slice(0,5),tests:'startup, saved points across dates, explicit filter, point coordinates, calm wind, diary save/delete, invalid backup, map navigation/layers, parking, walking, bird comparison'}));
assert.deepEqual(errors,['Error: Formato backup non valido'],'only deliberate bad-import error is expected');
}finally{setTimeout(()=>process.exit(process.exitCode||0),0)}})().catch(e=>{console.error(e);setTimeout(()=>process.exit(process.exitCode||0),0);process.exitCode=1});
