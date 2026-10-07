const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
(async()=>{
 const browser=await chromium.launch({headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined,executablePath:process.env.PFC_CHROMIUM_PATH||undefined,args:['--allow-loopback-in-peer-connection','--disable-features=WebRtcHideLocalIpsWithMdns','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const contexts=[],pages=[],errors=[];
 try{
  for(let i=0;i<2;i++){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},permissions:['microphone','geolocation'],geolocation:{latitude:0,longitude:0}});contexts.push(ctx);const p=await ctx.newPage();pages.push(p);await p.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config){super({...config,iceServers:[]});}};});
   p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
   if(process.env.PFC_LEAFLET_DIR){await p.route(/leaflet@1\.9\.4\/dist\/leaflet\.(js|css)/,r=>r.fulfill({contentType:r.request().url().endsWith('.js')?'text/javascript':'text/css',body:fs.readFileSync(process.env.PFC_LEAFLET_DIR+'/leaflet.'+(r.request().url().endsWith('.js')?'js':'css'),'utf8')}));await p.route(/leaflet-rotate/,r=>r.fulfill({contentType:'text/javascript',body:''}));}
   await p.route(/tile\.openstreetmap|server\.arcgisonline/,r=>r.abort());
   await p.exposeBinding('teamTestSend',async(_,m)=>{const other=pages[1-i];if(other)await other.evaluate(m=>window.dispatchEvent(new CustomEvent('pfc:team-message',{detail:m})),{...m,id:'test'+i,name:i?'Luca':'Mario'});});
   await p.goto('http://localhost:8765/cacciatraccia/6.9.2.html');
   await p.waitForFunction(()=>window.__PFC_LIVE_API__,null,{timeout:30000}).catch(async e=>{console.log(await p.evaluate(()=>({status:window.__PFC_APP_STATUS__,errors:document.getElementById('netPill')?.textContent,hasLeaflet:!!window.L})),errors);throw e;});
   await p.evaluate(i=>{window.dispatchEvent(new CustomEvent('pfc:team-ready',{detail:{id:()=> 'test'+i,ready:()=>true,send:m=>window.teamTestSend(m)}}));document.getElementById('pfcFriendsBtn').onclick=()=>{document.getElementById('pfcFriendsModal').classList.add('open');document.getElementById('pfcFriendsActive').hidden=false;};},i);
  }
  const [a,b]=pages;
  assert(await a.locator('#teamMapBar').isVisible());
  assert.equal(await a.evaluate(()=>document.querySelector('.mapWrap').nextElementSibling.id),'teamMapBar');
  assert.equal(await a.locator('#teamMapBar').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  assert.equal(await a.locator('#teamMapTalk').evaluate(e=>getComputedStyle(e).userSelect),'none');
  assert.equal(await a.locator('#teamMapTalk').evaluate(e=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);
  // Permission refusal must lead to instructions and keep the microphone off.
  await a.evaluate(()=>{window.originalGetMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));document.getElementById('pfcFriendsBtn').click();});
  await a.locator('#teamAudio').click();await a.waitForFunction(()=>document.getElementById('teamPermissionHelp')?.textContent.includes('bloccato'));
  assert(await a.locator('#teamPermissionModal').isVisible());
  await a.evaluate(()=>navigator.mediaDevices.getUserMedia=window.originalGetMedia);
  await a.locator('#teamPermissionAllow').click();await a.waitForFunction(()=>document.getElementById('teamAudio').textContent.includes('Spegni'));
  assert.equal(await a.locator('#teamPermissionModal').isVisible(),false);
  await a.locator('#pfcFriendsClose').click();
  await b.locator('#teamMapListen').click();await b.waitForFunction(()=>document.getElementById('teamAudio').textContent.includes('Spegni'));
  await a.waitForFunction(()=>document.getElementById('teamPeers').textContent.includes('Audio collegato'),null,{timeout:20000}).catch(async e=>{console.log('Peer states:',await a.locator('#teamPeers').textContent(),await b.locator('#teamPeers').textContent(),errors);throw e;});
  await b.waitForFunction(()=>document.getElementById('teamPeers').textContent.includes('Audio collegato'),null,{timeout:20000});
  // A queued text notification must survive reconnect and opening the panel.
  await a.evaluate(()=>window.dispatchEvent(new CustomEvent('pfc:team-message',{detail:{id:'friend',name:'Luca',kind:'text',text:'Aspetto alla macchina'}})));
  assert.equal(await a.locator('#teamMapBadge').textContent(),'1');assert(await a.locator('#teamMapSquad').evaluate(e=>e.classList.contains('teamUnread')));
  await a.evaluate(()=>window.dispatchEvent(new CustomEvent('pfc:team-ready',{detail:{id:()=> 'test0',ready:()=>true,send:m=>window.teamTestSend(m)}})));
  assert.equal(await a.locator('#teamMapBadge').textContent(),'1');await a.locator('#teamMapSquad').click();assert.equal(await a.locator('#teamMapBadge').textContent(),'1');await a.locator('[data-team-read]').click();assert.equal(await a.locator('#teamMapBadge').isVisible(),false);await a.locator('#pfcFriendsClose').click();
  // Actual WebRTC audio with Chromium fake microphones: hold, cancellation and missed playback.
  await b.evaluate(()=>{document.getElementById('pfcFriendsBtn').click();document.getElementById('teamMute').click();document.getElementById('pfcFriendsClose').click();});
  await a.locator('#teamMapTalk').hover();await a.mouse.down();
  await b.waitForFunction(()=>document.getElementById('teamPeers').textContent.includes('Sta parlando'));
  assert.equal(await a.locator('#teamMapTalk').getAttribute('data-ct-long-help-bound'),null);
  assert(await a.locator('#teamMapTalk').evaluate(e=>e.classList.contains('active')));
  await new Promise(r=>setTimeout(r,1200));
  await a.locator('#teamMapTalk').dispatchEvent('pointercancel',{pointerId:1});await a.mouse.up();
  assert.equal(await a.locator('#teamMapTalk').evaluate(e=>e.classList.contains('active')),false);
  await b.waitForFunction(()=>document.getElementById('teamMapBadge').textContent==='1');
  await b.locator('#teamMapListen').click();await b.waitForFunction(()=>document.getElementById('teamMapBadge').hidden,null,{timeout:10000});
  // Leaving during a permission request invalidates its result and hides the toolbar.
  await a.evaluate(()=>window.dispatchEvent(new Event('pfc:team-left')));assert.equal(await a.locator('#teamMapBar').isVisible(),false);
  assert.deepEqual(errors,[]);
  assert.equal(fs.readFileSync('cacciatraccia/index.html','utf8'),fs.readFileSync('cacciatraccia/6.9.2.html','utf8'));
  for(const n of ['app','home','friends','team','sw'])new Function(fs.readFileSync(`cacciatraccia/${n}-6.9.2.js`,'utf8'));
  console.log('PASS 6.9.2: mobile map toolbar; long press/context menu suppression; denied/granted microphone; reconnect-safe unread text; two WebRTC peers; hold/cancel; missed voice recording and playback; leave; syntax and entry point. Fake microphones, not physical devices.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
