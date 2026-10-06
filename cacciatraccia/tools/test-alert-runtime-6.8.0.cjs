const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes={},listeners={},store=new Map(),calls=[];
function el(){const e={style:{},hidden:false,classList:{add(){},remove(){}},setAttribute(){}};Object.defineProperty(e,'innerHTML',{set(s){this.html=s;for(const match of s.matchAll(/id="([^"]+)"/g))nodes[match[1]]=el()},get(){return this.html}});return e}
const root={appendChild(e){nodes[e.id]=e}};const document={hidden:false,createElement:el,getElementById:id=>nodes[id]||null,querySelector:()=>root,body:root};let context;
const window={addEventListener(type,fn){listeners[type]=fn},__PFC_TERRITORY_REFRESH__:async()=>{const result={region:'Puglia',province:'Foggia',atc:'ATC Foggia'};listeners['pfc:territory']?.({detail:result});return result}};
context={document,window,navigator:{vibrate(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},state:{points:[{id:'p',name:'Nearby',lat:41.0001,lng:15}]},lastPos:null,createPfcAlertEngine:require('../alerts-engine-6.8.0'),esc:s=>String(s),toast(){},Date,AbortController,Promise,console,setInterval(){},setTimeout(){return 1},clearTimeout(){},fetch:async url=>{calls.push(url);throw Error('offline')}};
vm.runInNewContext(fs.readFileSync('alerts-6.8.0.js','utf8'),context);
(async()=>{
 assert.equal(calls.length,0,'no network without GPS');listeners['pfc:position']({detail:{lat:41,lng:15,acc:100}});assert.equal(calls.length,0,'no checks with poor GPS');
 const p={lat:41,lng:15,acc:10};listeners['pfc:position']({detail:p});listeners['pfc:position']({detail:p});await new Promise(r=>setImmediate(r));
 assert.equal(calls.length,2,'one bounded weather and geometry request');assert.equal(window.__PFC_ALERT_STATUS__().count,1);assert.equal(nodes.pfcAlertBanner.hidden,false);assert.match(window.__PFC_ALERT_STATUS__().statuses.protected,/non disponibile/);assert.match(window.__PFC_ALERT_STATUS__().statuses.weather,/non disponibile/);
 listeners['pfc:position']({detail:p});assert.equal(calls.length,2,'duplicate fixes do not flood network');assert.equal(window.__PFC_ALERT_STATUS__().count,1,'no duplicate proximity event');
 document.hidden=true;listeners['pfc:position']({detail:{lat:42,lng:16,acc:10}});assert.equal(calls.length,2,'checks pause while hidden');document.hidden=false;nodes.pfcAlertsBtn.onclick();assert.ok(nodes.pfcAlertsModal);assert.equal(nodes.pfcAlert_near.checked,undefined);nodes.pfcAlert_near.onchange({target:{checked:false}});assert.equal(window.__PFC_ALERT_STATUS__().settings.near,false);assert.match(store.get('pfc-alert-settings-v1'),/"near":false/);
 console.log('PASS: no GPS/no network, poor GPS suspension, requests throttled, offline status, notification/history, background suspension, settings persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
