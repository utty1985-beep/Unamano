const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('cacciatraccia/gps-6.7.3.js','utf8');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(){
  let serial=0;const timers=new Map(),calls=[],watches=new Map(),views=[],events={},mapEvents={},elements={};
  const element=id=>elements[id]??=( {textContent:'',style:{},classList:{toggle(){}},setAttribute(){},addEventListener(name,fn){events[id+':'+name]=fn;}} );
  const ctx={console,Promise,Number,Math,Error,Object,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),
    document:{hidden:false,documentElement:{dataset:{}},addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>events[name]=fn},
    navigator:{geolocation:{getCurrentPosition:(ok,err,opts)=>calls.push({ok,err,opts}),watchPosition:(ok,err)=>{watches.set(++serial,{ok,err});return serial;},clearWatch:id=>watches.delete(id)}},
    $:element,L:{circleMarker:()=>({addTo(){return this;},setLatLng(){}})},
    map:{getZoom:()=>16,setView:p=>views.push(p),getContainer:()=>element('map'),on:(name,fn)=>mapEvents[name]=fn,getCenter:()=>({lat:41,lng:15})},
    lastPos:null,gpsWatch:null,userMarker:null,follow:true,selected:null,bind(){},updateCar(){},toast(){},getFix:null,startGps:null,locate:null,toggleFollow:null};
  vm.createContext(ctx);vm.runInContext(src,ctx);ctx.bind();
  return {ctx,calls,watches,views,events,mapEvents,timers,elements,fire:async ms=>{const item=[...timers].find(([,t])=>t.ms===ms);assert.ok(item,'timer '+ms);timers.delete(item[0]);item[1].fn();await flush();}};
}
const fix={coords:{latitude:41.46,longitude:15.55,accuracy:12,heading:null,speed:null}};
(async()=>{
  let h=setup();const a=h.ctx.startGps(),b=h.ctx.getFix();assert.equal(a,b);assert.equal(h.calls.length,1);
  h.calls[0].ok(fix);await a;assert.equal(h.watches.size,1);assert.equal(h.ctx.lastPos.heading,null);
  h.mapEvents.dragstart();[...h.watches.values()][0].ok(fix);assert.equal(h.views.length,1,'watch must not recenter after drag');
  const locate=h.ctx.locate();h.mapEvents.dragstart();h.calls[1].ok(fix);await locate;assert.equal(h.views.length,1,'pending locate must respect drag');
  h.ctx.document.hidden=true;h.events.visibilitychange();assert.equal(h.watches.size,0);
  h.ctx.document.hidden=false;h.events.visibilitychange();h.calls[2].ok(fix);await flush();assert.equal(h.watches.size,1);
  h=setup();const denied=h.ctx.startGps();h.calls[0].err({code:1});await denied;assert.equal(h.watches.size,0);assert.equal(h.timers.size,0);
  h=setup();const silent=h.ctx.startGps();await h.fire(9000);assert.equal(h.calls.length,2);await h.fire(16000);await silent;assert.equal(h.ctx.window.__PFC_FINAL_DIAG__().gpsPending,false);assert.match(h.elements.gpsBadge.textContent,/segnale debole/);
  h.calls[0].ok(fix);await flush();assert.equal(h.ctx.lastPos,null,'late callback ignored');
  for(const delay of [2500,5000,9000]){await h.fire(delay);await h.fire(9000);await h.fire(16000);}
  assert.equal(h.timers.size,0,'retries are bounded');assert.match(h.elements.gpsBadge.textContent,/riprova/);
  h=setup();const invalid=h.ctx.getFix();h.calls[0].ok({coords:{latitude:null,longitude:null}});await invalid;assert.equal(h.ctx.lastPos,null);
  console.log('PASS GPS: concurrent requests, follow/drag, pending locate, resume, denied permission, native silence, late callback, bounded retries, invalid coordinates');
  // Execute the actual loader transformations and compile the concatenated modules.
  const chunks=[],deferred=[],pill={textContent:''};
  const sandbox={URL,URLSearchParams,AbortController,console,setTimeout,clearTimeout,location:{href:'https://test.invalid/cacciatraccia/',search:''},document:{getElementById:()=>pill},window:{},
    fetch:async url=>({ok:true,text:async()=>fs.readFileSync('cacciatraccia/'+new URL(url).pathname.split('/cacciatraccia/')[1],'utf8')}),
    requestIdleCallback:fn=>deferred.push(fn)};
  sandbox.window.requestIdleCallback=sandbox.requestIdleCallback;
  sandbox.Function=function(code){new Function(code);chunks.push(code);return ()=>{sandbox.window.__PFC_BOOT_READY__=Promise.resolve();sandbox.window.__PFC6621_EVAL__=s=>{new Function(code+'\n'+s);chunks.push(s);};};};
  vm.createContext(sandbox);
  await vm.runInContext('(async()=>{'+fs.readFileSync('cacciatraccia/app-loader-6.7.3.js','utf8')+'})()',sandbox);
  for(const task of deferred)await task();
  assert.equal(chunks.length,2);assert.ok(!chunks[1].includes("const VER='6.7.1'"));
  assert.ok(chunks[0].includes('window.__PFC_BOOT_READY__='));
  assert.ok(chunks[0].includes('initMap(); bind();'));
  assert.ok(!chunks[0].includes('await navigator.serviceWorker.register'));
  new Function(chunks[0]+'\n'+chunks[1]+'\n'+fs.readFileSync('cacciatraccia/v6/part35.txt','utf8'));
  new Function(fs.readFileSync('cacciatraccia/sw-6.7.3.js','utf8'));
  console.log('PASS actual loader: transformed core, startup order, enhancements, lazy radar, worker syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
