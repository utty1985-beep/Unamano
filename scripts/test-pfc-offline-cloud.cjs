const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {JSDOM}=require(process.env.PFC_JSDOM_PATH||'jsdom');
const read=f=>fs.readFileSync('cacciatraccia/'+f,'utf8'),tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 // Changing accounts preserves both data sets; an offline restart uses only a previously verified local profile.
 let dom=new JSDOM(read('index.html'),{url:'https://example.test/cacciatraccia/',runScripts:'outside-only'}),w=dom.window;
 w.eval(read('account-local.js'));w.localStorage.setItem('cacciatraccia-direct-v5',JSON.stringify({points:[{id:'Mario'}],diary:[],outings:[]}));
 w.PFC_LOCAL.selectAccount({id:'one'});w.PFC_LOCAL.remember({id:'one',email:'one@example.test'});w.PFC_LOCAL.selectAccount({id:'two'});assert.equal(w.localStorage.getItem('cacciatraccia-direct-v5'),null);
 w.localStorage.setItem('cacciatraccia-direct-v5',JSON.stringify({points:[{id:'Simona'}],diary:[],outings:[]}));w.PFC_LOCAL.selectAccount({id:'one'});assert.equal(JSON.parse(w.localStorage.getItem('cacciatraccia-direct-v5')).points[0].id,'Mario');
 let userCalls=0,loaded=0;Object.defineProperty(w.navigator,'onLine',{value:false,configurable:true});
 w.supabase={createClient:()=>({auth:{onAuthStateChange(){},getUser:async()=>{userCalls++;throw Error('network must not be used')}}})};
 const append=w.Node.prototype.appendChild;w.Node.prototype.appendChild=function(el){const out=append.call(this,el);if(el.tagName==='SCRIPT'){loaded++;setImmediate(()=>el.onload?.())}return out};
 w.eval(read('auth-required.js'));for(let i=0;i<30;i++)await tick();assert.equal(userCalls,0);assert(w.document.getElementById('pfcAuthGate').hidden);assert.equal(w.__PFC_ACCOUNT_CONTEXT__.id,'one');assert(loaded>5);w.PFC_LOCAL.forget();assert.equal(w.PFC_LOCAL.profile(),null);w.close();
 // Real cloud module, mocked database transport. Never silently restore remote data.
 dom=new JSDOM('<div class="card"><h3>Cloud</h3><p class="note"></p><div id="cloudStatus"></div><div><button id="syncNowBtn"></button></div></div>',{url:'https://example.test/',runScripts:'outside-only'});w=dom.window;
 w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:webcrypto});const timers=new Map();let timerId=0;w.setTimeout=fn=>{timers.set(++timerId,fn);return timerId};w.clearTimeout=id=>timers.delete(id);w.setInterval=()=>1;
 const rows=[];let payload={version:1,data:{points:[{id:'p',lat:41,lng:15,photo:'data:image/jpeg;base64,fixture'}],outings:[],diary:[],car:null},settings:{}},restored=null,fail=false;
 const user={id:'00000000-0000-4000-8000-000000000001'};
 class Query{
  constructor(){this.filters=[];this.op='select'}select(fields){this.fields=fields;return this}eq(k,v){this.filters.push([k,v]);return this}order(){return this}limit(n){this.max=n;return this}range(a,b){this.start=a;this.max=b-a+1;return this}insert(row){this.op='insert';this.row=row;return this}delete(){this.op='delete';return this}in(k,values){this.set=[k,values];return this}single(){this.singleRow=true;return this}
  then(resolve,reject){return this.run().then(resolve,reject)}
  async run(){if(fail)return{error:{message:'network failed'}};let selected=rows.filter(r=>this.filters.every(([k,v])=>r[k]===v));if(this.op==='insert'){if(rows.some(r=>r.checksum===this.row.checksum&&r.device_id===this.row.device_id))return{error:{code:'23505'}};const row={...structuredClone(this.row),id:webcrypto.randomUUID(),created_at:new Date().toISOString()};rows.unshift(row);return{data:row,error:null}}if(this.op==='delete'){for(let i=rows.length-1;i>=0;i--)if(this.set?.[1].includes(rows[i][this.set[0]]))rows.splice(i,1);return{error:null}}selected=selected.slice(this.start||0,(this.start||0)+(this.max||1000));return{data:this.singleRow?selected[0]:selected,error:null};}
 }
 w.__PFC_ACCOUNT_CONTEXT__={id:user.id,client:{auth:{getUser:async()=>({data:{user},error:null})},from:()=>new Query()}};
 w.__PFC_LIVE_API__={backup:()=>structuredClone(payload),restoreBackup:(data,mode)=>{restored={data,mode}}};w.confirm=()=>true;
 w.eval(read('cloud-backup.js'));await tick();assert.equal(restored,null);assert(await w.PFC_CLOUD_BACKUP.backup());assert.equal(rows.length,1);assert.equal(rows[0].data.data.points[0].photo,payload.data.points[0].photo);const first=rows[0].id;
 Object.defineProperty(w.navigator,'onLine',{value:false,configurable:true});payload.data.diary.push({id:'offline-note',notes:'Conservata offline'});assert.equal(await w.PFC_CLOUD_BACKUP.backup(),false);assert.equal(rows.length,1);
 Object.defineProperty(w.navigator,'onLine',{value:true,configurable:true});assert(await w.PFC_CLOUD_BACKUP.backup());assert.equal(rows.length,2);assert(rows[0].data.data.diary.some(d=>d.id==='offline-note'));
 await w.PFC_CLOUD_BACKUP.list();await w.PFC_CLOUD_BACKUP.restore(first,'merge');assert.equal(restored.mode,'merge');assert.equal(restored.data.data.diary.length,0);
 fail=true;assert.equal(await w.PFC_CLOUD_BACKUP.backup(true),false);assert.equal(payload.data.diary.length,1);assert(!w.document.getElementById('syncNowBtn').disabled);assert.match(w.document.getElementById('cloudStatus').textContent,/dispositivo/);
 w.close();console.log('PASS offline/account/cloud: verified-device offline access, no server call offline, account separation, photo backup, queued changes after reconnect, explicit restore, failed upload preserves local data.');
})().catch(e=>{console.error(e);process.exitCode=1});
