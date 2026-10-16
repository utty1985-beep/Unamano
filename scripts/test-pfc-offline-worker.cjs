const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base='https://example.test/cacciatraccia/',listeners={},stores=new Map();let online=true;
const key=x=>new URL(typeof x==='string'?x:x.url,base).href;
class Cache{constructor(){this.items=new Map()}async match(r){return this.items.get(key(r))?.clone()}async put(r,v){this.items.set(key(r),v.clone())}async keys(){return [...this.items.keys()].map(url=>new Request(url))}async delete(r){return this.items.delete(key(r))}async addAll(urls){for(const u of urls)await this.put(u,await network(key(u)))}}
const caches={async open(n){if(!stores.has(n))stores.set(n,new Cache());return stores.get(n)},async keys(){return [...stores.keys()]},async delete(n){return stores.delete(n)}};
async function network(req){if(!online)throw Error('offline');const u=new URL(typeof req==='string'?req:req.url,base);let path=u.pathname.replace('/cacciatraccia/','');if(!path)path='index.html';return new Response(fs.readFileSync('cacciatraccia/'+path));}
const self={location:new URL(base+'sw-offline.js'),addEventListener:(t,f)=>listeners[t]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
vm.runInNewContext(fs.readFileSync('cacciatraccia/sw-offline.js','utf8'),{self,caches,URL,Response,Request,fetch:network,AbortController,setTimeout,clearTimeout});
async function event(t){let p;listeners[t]({waitUntil(v){p=v}});await p}
async function request(url,mode='cors'){let p;listeners.fetch({request:{url:new URL(url,base).href,method:'GET',mode},respondWith(v){p=v}});return p?await p:null}
(async()=>{await event('install');await event('activate');online=false;
const page=await request('./?t=offline-restart','navigate');assert.match(await page.text(),/auth-required.js/);assert(!(await request('https://example.supabase.co/auth/v1/user')),'authentication must not be cached');assert(!(await request('https://example.supabase.co/rest/v1/pfc_backups')),'private data must not be cached');
const script=await request(fs.readFileSync('cacciatraccia/index.html','utf8').match(/data-pfc-src="(app-6\.9\.8\.js[^"]*)/)[1]);assert.match(await script.text(),/restoreCloudPayload/);
const pinned=await caches.open('cacciatraccia-offline-tiles-v1'),tile='https://tile.openstreetmap.org/14/8898/6091.png';await pinned.put(tile,new Response('downloaded map'));
assert.equal(await(await request(tile,'no-cors')).text(),'downloaded map');assert.match(await(await request('https://tile.openstreetmap.org/14/8899/6091.png','no-cors')).text(),/Area non scaricata/);
console.log('PASS offline worker: complete current shell, offline restart, exact script versions, prepared maps, uncached-area indicator, no auth/cloud caching.');})().catch(e=>{console.error(e);process.exitCode=1});
