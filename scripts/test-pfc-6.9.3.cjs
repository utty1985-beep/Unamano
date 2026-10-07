const fs=require('node:fs'),assert=require('node:assert/strict');
const{chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PFC_CHROMIUM_PATH||undefined});const errors=[],sent=[];let gpsError=false,stale=false;
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Rome',serviceWorkers:'block',permissions:['geolocation'],geolocation:{latitude:0,longitude:0}});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{if(location.hostname==='localhost'){localStorage.setItem('pfc-v661-settings',JSON.stringify({mode:'mushroom'}));localStorage.setItem('cacciatraccia-direct-v5',JSON.stringify({points:[{id:'bird',type:'Avvistamento',name:'Avvistamento prova',lat:0,lng:0,windDeg:0,windSpeed:8,createdAt:new Date().toISOString()},{id:'mush',type:'Avvistamento',sightingKind:'mushroom',name:'Fungo prova',lat:0,lng:0,windDeg:90,windSpeed:8,createdAt:new Date().toISOString()}],outings:[],diary:[],car:null}));}});
 // Every external request is blocked or served from a local fixture. No location egress.
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await p.route(/leaflet@1\.9\.4\/dist\/leaflet\.(js|css)/,r=>{const ext=r.request().url().endsWith('.js')?'js':'css';return r.fulfill({contentType:ext==='js'?'text/javascript':'text/css',body:fs.readFileSync((process.env.PFC_LEAFLET_DIR||'/tmp/pfc-test-runtime/node_modules/leaflet/dist')+'/leaflet.'+ext,'utf8')});});
 await p.route(/leaflet-rotate/,r=>r.fulfill({contentType:'text/javascript',body:''}));
 await p.route('https://api.open-meteo.com/**',r=>{const start=Math.floor(Date.now()/3600000)*3600,data={timezone:'Europe/Rome',current:{time:Math.floor(Date.now()/1000),wind_direction_10m:0,wind_speed_10m:8,wind_gusts_10m:12},hourly:{time:Array.from({length:48},(_,i)=>start+i*3600),wind_direction_10m:Array.from({length:48},(_,i)=>i<3?0:90),wind_speed_10m:Array(48).fill(8),wind_gusts_10m:Array(48).fill(12)}};return r.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await p.route('https://gps.example/**',r=>{sent.push({url:r.request().url(),auth:r.request().headers().authorization});if(gpsError)return r.fulfill({status:401,body:'Unauthorized'});const data=r.request().url().endsWith('/devices')?[{id:7,name:'GPS prova'}]:[{deviceId:7,valid:true,latitude:.01,longitude:0,accuracy:5,fixTime:new Date(Date.now()-(stale?300000:0)).toISOString(),attributes:{batteryLevel:80}}];return r.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await p.goto('http://localhost:8765/cacciatraccia/6.9.3.html');await p.waitForFunction(()=>window.PFC_WIND_UI&&window.PFC_DOG);
 await p.locator('#pfc676NavSight').click();await p.waitForFunction(()=>document.querySelectorAll('[data-wind-point]').length===2);
 assert(await p.locator('#ctSightingRun').isVisible(),'comparison visible even in mushroom mode');
 await p.locator('[data-wind-point="bird"]').click();await p.locator('#pfcWindRun').click();await p.waitForFunction(()=>document.getElementById('pfcWindOutput').textContent.includes('Possibile cambio'));
 assert((await p.locator('#pfcWindOutput').textContent()).includes('VENTO SIMILE'));assert((await p.locator('#pfcWindOutput').textContent()).includes('Levante'));
 await p.locator('#pfcWindModal .dialog').screenshot({path:'/tmp/pfc-wind-6.9.3.png'});await p.locator('#pfcWindClose').click();await p.locator('#ctSightingRun').click();await p.waitForFunction(()=>document.querySelectorAll('.pfcWindResult').length===2&&document.getElementById('ctSightingSummary').textContent.includes('dettagli'));
 // Repeated mode changes/re-rendering must preserve the panel and exactly one button per item.
 for(let i=0;i<3;i++){await p.locator('#pfc676NavHome').click();await p.locator(i%2?'#pfc676Mush':'#pfc676Hunt').click();await p.locator('#pfc676NavSight').click();assert(await p.locator('#ctSightingRun').isVisible());assert.equal(await p.locator('[data-wind-point]').count(),2);}
 await p.locator('#pfc676NavHome').click();await p.locator('#dogSettingsBtn').click();assert(await p.locator('#dogModal').isVisible());assert.equal(sent.length,0,'no server connection without opt-in');
 await p.locator('#dogServer').fill('http://gps.example');await p.locator('#dogToken').fill('test-token');await p.locator('#dogConnect').click();await p.waitForFunction(()=>document.getElementById('dogStatus').textContent.includes('HTTPS'));assert.equal(sent.length,0,'reject insecure endpoint');
 await p.locator('#dogServer').fill('https://gps.example');await p.locator('#dogToken').fill('test-token');await p.locator('#dogName').fill('Fido');await p.locator('#dogConnect').click();await p.waitForFunction(()=>window.__PFC_DOG_POINTS__().length===1);
 assert(sent.every(r=>r.auth==='Bearer test-token'));assert.equal(await p.evaluate(()=>JSON.stringify(localStorage).includes('test-token')),false);
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('pfc:position',{detail:{lat:0,lng:0,acc:5}})));assert(await p.locator('#dogMapBar').evaluate(e=>e.classList.contains('dogFar')));assert.equal(await p.evaluate(()=>window.__PFC_DOG_POINTS__().length),1);
 gpsError=true;await p.evaluate(()=>window.PFC_DOG.update());assert.equal(await p.evaluate(()=>window.__PFC_DOG_POINTS__().length),0,'failed connection cannot display a live radar position');assert((await p.locator('#dogStatus').textContent()).includes('non autorizzato'));
 await p.locator('#dogDisconnect').click();assert.equal(await p.evaluate(()=>window.__PFC_DOG_POINTS__().length),0);assert.equal(await p.locator('#dogMapBar').isVisible(),false);
 gpsError=false;stale=true;await p.locator('#dogToken').fill('test-token');await p.locator('#dogConnect').click();await p.waitForFunction(()=>document.getElementById('dogStatus').textContent.includes('Ultima posizione'));assert.equal(await p.evaluate(()=>window.__PFC_DOG_POINTS__().length),0,'stale GPS stays on map but excluded from live radar');await p.locator('#dogDisconnect').click();
 assert.deepEqual(errors,[]);
 for(const n of ['app','home','friends','team','sw','wind','wind-engine','dog'])new Function(fs.readFileSync(`cacciatraccia/${n}-6.9.3.js`,'utf8'));
 assert.equal(fs.readFileSync('cacciatraccia/index.html','utf8'),fs.readFileSync('cacciatraccia/6.9.3.html','utf8'));
 console.log('PASS 6.9.3 browser: wind button visible in both modes and after re-renders; per-sighting and all-sightings wind comparisons/change time; private Traccar adapter opt-in/HTTPS/Bearer; distance alert; stale/error handling; radar exclusion; disconnect; no persisted tokens; no browser errors. Mock weather/server and GPS, no hardware certification.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
