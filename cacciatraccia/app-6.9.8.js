// Passione Funghi e Caccia 6.9.8: generated from preserved stable modules.
(()=>{
const $ = id => document.getElementById(id);
function activityMode(){try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode==='mushroom'?'mushroom':'hunt';}catch{return 'hunt';}}
function pointMatchesMode(p){return activityMode()==='mushroom'?p.sightingKind==='mushroom':p.sightingKind!=='mushroom';}
const STORE = 'cacciatraccia-direct-v5';
const SNAP_STORE = 'cacciatraccia-direct-v5-snapshots';
const POINT_DELETIONS_KEY = 'cacciatraccia-point-deletions-v1';
function pointDeletionList(){
  try{
    const raw=JSON.parse(localStorage.getItem(POINT_DELETIONS_KEY)||'[]');
    return Array.isArray(raw)?raw.filter(v=>v&&typeof v.id==='string'&&typeof v.deletedAt==='string'&&Number.isFinite(Date.parse(v.deletedAt))):[];
  }catch{return []}
}
function combinePointDeletions(first,second){
  const map=new Map();
  for(const x of [...first,...second]){
    if(!x||typeof x.id!=='string'||typeof x.deletedAt!=='string'||!Number.isFinite(Date.parse(x.deletedAt)))continue;
    const old=map.get(x.id);
    if(!old||Date.parse(old.deletedAt)<Date.parse(x.deletedAt))map.set(x.id,{id:x.id,deletedAt:x.deletedAt});
  }
  return [...map.values()];
}
function pointSurvivesDeletion(point,deletions){
  const at=deletions.get(String(point.id));
  return !at||Date.parse(point.updatedAt||point.createdAt||0)>Date.parse(at);
}
const APP_VERSION = 6;
const localDay = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const uniqueId = () => crypto.randomUUID?.() || Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
const validCoords = p => p && p.lat!=null && p.lng!=null && p.lat!=='' && p.lng!=='' && Number.isFinite(+p.lat) && Math.abs(+p.lat)<=90 && Number.isFinite(+p.lng) && Math.abs(+p.lng)<=180;
let filterPostsByDay=false;
const matchesPostDay=(p,day)=>!filterPostsByDay||p.huntDate===day;
let state = { points: [], outings: [], diary: [], car: null };
let map, sat, street, markerLayer, userMarker, carMarker, returnLine, lastPos = null, gpsWatch = null;
let northLocked = false;
let follow = true, selected = null, editing = null, historyFilter = 'all', installPrompt = null;
let track = { active:false, watch:null, start:0, coords:[], km:0, timer:null, line:null };
try { state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch {}
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const save = () => { localStorage.setItem(STORE, JSON.stringify(state)); window.dispatchEvent(new Event('pfc:data-changed')); try{renderAll()}catch(e){console.error('Aggiornamento schermata',e);toast('Dati salvati. Riapri la schermata per aggiornarla.')} };
const hav = (a,b) => { const R=6371,r=x=>x*Math.PI/180,d1=r(b[0]-a[0]),d2=r(b[1]-a[1]),q=Math.sin(d1/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(d2/2)**2; return 2*R*Math.asin(Math.sqrt(q)); };
const wname = d => d==null||d===''||!Number.isFinite(Number(d))?'Vento non disponibile':['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'][Math.round((((Number(d)%360)+360)%360)/45)%8];
const wdir = d => ['N','NE','E','SE','S','SO','O','NO'][Math.round((((+d||0)%360)+360)%360/45)%8];
const wtext = c => ({0:'Sereno',1:'Prevalentemente sereno',2:'Parzialmente nuvoloso',3:'Coperto',45:'Nebbia',48:'Nebbia',51:'Pioviggine',53:'Pioviggine',55:'Pioviggine forte',61:'Pioggia debole',63:'Pioggia',65:'Pioggia forte',80:'Rovesci',81:'Rovesci',82:'Rovesci forti',95:'Temporale',96:'Temporale',99:'Temporale forte'})[c] || 'Dato non disponibile';
const when = iso => { try { return new Date(iso).toLocaleString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return iso||''; } };
function toast(t){ const x=$('toast'); if(!x) return alert(t); x.textContent=t; x.classList.add('show'); setTimeout(()=>x.classList.remove('show'),2400); }
function loadScript(src){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
function loadCss(href){ return new Promise((resolve,reject)=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=resolve; l.onerror=()=>reject(new Error('Stile mappa non disponibile')); document.head.appendChild(l); }); }
async function ensureLeaflet(){
  const waitScript=(src,ms=5000)=>new Promise((ok,no)=>{
    const s=document.createElement('script');let done=false;
    const finish=(err)=>{if(done)return;done=true;clearTimeout(tm);s.onload=null;s.onerror=null;if(err){try{s.remove()}catch{};no(err)}else ok()};
    const tm=setTimeout(()=>finish(new Error('timeout '+src)),ms);
    s.src=src;s.async=true;s.onload=()=>finish();s.onerror=()=>finish(new Error('errore caricamento '+src));document.head.appendChild(s);
  });
  // Tile positioning must be styled before creating the map, including with an existing L.
  await loadCss('vendor/leaflet/leaflet.css?v=1.9.4');
  if(!window.L){
    const cdn=[
      'vendor/leaflet/leaflet.js?v=1.9.4',
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    ];
    let lastErr=null;
    for(const src of cdn){
      try{await waitScript(src,5000);if(window.L)break}catch(e){lastErr=e;console.warn('Leaflet CDN',src,e)}
    }
    if(!window.L)throw Error('Leaflet non disponibile'+(lastErr?' · controlla la rete':''));
  }
  await waitScript('vendor/leaflet-rotate.js?v=0.3.0',4500)
    .catch(e=>console.warn('Rotazione avanzata non caricata',e));
}
function icon(type){ const color=type==='Avvistamento'?'#a9342a':type==='Passaggio'?'#80582b':type==='Parcheggio'?'#315d80':'#2f6c42'; return L.divIcon({className:'',html:`<div style="width:25px;height:25px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 6px #0006"></div>`,iconSize:[28,34],iconAnchor:[14,30]}); }
function initMap(){
  const opts={zoomControl:true,rotate:true,touchRotate:true,rotateControl:false,bearing:0};
  map=L.map('map',opts).setView([41.5,14],6);
  sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(map);
  street=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
  markerLayer=L.layerGroup().addTo(map);
  map.on('click',e=>selectMapPoint(e.latlng.lat,e.latlng.lng));
  $('followBtn')?.classList.add('active');
  // Login and navigation can initialize the map inside a display:none ancestor.
  // Observe its actual visible size instead of relying on a fixed startup delay.
  const refreshSize=()=>{
    if(!map.getContainer().clientWidth || !map.getContainer().clientHeight)return;
    map.invalidateSize({pan:false,debounceMoveend:true});
  };
  const scheduleSize=()=>requestAnimationFrame(refreshSize);
  if(window.ResizeObserver){const observer=new ResizeObserver(scheduleSize);observer.observe(map.getContainer());}
  window.addEventListener('pfc:authenticated',scheduleSize);
  window.addEventListener('pageshow',scheduleSize);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSize();});
  startGps(); renderAll(); scheduleSize();
}
function setLayer(k){ if(k==='street'){ map.removeLayer(sat); street.addTo(map); } else { map.removeLayer(street); sat.addTo(map); } document.querySelectorAll('.layerChoice').forEach(b=>b.classList.toggle('active',b.dataset.basemap===k)); }
function setBearing(deg){ if(map?.setBearing){ map.setBearing(northLocked ? 0 : deg); return true; } return false; }
function toggleNorthLock(){
  northLocked=!northLocked;
  const b=$('northBtn');
  b.classList.toggle('active',northLocked);
  b.setAttribute('aria-pressed',String(northLocked));
  b.title=northLocked?'Nord bloccato: tocca per ruotare con due dita':'Rotazione libera: tocca per bloccare il Nord';
  b.dataset.ctHelp=b.title;
  if(northLocked){if(map)map.options.touchRotate=false;setBearing(0)}
  else if(map)map.options.touchRotate=true;
  toast(northLocked?'Nord bloccato':'Ruota la mappa con due dita');
}
function getBearing(){ try { return Number(map?.getBearing?.() || 0); } catch { return 0; } }
async function getFix(){ return new Promise(res=>{ if(!navigator.geolocation){ toast('GPS non disponibile'); return res(null); } navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0),heading:p.coords.heading}),e=>{toast('GPS: '+e.message);res(null)},{enableHighAccuracy:true,timeout:15000,maximumAge:1000}); }); }
function startGps(){
  if(gpsWatch!=null || !navigator.geolocation) return;
  gpsWatch=navigator.geolocation.watchPosition(p=>{
    lastPos={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0),heading:p.coords.heading,speed:p.coords.speed};
    $('gpsBadge').textContent=`GPS ±${lastPos.acc} m`;
    if(!userMarker) userMarker=L.circleMarker([lastPos.lat,lastPos.lng],{radius:9,color:'#fff',weight:4,fillColor:'#2878d8',fillOpacity:1}).addTo(map);
    else userMarker.setLatLng([lastPos.lat,lastPos.lng]);
    if(follow) map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});
    updateCar();
  },()=>{$('gpsBadge').textContent='GPS non disponibile';},{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
}
async function locate(){ const p=await getFix(); if(p){ follow=true; $('followBtn').classList.add('active'); map.setView([p.lat,p.lng],16); } }
function toggleFollow(){ follow=!follow; $('followBtn').classList.toggle('active',follow); if(follow&&lastPos) map.setView([lastPos.lat,lastPos.lng],16); toast(follow?'Seguimi attivo':'Seguimi disattivato'); }
async function selectMapPoint(lat,lng){ follow=false; $('followBtn')?.classList.remove('active'); selected={lat,lng,weather:null}; $('selectedCard').classList.remove('hidden'); $('selectedCoords').textContent=`${lat.toFixed(6)}, ${lng.toFixed(6)}`; await weather(lat,lng); }
function clearSelected(){ $('selectedCard').classList.add('hidden'); selected=null; }
async function weather(lat,lng){
  const __pfcTargetLat=+lat,__pfcTargetLng=+lng;
  $('weatherBody').innerHTML='<div class="empty">Carico meteo…</div>';
  try{
    const u=`https://pfc-weather.invalid/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=2`;
    const r=await fetch(u); if(!r.ok) throw Error('Meteo non disponibile'); const j=await r.json(), c=j.current||{};
    if(!selected){selected={lat:__pfcTargetLat,lng:__pfcTargetLng,weather:null};}else if(!Number.isFinite(+selected.lat)||!Number.isFinite(+selected.lng)||Math.abs((+selected.lat)-__pfcTargetLat)>1e-7||Math.abs((+selected.lng)-__pfcTargetLng)>1e-7)return null;
    selected.weather={source:j.source||'Open-Meteo',fetchedAt:new Date().toISOString(),temperature:c.temperature_2m,condition:wtext(c.weather_code),windName:wname(c.wind_direction_10m),windDir:wdir(c.wind_direction_10m),windSpeed:c.wind_speed_10m,windGust:c.wind_gusts_10m};
    $('weatherBody').innerHTML=`<div class="weatherGrid"><div class="weatherNow"><span>Temperatura</span><b>${c.temperature_2m??'-'} °C</b></div><div class="weatherNow"><span>Condizioni</span><b>${wtext(c.weather_code)}</b></div><div class="weatherNow"><span>Vento</span><b>${wname(c.wind_direction_10m)} ${wdir(c.wind_direction_10m)}</b><small>${(c.wind_speed_10m==null?'—':Math.round(c.wind_speed_10m))} km/h</small></div><div class="weatherNow"><span>Raffiche</span><b>${(c.wind_gusts_10m==null?'—':Math.round(c.wind_gusts_10m))} km/h</b></div></div>`;
    $('weatherStamp').textContent=new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ $('weatherBody').innerHTML=`<div class="empty">${esc(e.message)}${navigator.onLine?'':' · ultimo dato salvato resta nel punto'}</div>`; }
}
function ensureModalActions(){
  const confirm=$('confirmPointBtn'); if(!confirm || $('pointShareModalBtn')) return;
  const wrap=document.createElement('div'); wrap.className='actionGrid'; wrap.style.marginTop='8px';
  wrap.innerHTML='<button id="pointNavigateBtn" class="secondary" type="button">▶ Partenza</button><button id="pointShareModalBtn" class="secondary" type="button">↗ Condividi punto</button>';
  confirm.parentElement.insertAdjacentElement('beforebegin',wrap);
}
function fillModal(p){
  ensureModalActions(); editing=p?.id||null;
  $('pointPhoto').value='';
  selected={lat:Number(p?.lat??selected?.lat),lng:Number(p?.lng??selected?.lng),weather:p?(p.weather||null):(selected?.weather||null)};
  $('pointModalTitle').textContent=p?'Dettagli punto salvato':'Nuovo punto';
  $('pointModalCoords').textContent=selected?`${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`:'';
  $('pointType').value=p?.type||'Postazione'; $('pointName').value=p?.name||''; $('pointHuntDate').value=p?.huntDate||localDay();
  $('pointSpecies').value=p?.species||''; $('pointQuantity').value=p?.quantity??''; $('pointWindName').value=p?.windName||p?.weather?.windName||''; $('pointWindDir').value=p?.windDir||p?.weather?.windDir||'';
  $('pointWindSpeed').value=p?.windSpeed??p?.weather?.windSpeed??''; $('pointWindGust').value=p?.windGust??p?.weather?.windGust??''; $('pointNotes').value=p?.notes||'';
  $('pointPhotoPreview').innerHTML=p?.photo?`<img src="${p.photo}" style="max-width:100%;border-radius:12px">`:'';
  $('pointWeatherSummary').textContent=p?.weather?`${p.weather.condition} · ${p.weather.windName} ${p.weather.windSpeed} km/h`:'Puoi leggere il meteo/vento di adesso.';
  $('pointModal').classList.add('open');
  $('pointNavigateBtn').onclick=navigateSelected; $('pointShareModalBtn').onclick=shareSelected;
}
function fileData(f,max=1000,q=.72){ return new Promise((ok,no)=>{ const r=new FileReader(), im=new Image(); r.onload=()=>im.src=r.result; r.onerror=()=>no(Error('Foto non leggibile')); im.onerror=()=>no(Error('Foto non valida: scegli un’immagine JPG o PNG')); im.onload=()=>{ let w=im.width,h=im.height,k=Math.min(1,max/Math.max(w,h)); w*=k; h*=k; const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); ok(c.toDataURL('image/jpeg',q)); }; r.readAsDataURL(f); }); }
async function savePoint(){
  if(!validCoords(selected))return toast('Scegli prima una posizione valida sulla mappa');
  let photo=null, f=$('pointPhoto').files[0];
  if(f)try{photo=await fileData(f)}catch(e){return toast(e.message)};
  const previousPoints=state.points.map(p=>({...p}));
  const d={sightingKind:(editing?state.points.find(p=>p.id===editing)?.sightingKind:activityMode()==='mushroom'?'mushroom':undefined),type:$('pointType').value,name:$('pointName').value.trim()||'Punto GPS',huntDate:$('pointHuntDate').value||localDay(),species:$('pointSpecies').value.trim(),quantity:+$('pointQuantity').value||0,windName:$('pointWindName').value.trim(),windDir:$('pointWindDir').value.trim(),windSpeed:$('pointWindSpeed').value.trim()===''?null:Number($('pointWindSpeed').value),windGust:$('pointWindGust').value.trim()===''?null:Number($('pointWindGust').value),notes:$('pointNotes').value.trim(),weather:selected.weather||null};
  if(editing){ const i=state.points.findIndex(x=>x.id===editing); if(i>=0) state.points[i]={...state.points[i],...d,photo:photo||state.points[i].photo||null,updatedAt:new Date().toISOString()}; }
  else state.points.unshift({id:uniqueId(),lat:selected.lat,lng:selected.lng,createdAt:new Date().toISOString(),photo,...d});
  try{save()}catch(e){state.points=previousPoints;return toast('Memoria piena: esporta un backup o riduci la foto. Punto non salvato.')}
  $('pointModal').classList.remove('open'); editing=null; renderMarkers(); toast(d.sightingKind==='mushroom'?'Fungo salvato nel diario':d.type==='Avvistamento'?'Salvato in Avvistamenti':'Punto salvato in Appostamenti');
}
// A known place can be recorded from the map without obtaining a GPS fix.
function openSelectedObservation(mushroom){
  const card=$('selectedCard');
  const at=selected&&card&&!card.classList.contains('hidden')&&validCoords(selected)?selected:map?.getCenter();
  if(!validCoords(at))return toast('Scegli prima un punto sulla mappa.');
  follow=false;$('followBtn')?.classList.remove('active');
  selected={lat:+at.lat,lng:+at.lng,weather:at.weather||null};
  fillModal(null);
  $('pointType').value=mushroom?'Postazione':'Avvistamento';
  $('pointName').value=mushroom?'Fungo trovato':'Avvistamento';
  $('pointModalTitle').textContent=mushroom?'🍄 Salva nel diario funghi':'🕊️ Salva avvistamento nel punto scelto';
  const w=selected.weather;
  if(w){
    $('pointWindName').value=w.windName||'';$('pointWindDir').value=w.windDir||'';
    $('pointWindSpeed').value=w.windSpeed??'';$('pointWindGust').value=w.windGust??'';
    $('pointWeatherSummary').textContent=`${w.condition||''} · ${w.windName||''} ${w.windSpeed??'—'} km/h`;
  }
}
async function saveCurrent(type='Postazione',open=false){
  const p=await getFix(); if(!p) return;
  const item={id:uniqueId(),lat:p.lat,lng:p.lng,type,name:type==='Avvistamento'?'Avvistamento':'Punto GPS',huntDate:localDay(),species:'',quantity:0,notes:'',weather:null,photo:null,createdAt:new Date().toISOString()};
  state.points.unshift(item); save(); renderMarkers(); map.setView([p.lat,p.lng],16); if(open) fillModal(item); else toast('Punto salvato: toccalo per aggiungere uccelli, vento e note');
}
function renderMarkers(){ markerLayer.clearLayers(); state.points.forEach(p=>{ const m=L.marker([p.lat,p.lng],{icon:icon(p.type)}).addTo(markerLayer); m.on('click',e=>{L.DomEvent.stopPropagation(e); fillModal(p);}); }); }
function renderPoints(){
  const el=$('pointsList');
  el.innerHTML=state.points.length?state.points.map(p=>`<div class="item"><div class="itemTop"><div><h4>${esc(p.name||p.type)}</h4><div class="meta">${esc(p.type)} · ${esc(when(p.createdAt))}</div>${p.species?`<div>🕊 ${esc(p.species)}${p.quantity?' × '+p.quantity:''}</div>`:''}</div></div>${(p.windName||p.weather)?`<div class="snap">💨 ${esc(p.windName||p.weather?.windName||'')} ${p.windSpeed??p.weather?.windSpeed??'-'} km/h${p.weather?.condition?' · 🌦 '+esc(p.weather.condition):''}</div>`:''}<div class="rowBtns"><button class="mini" onclick="CT.go('${p.id}')">Mappa</button><button class="mini" onclick="CT.edit('${p.id}')">Modifica</button><button class="mini" onclick="CT.sharePoint('${p.id}')">↗ Condividi</button><button class="mini red" onclick="CT.del('${p.id}')">Elimina</button></div></div>`).join(''):'<div class="empty">Nessun punto salvato.</div>';
}
function renderCar(){ if(carMarker){map.removeLayer(carMarker);carMarker=null;} if(state.car) carMarker=L.marker([state.car.lat,state.car.lng],{icon:L.divIcon({className:'',html:'<div style="font-size:30px">🚗</div>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map); updateCar(); }
function updateCar(){ if(!state.car){$('carStatus').textContent='non fissata';$('carInfo').textContent='Fissa la macchina quando parcheggi: resterà sulla mappa mentre prosegui a piedi.';return;} $('carStatus').textContent='auto salvata'; if(lastPos){const d=hav([lastPos.lat,lastPos.lng],[state.car.lat,state.car.lng]);$('carInfo').textContent=`Distanza auto: ${d<1?Math.round(d*1000)+' m':d.toFixed(2)+' km'}`; if(returnLine)returnLine.setLatLngs([[lastPos.lat,lastPos.lng],[state.car.lat,state.car.lng]]);} else $('carInfo').textContent=`${state.car.lat.toFixed(5)}, ${state.car.lng.toFixed(5)}`; }
async function parkCar(){ const p=await getFix(); if(!p)return; state.car={lat:p.lat,lng:p.lng,updatedAt:new Date().toISOString()}; save(); renderCar(); map.setView([p.lat,p.lng],17); toast('Posizione auto fissata'); }
async function moveCar(){ await parkCar(); }
function carReturn(){ if(!state.car||!lastPos)return toast('Serve GPS e posizione auto'); if(returnLine)map.removeLayer(returnLine); returnLine=L.polyline([[lastPos.lat,lastPos.lng],[state.car.lat,state.car.lng]],{color:'#f2b72b',weight:5,dashArray:'8 8'}).addTo(map); map.fitBounds(returnLine.getBounds(),{padding:[40,40]}); }
function navigateTo(lat,lng,mode='driving'){ window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}&travelmode=${mode}`,'_blank','noopener'); }
function navigateSelected(){ if(!selected)return toast('Seleziona prima un punto'); navigateTo(selected.lat,selected.lng,'driving'); }
async function shareText(text,title='CacciaTraccia Italia'){ try{ if(navigator.share) return await navigator.share({title,text}); }catch(e){ if(e.name==='AbortError')return; } try{ await navigator.clipboard.writeText(text); toast('Dettagli copiati negli appunti'); }catch{ prompt('Copia questi dettagli',text); } }
async function shareSelected(){ if(!selected)return toast('Seleziona prima un punto'); const p=editing?state.points.find(x=>x.id===editing):null; const t=p?pointShareText(p):`Punto CacciaTraccia Italia\nCoordinate: ${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}\nGoogle Maps: https://www.google.com/maps?q=${selected.lat},${selected.lng}`; await shareText(t,p?.name||'CacciaTraccia Italia'); }
function pointShareText(p){ return `${p.name||p.type||'Punto'}\nTipo: ${p.type||'-'}\nData/ora salvataggio: ${when(p.createdAt)}\nGiorno caccia: ${p.huntDate||'-'}\nCoordinate: ${p.lat}, ${p.lng}\nUccelli: ${p.species||'-'}${p.quantity?' x '+p.quantity:''}\nVento: ${p.windName||p.weather?.windName||'-'} ${p.windDir||p.weather?.windDir||''} ${p.windSpeed??p.weather?.windSpeed??'-'} km/h\nNote: ${p.notes||'-'}\nGoogle Maps: https://www.google.com/maps?q=${p.lat},${p.lng}`; }
function startTrack(){
  if(track.active)return; if(!navigator.geolocation)return toast('GPS non disponibile');
  track={active:true,watch:null,start:Date.now(),coords:[],km:0,timer:null,line:L.polyline([],{color:'#173f2b',weight:5}).addTo(map)};
  track.watch=navigator.geolocation.watchPosition(p=>{ const c=[p.coords.latitude,p.coords.longitude]; if(track.coords.length){const d=hav(track.coords.at(-1),c);if(d<1)track.km+=d;} track.coords.push(c); track.line.setLatLngs(track.coords); if(track.coords.length===1)map.setView(c,16); trackUI(); },e=>toast('GPS: '+e.message),{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  track.timer=setInterval(trackUI,1000); $('startTrackBtn').disabled=true; $('stopTrackBtn').disabled=false; $('trackStatus').textContent='in corso'; showPage('track');
}
function trackUI(){ $('trackDistance').textContent=track.km.toFixed(2)+' km'; $('trackPoints').textContent=track.coords.length; const s=Math.floor((Date.now()-track.start)/1000); $('trackTime').textContent=String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor((s%3600)/60)).padStart(2,'0'); }
async function stopTrack(){
 if(!track.active)return;let photo=null;const f=$('trackPhoto').files[0];if(f)try{photo=await fileData(f)}catch(e){return toast(e.message)}
 const outing={id:uniqueId(),start:new Date(track.start).toISOString(),end:new Date().toISOString(),distanceKm:track.km,coords:[...track.coords],photo,note:$('trackNote').value.trim()};
 state.outings.unshift(outing);try{save()}catch(e){state.outings=state.outings.filter(o=>o!==outing);return toast('Memoria piena: percorso ancora attivo. Esporta un backup prima di riprovare.')}
 navigator.geolocation.clearWatch(track.watch);clearInterval(track.timer);track.active=false;
 $('startTrackBtn').disabled=false;$('stopTrackBtn').disabled=true;$('trackStatus').textContent='fermo';$('trackPhoto').value='';$('trackNote').value='';toast('Uscita salvata');return true;
}
function renderOutings(){ const el=$('outingsList'); el.innerHTML=state.outings.length?state.outings.map(o=>`<div class="item"><div class="itemTop"><div><h4>${new Date(o.start).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</h4><div class="meta">${new Date(o.start).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div></div><b>${(+o.distanceKm||0).toFixed(2)} km</b></div>${o.note?`<div>${esc(o.note)}</div>`:''}${o.photo?`<img class="photoPreview" src="${o.photo}">`:''}<div class="rowBtns"><button class="mini" onclick="CT.out('${o.id}')">Mostra</button><button class="mini" onclick="CT.share('${o.id}')">↗ Condividi</button><button class="mini red" onclick="CT.delOut('${o.id}')">Elimina</button></div></div>`).join(''):'<div class="empty">Nessuna uscita salvata.</div>'; }
async function shareOut(id){
  const o=state.outings.find(x=>x.id===id); if(!o)return;
  const c=document.createElement('canvas'); c.width=900;c.height=1100; const x=c.getContext('2d'); x.fillStyle='#f4f1e8';x.fillRect(0,0,900,1100);x.fillStyle='#173f2b';x.fillRect(0,0,900,130);x.fillStyle='#fff';x.font='bold 44px sans-serif';x.fillText('Passione Funghi e Caccia',40,82);x.fillStyle='#182018';x.font='bold 34px sans-serif';x.fillText(`${new Date(o.start).toLocaleDateString('it-IT')} • ${(+o.distanceKm||0).toFixed(2)} km`,40,190);
  const b={x:50,y:240,w:800,h:500};x.fillStyle='#dfe7d8';x.fillRect(b.x,b.y,b.w,b.h);
  if(o.coords?.length>1){ const a=o.coords,minLa=Math.min(...a.map(p=>p[0])),maxLa0=Math.max(...a.map(p=>p[0])),minLo=Math.min(...a.map(p=>p[1])),maxLo0=Math.max(...a.map(p=>p[1])); const maxLa=maxLa0===minLa?maxLa0+.0001:maxLa0,maxLo=maxLo0===minLo?maxLo0+.0001:maxLo0; x.strokeStyle='#173f2b';x.lineWidth=10;x.beginPath(); a.forEach((p,i)=>{const px=b.x+30+(p[1]-minLo)/(maxLo-minLo)*(b.w-60),py=b.y+b.h-30-(p[0]-minLa)/(maxLa-minLa)*(b.h-60);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke(); }
  if(o.photo) await new Promise(res=>{const im=new Image();im.onload=()=>{const r=Math.min(800/im.width,280/im.height),w=im.width*r,h=im.height*r;x.drawImage(im,50+(800-w)/2,780+(280-h)/2,w,h);res();};im.onerror=res;im.src=o.photo;});
  x.fillStyle='#182018';x.font='26px sans-serif'; if(o.note)x.fillText(o.note.slice(0,60),50,1070);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')), file=new File([blob],'CacciaTraccia.png',{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){try{return await navigator.share({title:'Passione Funghi e Caccia',text:`Percorso: ${(+o.distanceKm||0).toFixed(2)} km`,files:[file]});}catch(e){if(e.name==='AbortError')return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CacciaTraccia.png';a.click();
}
async function addDiary(){
  if(!['diaryZone','diaryGame','diaryType','diaryNotes'].some(id=>$(id).value.trim())&&!$('diaryPhoto').files[0])return toast('Inserisci una nota, una zona, una specie o una foto');
  let photo=null;try{const f=$('diaryPhoto').files[0];if(f)photo=await fileData(f)}catch(e){return toast(e.message)}
  const item={id:uniqueId(),date:$('diaryDate').value||localDay(),createdAt:new Date().toISOString(),zone:$('diaryZone').value.trim(),game:$('diaryGame').value.trim(),type:$('diaryType').value.trim(),notes:$('diaryNotes').value.trim(),photo};
  state.diary.unshift(item);try{save()}catch(e){state.diary=state.diary.filter(d=>d!==item);return toast('Memoria piena: nota non salvata. Esporta un backup.')}
  ['diaryZone','diaryGame','diaryType','diaryNotes','diaryPhoto'].forEach(id=>$(id).value='');
  toast('Nota salvata nel diario. Per un appostamento usa Segna punto sulla mappa.');
}
function renderDiary(){
  const el=$('historyList'); if(!el)return; const q=($('historySearch')?.value||'').toLowerCase();
  let rows=[];
  let pointRows=state.points||[];
  if(historyFilter==='sightings') pointRows=pointRows.filter(p=>p.type==='Avvistamento');
  if(historyFilter!=='diary') rows.push(...pointRows.filter(p=>!q||JSON.stringify(p).toLowerCase().includes(q)).map(p=>({kind:'point',ts:p.createdAt||p.huntDate,p})));
  if(historyFilter!=='sightings') rows.push(...state.diary.filter(d=>!q||JSON.stringify(d).toLowerCase().includes(q)).map(d=>({kind:'diary',ts:d.createdAt||d.date,d})));
  rows.sort((a,b)=>String(b.ts||'').localeCompare(String(a.ts||'')));
  el.innerHTML=rows.map(r=>r.kind==='point'?`<div class="item"><b>${esc(r.p.species||r.p.name||r.p.type)}</b><div class="meta">${esc(when(r.p.createdAt))}</div><div>${esc(r.p.huntDate||'')} · 💨 ${esc(r.p.windName||r.p.weather?.windName||'-')} ${r.p.windSpeed??r.p.weather?.windSpeed??'-'} km/h</div>${r.p.notes?`<div>${esc(r.p.notes)}</div>`:''}<div class="rowBtns"><button class="mini" onclick="CT.edit('${r.p.id}')">Apri</button><button class="mini red" onclick="CT.del('${r.p.id}')">🗑 Elimina</button></div></div>`:`<div class="item"><b>${esc(r.d.game||r.d.type||'Diario')}</b><div class="meta">${esc(r.d.date||'')} · ${esc(r.d.zone||'')}</div>${r.d.notes?`<div>${esc(r.d.notes)}</div>`:''}${r.d.photo?`<img class="photoPreview" src="${r.d.photo}">`:''}<div class="rowBtns"><button class="mini red" onclick="CT.delDiary('${r.d.id}')">Elimina nota</button></div></div>`).join('') || '<div class="empty">Diario vuoto.</div>';
}
function exportJSON(){ const b=new Blob([JSON.stringify({app:'Passione Funghi e Caccia',version:APP_VERSION,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`CacciaTraccia_backup_${localDay()}.json`;a.click(); }
function exportTXT(){ const t=state.points.map(p=>`${p.name||p.type}\nCoordinate: ${p.lat}, ${p.lng}\nData/ora: ${when(p.createdAt)}\nGiorno caccia: ${p.huntDate||'-'}\nUccelli: ${p.species||'-'}${p.quantity?' x '+p.quantity:''}\nVento: ${p.windName||p.weather?.windName||'-'} ${p.windDir||p.weather?.windDir||''} ${p.windSpeed??p.weather?.windSpeed??'-'} km/h\nNote: ${p.notes||'-'}\nGoogle Maps: https://www.google.com/maps?q=${p.lat},${p.lng}\n---`).join('\n'),b=new Blob([t||'Nessun punto salvato'],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='CacciaTraccia_coordinate.txt';a.click(); }
function snapshots(){ try{return JSON.parse(localStorage.getItem(SNAP_STORE)||'[]');}catch{return [];} }
function makeSnapshot(){ const arr=snapshots(); arr.unshift({id:uniqueId(),at:new Date().toISOString(),data:JSON.parse(JSON.stringify(state))}); localStorage.setItem(SNAP_STORE,JSON.stringify(arr.slice(0,25))); renderSnapshots(); toast('Versione di sicurezza creata'); }
function renderSnapshots(){ const el=$('snapshotsList'); if(!el)return; const arr=snapshots(); el.innerHTML=arr.length?arr.map((s,i)=>`<div class="item"><div class="itemTop"><b>${esc(when(s.at))}</b><button class="mini" onclick="CT.restoreSnap(${i})">Ripristina</button></div></div>`).join(''):'<div class="empty">Nessuna versione ancora.</div>'; }
function restoreSnap(i){ const s=snapshots()[i]; if(!s)return; if(!confirm('Ripristinare questa versione? I dati attuali saranno prima salvati in una nuova versione.'))return; makeSnapshot(); state={points:[],outings:[],diary:[],car:null,...s.data}; save(); toast('Versione ripristinata'); }
async function importBackupFile(file){ const previousState=state;try{ const raw=JSON.parse(await file.text()); const incoming=raw.data||raw;if(!incoming||typeof incoming!=='object'||!['points','outings','diary'].every(k=>Array.isArray(incoming[k]))||incoming.points.some(p=>!validCoords(p))||(incoming.car!=null&&!validCoords(incoming.car)))throw Error('Formato backup non valido'); const mode=$('importMode')?.value||'merge'; makeSnapshot(); if(mode==='replace') state={points:[],outings:[],diary:[],car:null,...incoming}; else { const merge=(a,b)=>{const m=new Map((a||[]).map(x=>[x.id||JSON.stringify(x),x]));(b||[]).forEach(x=>m.set(x.id||JSON.stringify(x),x));return [...m.values()];}; state={...state,...incoming,points:merge(state.points,incoming.points),outings:merge(state.outings,incoming.outings),diary:merge(state.diary,incoming.diary),car:incoming.car||state.car}; } save(); toast('Backup ripristinato'); }catch(e){state=previousState;toast('Backup non valido o memoria insufficiente: dati precedenti conservati');console.error(e);} }
async function persistStorage(){ if(!navigator.storage?.persist)return toast('Protezione memoria non disponibile'); const ok=await navigator.storage.persist(); toast(ok?'Archiviazione protetta':'Il telefono non ha concesso la protezione'); }
function renderAll(){ if(map){renderMarkers();renderCar();} renderPoints();renderOutings();renderDiary();renderSnapshots(); }
function showPage(n){ document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+n)); document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===n)); if(n==='map')setTimeout(()=>map.invalidateSize(),100); }
function fitPoints(){const points=state.points.filter(pointMatchesMode);if(!points.length)return toast('Nessun punto salvato in questa modalità');map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])),{padding:[30,30]});}
async function saveMapPointQuick(){
  if(!map)return toast('Mappa non pronta');
  try{map.stop?.()}catch{}
  follow=false;$('followBtn')?.classList.remove('active');

  let lat,lng,w=null;
  const card=$('selectedCard');
  const hasSelected=selected&&card&&!card.classList.contains('hidden')&&Number.isFinite(+selected.lat)&&Number.isFinite(+selected.lng);
  if(hasSelected){lat=+selected.lat;lng=+selected.lng;w=selected.weather||null;}
  else{
    const c=map.getCenter();lat=c.lat;lng=c.lng;
    selected={lat,lng,weather:null};
  }

  if(navigator.onLine&&!w){
    try{w=await weather(lat,lng)||null}catch(e){console.warn('Meteo punto mappa',e)}
  }

  const item={
    id:uniqueId(),lat,lng,type:'Postazione',name:'Punto GPS',
    huntDate:localDay(),species:'',quantity:0,notes:'',
    weather:w||null,photo:null,createdAt:new Date().toISOString(),
    windName:w?.windName||'',windDir:w?.windDir||'',windDeg:w?.windDeg!=null&&Number.isFinite(+w.windDeg)?+w.windDeg:null,
    windSpeed:w?.windSpeed!=null&&Number.isFinite(+w.windSpeed)?+w.windSpeed:null,windGust:w?.windGust!=null&&Number.isFinite(+w.windGust)?+w.windGust:null
  };
  state.points.unshift(item);save();renderMarkers();
  toast('Punto fissato sulla mappa');
}
function bind(){
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $('locateBtn').onclick=locate; $('followBtn').onclick=toggleFollow; map?.on('dragstart',()=>{if(selected)clearSelected();});
  $('northBtn').onclick=toggleNorthLock;
  $('layersBtn').onclick=()=>$('layerPanel').classList.toggle('hidden'); document.querySelectorAll('.layerChoice').forEach(b=>b.onclick=()=>{setLayer(b.dataset.basemap);$('layerPanel').classList.add('hidden');});
  $('clearSelectedBtn').onclick=clearSelected; $('savePointBtn').onclick=()=>fillModal(null); $('navigateBtn').onclick=navigateSelected; $('shareSelectedBtn').onclick=shareSelected; $('weatherRefreshBtn').onclick=()=>selected&&weather(selected.lat,selected.lng);
  $('selectedSightingBtn').onclick=()=>openSelectedObservation(false); $('selectedMushroomBtn').onclick=()=>openSelectedObservation(true); $('quickSaveHereBtn').onclick=saveMapPointQuick; $('quickSightingBtn').onclick=()=>openSelectedObservation(false); $('quickTrackBtn').onclick=startTrack; $('quickCarBtn').onclick=parkCar;
  $('parkHereBtn').onclick=parkCar; $('moveCarBtn').onclick=moveCar; $('returnCarBtn').onclick=carReturn; $('clearCarBtn').onclick=()=>{state.car=null;save();};
  $('fitPointsBtn').onclick=fitPoints; $('startTrackBtn').onclick=startTrack; $('stopTrackBtn').onclick=stopTrack; $('centerTrackBtn').onclick=()=>track.coords.length&&map.fitBounds(L.latLngBounds(track.coords),{padding:[30,30]}); $('trackToCarBtn').onclick=()=>{showPage('map');carReturn();};
  $('confirmPointBtn').onclick=savePoint; $('pointReadWeatherBtn').onclick=async()=>{if(selected){await weather(selected.lat,selected.lng);const w=selected.weather||{};$('pointWindName').value=w.windName||'';$('pointWindDir').value=w.windDir||'';$('pointWindSpeed').value=w.windSpeed??'';$('pointWindGust').value=w.windGust??'';$('pointWeatherSummary').textContent=`${w.condition||''} · ${w.windName||''} ${w.windSpeed||''} km/h`;}};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('pointModal').classList.remove('open'));
  $('addDiaryBtn').onclick=addDiary; $('historySearch').oninput=renderDiary; document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{historyFilter=b.dataset.history;document.querySelectorAll('[data-history]').forEach(x=>x.classList.toggle('active',x===b));renderDiary();});
  $('exportJsonBtn').onclick=exportJSON; $('exportTxtBtn').onclick=exportTXT; $('makeSnapshotBtn').onclick=makeSnapshot; $('persistBtn').onclick=persistStorage; $('importBackup').onchange=e=>{const f=e.target.files?.[0];if(f)importBackupFile(f);e.target.value='';};
  $('mapSearch').addEventListener('keydown',e=>{if(e.key==='Enter')$('searchBtn').click();}); $('searchBtn').onclick=()=>{const m=$('mapSearch').value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);if(m){const lat=+m[1],lng=+m[2];map.setView([lat,lng],16);selectMapPoint(lat,lng);}else toast('Inserisci coordinate, es. 41.45, 15.55');};
  $('diaryDate').value=localDay();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false;}); $('installBtn').onclick=async()=>{if(!installPrompt)return toast('Usa il menu del browser > Aggiungi a schermata Home');installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true;};
  const net=()=>{$('netPill').textContent=navigator.onLine?'● online':'● offline';$('netPill').classList.toggle('soft',!navigator.onLine);}; window.addEventListener('online',net);window.addEventListener('offline',net);net();
}
function confirmPointDeletion(point){
 if(document.getElementById('pfcDeletePointDialog'))return Promise.resolve(false);
 return new Promise(resolve=>{
  const previous=document.activeElement,overlay=document.createElement('div');
  overlay.id='pfcDeletePointDialog';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','pfcDeletePointTitle');
  overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0008;display:grid;place-items:center;padding:22px';
  const box=document.createElement('div');box.style.cssText='background:white;color:#173f2b;border-radius:20px;padding:24px;width:100%;max-width:380px;box-sizing:border-box;font:16px/1.5 system-ui';
  const title=document.createElement('h2');title.id='pfcDeletePointTitle';title.textContent=point.type==='Avvistamento'?'Eliminare questo avvistamento?':'Eliminare questo punto?';title.style.fontSize='21px';
  const name=document.createElement('p');name.textContent=(point.species||point.name||point.type||'Punto salvato')+(point.huntDate?' · '+point.huntDate:'');
  const note=document.createElement('p');note.textContent='Verrà rimosso dalla mappa e dalle liste dei punti salvati.';
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px';
  const cancel=document.createElement('button'),remove=document.createElement('button');cancel.type=remove.type='button';cancel.textContent='Annulla';remove.textContent='Elimina';remove.dataset.confirmDelete='true';cancel.dataset.cancelDelete='true';
  cancel.style.cssText=remove.style.cssText='flex:1;border:0;border-radius:12px;padding:13px;font:inherit;font-weight:700';remove.style.background='#ad2525';remove.style.color='white';cancel.style.background='#e9eee9';
  function finish(confirmed){document.removeEventListener('keydown',keydown);overlay.remove();previous?.focus?.();resolve(confirmed);}
  function keydown(event){if(event.key==='Escape'){event.preventDefault();finish(false);}if(event.key==='Tab'){event.preventDefault();(document.activeElement===cancel?remove:cancel).focus();}}
  cancel.onclick=()=>finish(false);remove.onclick=()=>finish(true);overlay.onclick=event=>{if(event.target===overlay)finish(false);};
  actions.append(cancel,remove);box.append(title,name,note,actions);overlay.append(box);document.body.append(overlay);document.addEventListener('keydown',keydown);cancel.focus();
 });
}
async function deleteSavedPoint(id){
 const point=state.points.find(p=>String(p.id)===String(id));
 if(!point){toast('Punto già rimosso');return false;}
 if(!await confirmPointDeletion(point))return false;
 const remaining=state.points.filter(p=>String(p.id)!==String(id));
 const beforeReceipts=localStorage.getItem(POINT_DELETIONS_KEY);
 try{
   const receipts=pointDeletionList().filter(x=>x.id!==String(id));
   receipts.push({id:String(id),deletedAt:new Date().toISOString()});
   localStorage.setItem(POINT_DELETIONS_KEY,JSON.stringify(receipts));
   localStorage.setItem(STORE,JSON.stringify({...state,points:remaining}));
 }catch(error){
   try{if(beforeReceipts==null)localStorage.removeItem(POINT_DELETIONS_KEY);else localStorage.setItem(POINT_DELETIONS_KEY,beforeReceipts);}catch{}
   console.error('Cancellazione punto',error);
   toast('Impossibile salvare la cancellazione. Il punto è stato conservato.');return false;
 }
 state.points=remaining;
 if(String(editing)===String(id)){editing=null;$('pointModal')?.classList.remove('open');}
 if(selected&&Math.abs(selected.lat-point.lat)<1e-7&&Math.abs(selected.lng-point.lng)<1e-7){selected=null;$('selectedCard')?.classList.add('hidden');}
 for(const render of [renderMarkers,renderPoints,renderDiary])try{render();}catch(error){console.error('Aggiornamento punti',error);}
 window.dispatchEvent(new CustomEvent('pfc:point-deleted',{detail:{id:point.id}}));
 toast(point.type==='Avvistamento'?'Avvistamento eliminato':'Punto eliminato');return true;
}

window.CT={
  delDiary:async id=>{const item=state.diary.find(d=>d.id===id);if(!item||!await confirmPointDeletion({name:item.game||item.zone||'Nota del diario'}))return false;const previous=state.diary;state.diary=previous.filter(d=>d.id!==id);try{save()}catch(e){state.diary=previous;toast('Eliminazione non salvata: memoria non disponibile');return false}return true;},
  go:id=>{const p=state.points.find(x=>x.id===id);if(p){showPage('map');map.setView([p.lat,p.lng],16);selectMapPoint(p.lat,p.lng);}},
  edit:id=>{const p=state.points.find(x=>x.id===id);if(p)fillModal(p);},
  del:deleteSavedPoint,
  sharePoint:id=>{const p=state.points.find(x=>x.id===id);if(p)shareText(pointShareText(p),p.name||'Passione Funghi e Caccia');},
  out:id=>{const o=state.outings.find(x=>x.id===id);if(o?.coords?.length){showPage('map');const l=L.polyline(o.coords,{color:'#7b4d19',weight:4});l.addTo(map);map.fitBounds(l.getBounds());setTimeout(()=>map.removeLayer(l),20000);}},
  share:shareOut,
  delOut:id=>{if(confirm('Eliminare questa uscita?')){state.outings=state.outings.filter(x=>x.id!==id);save();}},
  restoreSnap
};
window.__PFC_BOOT_READY__=(async()=>{
  try{
    window.PFC_OFFLINE?.register();
    ensureModalActions(); await ensureLeaflet(); initMap(); bind();
  }catch(e){ console.error(e); const m=document.getElementById('map'); if(m)m.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore mappa: ${esc(e.message)}. Ricarica una volta con Internet attivo.</div>`; throw e; }
})();

// V6.0.1 - ricerca luoghi, controlli mappa visibili, fonte/sito meteo configurabili
(function(){
  const css=document.createElement('style');
  css.textContent=`
    .mapQuickActions{margin:10px 0 14px!important;position:relative!important;z-index:2!important}
    .mapWrap{margin-bottom:0!important;overflow:visible!important}
    .mapTools{z-index:1105!important;pointer-events:auto!important}
    .mapTools.left{left:12px!important;top:112px!important}
    .mapTools.right{right:12px!important;top:12px!important}
    .mapBtn{position:relative!important;z-index:1106!important;pointer-events:auto!important}
    .gpsBadge{z-index:1104!important}.layerPanel{z-index:1110!important}
    #map .leaflet-control-container{z-index:900!important}
    @media(max-width:520px){#map{height:48vh!important;min-height:340px!important;max-height:620px!important}.mapQuickActions{margin:10px 0 14px!important}.mapTools.left{top:110px!important}}
    .ctSearchResults{display:grid;gap:7px;margin:8px 0 12px;padding:8px;background:#fffef9;border:1px solid var(--line,#d7d8d0);border-radius:14px;box-shadow:0 4px 16px #0001}
    .ctSearchResults.hidden{display:none!important}.ctSearchTitle{font-size:12px;font-weight:800;color:#687069;padding:2px 3px}
    .ctSearchResult{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:center;width:100%;border:1px solid #d7d8d0;background:#fff;border-radius:11px;padding:8px;text-align:left;color:#192119}
    .ctSearchResult:active{background:#edf4ee}.ctSearchNum{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#173f2b;color:#fff;font-weight:900}.ctSearchLabel{font-size:13px;line-height:1.25}.ctSearchSub{display:block;font-size:11px;color:#687069;margin-top:2px}
    .ctWeatherSettings{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 10px;padding:10px;background:#f4f7f1;border:1px solid #d7d8d0;border-radius:12px}
    .ctWeatherSettings label{font-size:11px;margin-bottom:3px}.ctWeatherSettings .full{grid-column:1/-1}.ctWeatherSettings button{width:100%}.ctWeatherNote{font-size:10px;color:#687069;margin-top:4px}
    @media(max-width:520px){.ctWeatherSettings{grid-template-columns:1fr}.ctWeatherSettings .full{grid-column:1}}
  `;
  document.head.appendChild(css);

  // ---------- ricerca località / indirizzi ----------
  function resultsBox(){
    let box=document.getElementById('ctSearchResults');
    if(!box){box=document.createElement('div');box.id='ctSearchResults';box.className='ctSearchResults hidden';document.querySelector('.searchRow')?.insertAdjacentElement('afterend',box)}
    return box;
  }
  function shortLabel(r){const a=r.address||{},main=a.road||a.pedestrian||a.hamlet||a.village||a.town||a.city||a.municipality||r.name||'Luogo',num=a.house_number?` ${a.house_number}`:'',city=a.city||a.town||a.village||a.municipality||'',prov=a.province||a.county||a.state||'';return {main:`${main}${num}`,sub:[city,prov].filter(Boolean).join(' · ')||r.display_name}}
  function showResults(items){
    const box=resultsBox();
    if(!items.length){box.classList.remove('hidden');box.innerHTML='<div class="ctSearchTitle">Nessun posto trovato. Prova ad aggiungere città, provincia o numero civico.</div>';return}
    box.classList.remove('hidden');box.innerHTML='<div class="ctSearchTitle">Scegli il posto trovato:</div>'+items.map((r,i)=>{const l=shortLabel(r);return `<button class="ctSearchResult" data-i="${i}"><span class="ctSearchNum">${i+1}</span><span class="ctSearchLabel">${esc(l.main)}<span class="ctSearchSub">${esc(l.sub)}</span></span></button>`}).join('');
    box.querySelectorAll('.ctSearchResult').forEach(b=>b.onclick=()=>{const r=items[+b.dataset.i],lat=+r.lat,lng=+r.lon;$('mapSearch').value=r.display_name||$('mapSearch').value;box.classList.add('hidden');showPage('map');map.setView([lat,lng],17,{animate:true});selectMapPoint(lat,lng)})
  }
  async function geocode(q,italyOnly=true){const p=new URLSearchParams({format:'jsonv2',limit:'6',addressdetails:'1','accept-language':'it',q});if(italyOnly)p.set('countrycodes','it');const r=await fetch('https://nominatim.openstreetmap.org/search?'+p.toString(),{headers:{Accept:'application/json'}});if(!r.ok)throw Error('Ricerca luoghi non disponibile');return r.json()}
  async function searchPlace(){
    const q=$('mapSearch').value.trim();if(!q)return toast('Scrivi una città, un posto, una via o delle coordinate');
    const m=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(m){const lat=+m[1],lng=+m[2];resultsBox().classList.add('hidden');map.setView([lat,lng],17);selectMapPoint(lat,lng);return}
    const box=resultsBox();box.classList.remove('hidden');box.innerHTML='<div class="ctSearchTitle">🔎 Cerco “'+esc(q)+'”…</div>';
    try{let items=await geocode(q,true);if(!items.length)items=await geocode(q,false);showResults(items)}catch(e){box.innerHTML='<div class="ctSearchTitle">'+esc(e.message||'Errore ricerca')+'</div>'}
  }

  // ---------- fonte/modello meteo ----------
  const WEATHER_KEY='cacciatraccia-weather-v2',defaults={model:'best_match',site:'openmeteo',custom:''};
  let weatherCfg=defaults;try{weatherCfg={...defaults,...JSON.parse(localStorage.getItem(WEATHER_KEY)||'{}')}}catch{}
  const saveWeatherCfg=()=>localStorage.setItem(WEATHER_KEY,JSON.stringify(weatherCfg));
  if(!window.__ctWeatherFetchPatched){
    window.__ctWeatherFetchPatched=true;const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{try{const raw=typeof input==='string'?input:input?.url;if(raw&&raw.includes('api.open-meteo.com/v1/forecast')){const u=new URL(raw,location.href);if(weatherCfg.model&&weatherCfg.model!=='best_match')u.searchParams.set('models',weatherCfg.model);else u.searchParams.delete('models');input=typeof input==='string'?u.toString():new Request(u.toString(),input)}}catch(e){console.warn('Weather model patch',e)}return nativeFetch(input,init)};
  }
  function currentMapCenter(){try{const c=map?.getCenter?.();if(c)return {lat:c.lat,lng:c.lng}}catch{}return {lat:41.46,lng:15.55}}
  function openWeatherSite(){window.open('https://open-meteo.com/','_blank','noopener');return;const {lat,lng}=currentMapCenter();let url='';if(weatherCfg.site==='windy')url=`https://www.windy.com/?${lat.toFixed(5)},${lng.toFixed(5)},10`;else if(weatherCfg.site==='meteoam')url='https://www.meteoam.it/it/home';else if(weatherCfg.site==='3bmeteo')url='https://www.3bmeteo.com/';else if(weatherCfg.site==='custom'){url=(weatherCfg.custom||'').trim();if(!url)return toast('Inserisci prima il sito meteo personalizzato');if(!/^https?:\/\//i.test(url))url='https://'+url}if(url)window.open(url,'_blank','noopener')}
  function initWeatherSettingsUI(){
    if(document.getElementById('ctWeatherSettings'))return;const body=$('weatherBody'),card=body?.closest('.card');if(!card)return;
    const box=document.createElement('div');box.id='ctWeatherSettings';box.className='ctWeatherSettings';box.innerHTML=`
      <div><label>Fonte meteo</label><select id="ctWeatherModel" disabled><option value="best_match">Open-Meteo · gratuito</option></select><div class="ctWeatherNote">Open-Meteo · previsioni gratuite per uso personale, aggiornate online.</div></div>
      <div><label>Bollettino ufficiale</label><select id="ctWeatherSite" disabled><option value="openmeteo">Open-Meteo</option></select></div>
      <div class="full" id="ctWeatherCustomWrap" style="display:none"><label>Indirizzo del sito meteo</label><input id="ctWeatherCustom" type="url" placeholder="https://www.miositometeo.it"></div>
      <div class="full"><button id="ctOpenWeatherSite" class="secondary">🌦 Apri Open-Meteo</button></div>`;
    body.insertAdjacentElement('beforebegin',box);
    const model=$('ctWeatherModel'),site=$('ctWeatherSite'),custom=$('ctWeatherCustom'),wrap=$('ctWeatherCustomWrap');model.value=weatherCfg.model;site.value=weatherCfg.site;custom.value=weatherCfg.custom||'';const syncCustom=()=>wrap.style.display=site.value==='custom'?'block':'none';syncCustom();
    model.onchange=()=>{weatherCfg.model=model.value;saveWeatherCfg();toast('Fonte meteo aggiornata');if(selected)weather(selected.lat,selected.lng)};site.onchange=()=>{weatherCfg.site=site.value;saveWeatherCfg();syncCustom()};custom.onchange=()=>{weatherCfg.custom=custom.value.trim();saveWeatherCfg()};$('ctOpenWeatherSite').onclick=openWeatherSite;
  }

  const previousBind=bind;
  bind=function(){previousBind();resultsBox();$('mapSearch').placeholder='Cerca città, località, via e numero civico';$('searchBtn').onclick=searchPlace;initWeatherSettingsUI()};
})();

// V6.0.2 - condivisione app + invito WhatsApp/email predisposto per gruppo cloud
(function(){
  const SHARE_KEY='cacciatraccia-share-v1';
  function cleanAppUrl(){
    const u=new URL(location.href);
    u.search='';u.hash='';
    if(u.pathname.endsWith('/v5.html'))u.pathname=u.pathname.replace(/v5\.html$/,'');
    return u.toString();
  }
  async function shareOrCopy(title,text,url){
    try{if(navigator.share){await navigator.share({title,text,url});return true}}catch(e){if(e?.name==='AbortError')return false}
    const full=[text,url].filter(Boolean).join('\n');
    try{await navigator.clipboard.writeText(full);toast('Link copiato negli appunti');return true}catch{}
    prompt('Copia e condividi questo link',full);return true;
  }
  function cloudInviteUrl(){
    try{const j=JSON.parse(localStorage.getItem(SHARE_KEY)||'{}');if(j.inviteUrl)return j.inviteUrl}catch{}
    return cleanAppUrl()+'?join=1';
  }
  async function shareApp(){
    await shareOrCopy('Passione Funghi e Caccia','Prova Passione Funghi e Caccia: GPS, appostamenti, meteo, diario e percorsi.',cleanAppUrl());
  }
  function whatsappInvite(){
    const url=cloudInviteUrl();
    const text=`Ti invito su Passione Funghi e Caccia. Apri questo link per registrarti e unirti al mio gruppo:\n${url}`;
    location.href='https://wa.me/?text='+encodeURIComponent(text);
  }
  async function emailInvite(){
    const url=cloudInviteUrl();
    const subject='Invito Passione Funghi e Caccia';
    const body=`Ti invito su Passione Funghi e Caccia.\nApri questo link per registrarti e unirti al mio gruppo:\n${url}`;
    location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function initShareInviteUI(){
    if(document.getElementById('ctShareInviteBox'))return;
    const cloud=$('cloudStatus')?.closest('.card');
    if(!cloud)return;
    const box=document.createElement('div');
    box.id='ctShareInviteBox';
    box.className='card';
    box.innerHTML=`<div class="sectionHead"><h3>👥 Condividi e invita</h3><span class="pill soft">beta</span></div>
      <p class="note">Condividi l'app per farla provare. Gli inviti al gruppo sono già predisposti per e-mail e WhatsApp; quando colleghiamo il cloud separato, ogni link sarà personale e collegherà l'invitato al tuo gruppo.</p>
      <div class="actionGrid">
        <button id="ctShareAppBtn" class="primary">↗ Condividi app per test</button>
        <button id="ctInviteWhatsAppBtn" class="secondary">🟢 Invita su WhatsApp</button>
        <button id="ctInviteEmailBtn" class="secondary">✉️ Invita via e-mail</button>
        <button id="ctMembersBtn" class="secondary" disabled>👥 Membri del gruppo</button>
      </div>`;
    cloud.insertAdjacentElement('beforebegin',box);
    $('ctShareAppBtn').onclick=shareApp;
    $('ctInviteWhatsAppBtn').onclick=whatsappInvite;
    $('ctInviteEmailBtn').onclick=emailInvite;
  }
  const prevBind=bind;
  bind=function(){prevBind();initShareInviteUI()};
})();

// V6.0.3 - recupero uscita interrotta + installazione facilitata
(function(){
  const ACTIVE_TRACK_KEY='cacciatraccia-active-track-v1';
  function persistActiveTrack(){
    try{
      if(!track?.active || !track.coords?.length)return;
      localStorage.setItem(ACTIVE_TRACK_KEY,JSON.stringify({start:track.start,coords:track.coords,km:track.km,savedAt:Date.now(),note:$('trackNote')?.value||''}));
    }catch(e){console.warn('Salvataggio percorso attivo',e)}
  }
  function recoveredTrack(){try{return JSON.parse(localStorage.getItem(ACTIVE_TRACK_KEY)||'null')}catch{return null}}
  function clearRecovered(){localStorage.removeItem(ACTIVE_TRACK_KEY);document.getElementById('ctRecoveredTrack')?.remove()}
  const originalTrackUI=trackUI;
  trackUI=function(){originalTrackUI();persistActiveTrack()};
  const originalStartTrack=startTrack;
  startTrack=function(){clearRecovered();originalStartTrack();setTimeout(persistActiveTrack,300)};
  const originalStopTrack=stopTrack;
  stopTrack=async function(){const saved=await originalStopTrack();if(saved)clearRecovered();return saved};
  function resumeRecovered(){
    const r=recoveredTrack();if(!r?.coords?.length)return toast('Nessun percorso da recuperare');
    originalStartTrack();
    try{
      track.start=r.start||Date.now();track.coords=r.coords||[];track.km=+r.km||0;track.line?.setLatLngs(track.coords);if($('trackNote')&&!$('trackNote').value)$('trackNote').value=r.note||'';trackUI();
      if(track.coords.length)map.fitBounds(L.latLngBounds(track.coords),{padding:[30,30]});
      toast('Percorso recuperato e ripreso');
    }catch(e){console.error(e);toast('Errore nel recupero del percorso')}
    document.getElementById('ctRecoveredTrack')?.remove();
  }
  function saveRecovered(){
    const r=recoveredTrack();if(!r?.coords?.length)return toast('Nessun percorso da recuperare');
    state.outings.unshift({id:uniqueId(),start:new Date(r.start||Date.now()).toISOString(),end:new Date(r.savedAt||Date.now()).toISOString(),distanceKm:+r.km||0,coords:r.coords,photo:null,note:(r.note||'')+(r.note?' · ':'')+'uscita recuperata automaticamente'});
    clearRecovered();save();toast('Uscita recuperata e salvata');
  }
  function showRecovery(){
    const r=recoveredTrack();if(!r?.coords?.length)return;
    if(Date.now()-(r.savedAt||0)>1000*60*60*24*3){clearRecovered();return}
    const page=$('page-track');if(!page||document.getElementById('ctRecoveredTrack'))return;
    const card=document.createElement('div');card.id='ctRecoveredTrack';card.className='card';
    card.innerHTML=`<div class="sectionHead"><h3>⚠️ Uscita interrotta trovata</h3><span class="pill soft">${(+r.km||0).toFixed(2)} km</span></div><p class="note">Ho conservato ${r.coords.length} punti GPS dell'ultima uscita non terminata.</p><div class="actionGrid"><button id="ctResumeTrack" class="primary">▶ Riprendi</button><button id="ctSaveRecovered" class="secondary">💾 Salva così</button><button id="ctDiscardRecovered" class="danger">Scarta</button></div>`;
    page.insertAdjacentElement('afterbegin',card);
    $('ctResumeTrack').onclick=resumeRecovered;$('ctSaveRecovered').onclick=saveRecovered;$('ctDiscardRecovered').onclick=()=>{if(confirm('Scartare il percorso recuperato?')){clearRecovered();toast('Percorso recuperato scartato')}};
  }
  function addInstallButton(){
    const grid=document.querySelector('#ctShareInviteBox .actionGrid');if(!grid||document.getElementById('ctInstallAppBtn'))return;
    const b=document.createElement('button');b.id='ctInstallAppBtn';b.className='secondary';b.textContent='📲 Installa sul telefono';grid.appendChild(b);
    b.onclick=async()=>{
      if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn')&&($('installBtn').hidden=true);return}
      toast('Dal menu del browser scegli “Aggiungi a schermata Home” o “Installa app”');
    };
  }
  const prevBind=bind;
  bind=function(){prevBind();showRecovery();addInstallButton();document.addEventListener('visibilitychange',()=>{if(document.hidden)persistActiveTrack()});window.addEventListener('pagehide',persistActiveTrack)};
})();

// V6.0.4 - stabilita test: wake lock, aggiornamento, diagnostica, versione
(function(){
  let ctWakeLock=null;
  async function requestWakeLock(){
    try{
      if(!('wakeLock' in navigator) || document.hidden || !track?.active)return;
      ctWakeLock=await navigator.wakeLock.request('screen');
      ctWakeLock.addEventListener('release',()=>{ctWakeLock=null});
    }catch(e){console.warn('Wake lock non disponibile',e)}
  }
  async function releaseWakeLock(){try{await ctWakeLock?.release()}catch{}ctWakeLock=null}
  const prevStart=startTrack;
  startTrack=function(){const r=prevStart();setTimeout(requestWakeLock,250);return r};
  const prevStop=stopTrack;
  stopTrack=async function(){const r=await prevStop();await releaseWakeLock();return r};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&track?.active)requestWakeLock()});

  function versionBadge(){
    if(document.getElementById('ctVersionBadge'))return;
    const h=document.querySelector('.brand small');if(!h)return;
    const s=document.createElement('span');s.id='ctVersionBadge';s.style.cssText='margin-left:6px;opacity:.75;font-weight:800';s.textContent='• V6.0.4';h.appendChild(s);
  }
  async function forceUpdate(){
    toast('Controllo aggiornamenti…');
    try{
      if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update().catch(()=>{})))}
      const names=await caches.keys();
      await Promise.all(names.filter(n=>n.startsWith('cacciatraccia-')).map(n=>caches.delete(n)));
    }catch(e){console.warn('Aggiornamento cache',e)}
    setTimeout(()=>location.replace(location.pathname+'?v=604&t='+Date.now()),350);
  }
  async function diagnostic(){
    const lines=[];
    lines.push('Passione Funghi e Caccia V6.0.4');
    lines.push('Rete: '+(navigator.onLine?'online':'offline'));
    lines.push('Mappa: '+(window.L&&map?'OK':'non pronta'));
    lines.push('Memoria locale: '+(()=>{try{localStorage.setItem('__ct_test','1');localStorage.removeItem('__ct_test');return 'OK'}catch{return 'errore'}})());
    lines.push('Service Worker: '+('serviceWorker' in navigator?(navigator.serviceWorker.controller?'attivo':'disponibile'):'non disponibile'));
    lines.push('Installazione: '+(('BeforeInstallPromptEvent' in window||installPrompt)?'disponibile quando supportata':'dipende dal browser'));
    if(navigator.permissions?.query){try{const p=await navigator.permissions.query({name:'geolocation'});lines.push('Permesso GPS: '+p.state)}catch{lines.push('Permesso GPS: da verificare')}}
    else lines.push('Permesso GPS: da verificare');
    if(lastPos)lines.push(`Ultimo GPS: ±${lastPos.acc||'?'} m`);else lines.push('Ultimo GPS: non ancora ricevuto');
    const text=lines.join('\n');
    alert(text);
    try{await navigator.clipboard.writeText(text)}catch{}
  }
  function addTestTools(){
    const grid=document.querySelector('#ctShareInviteBox .actionGrid');if(!grid)return;
    if(!document.getElementById('ctUpdateBtn')){const b=document.createElement('button');b.id='ctUpdateBtn';b.className='secondary';b.textContent='🔄 Controlla aggiornamenti';b.onclick=forceUpdate;grid.appendChild(b)}
    if(!document.getElementById('ctDiagnosticBtn')){const b=document.createElement('button');b.id='ctDiagnosticBtn';b.className='secondary';b.textContent='🩺 Diagnostica rapida';b.onclick=diagnostic;grid.appendChild(b)}
  }
  const prevBind=bind;
  bind=function(){prevBind();versionBadge();addTestTools()};
})();

// V6.1.0 - livello Venti separato con animazione e dati Open-Meteo
(function(){
  const WIND_CACHE='meteoam-cacciatraccia-wind-grid-v1';
  let windMode=false,windCanvas=null,windCtx=null,windParticles=[],windPoints=[],windAnim=0,windTimer=null,windLastLoad=0,windLoading=false;

  function ensureWindUI(){
    const panel=$('layerPanel');
    if(panel&&!panel.querySelector('[data-basemap="wind"]')){
      const b=document.createElement('button');b.dataset.basemap='wind';b.className='layerChoice';b.textContent='💨 Venti';panel.appendChild(b);
    }
    const wrap=document.querySelector('.mapWrap');
    if(wrap&&!document.getElementById('ctWindHud')){
      const hud=document.createElement('div');hud.id='ctWindHud';hud.style.cssText='display:none;position:absolute;left:50%;transform:translateX(-50%);top:12px;z-index:1120;background:#102f4ddd;color:#fff;padding:7px 11px;border-radius:999px;font:800 12px/1.2 system-ui;box-shadow:0 3px 12px #0004;pointer-events:none;white-space:nowrap';hud.textContent='💨 Venti';wrap.appendChild(hud);
      const legend=document.createElement('div');legend.id='ctWindLegend';legend.style.cssText='display:none;position:absolute;left:10px;bottom:10px;z-index:1120;background:#fffefeee;color:#173f2b;padding:7px 9px;border-radius:10px;font:700 11px/1.2 system-ui;box-shadow:0 2px 10px #0003;pointer-events:none';legend.innerHTML='💨 Vento <span style="opacity:.7">km/h</span><br><span style="font-weight:600;opacity:.75">particelle = direzione</span>';wrap.appendChild(legend);
    }
  }

  function ensureWindCanvas(){
    if(windCanvas)return;
    const host=$('map');if(!host)return;
    windCanvas=document.createElement('canvas');windCanvas.id='ctWindCanvas';windCanvas.style.cssText='position:absolute;inset:0;z-index:650;pointer-events:none;width:100%;height:100%;';host.appendChild(windCanvas);windCtx=windCanvas.getContext('2d');resizeWindCanvas();
  }
  function resizeWindCanvas(){
    if(!windCanvas||!map)return;const s=map.getSize(),d=Math.min(2,window.devicePixelRatio||1);windCanvas.width=Math.max(1,Math.round(s.x*d));windCanvas.height=Math.max(1,Math.round(s.y*d));windCanvas.style.width=s.x+'px';windCanvas.style.height=s.y+'px';windCtx?.setTransform(d,0,0,d,0,0);seedParticles();
  }
  function seedParticles(){
    if(!map)return;const s=map.getSize(),n=Math.max(70,Math.min(180,Math.round((s.x*s.y)/3200)));windParticles=Array.from({length:n},()=>({x:Math.random()*s.x,y:Math.random()*s.y,age:Math.random()*100,max:70+Math.random()*90}));
  }
  function nearestWind(lat,lng){
    if(!windPoints.length)return null;let best=null,bd=Infinity;for(const p of windPoints){const d=(p.lat-lat)**2+(p.lng-lng)**2;if(d<bd){bd=d;best=p}}return best;
  }
  function windVectorAt(x,y){
    if(!map||!windPoints.length)return null;const ll=map.containerPointToLatLng([x,y]),p=nearestWind(ll.lat,ll.lng);if(!p)return null;const to=((+p.dir||0)+180)*Math.PI/180;const speed=Math.max(0,+p.speed||0),scale=.18+Math.min(1.45,speed/17);return {dx:Math.sin(to)*scale,dy:-Math.cos(to)*scale,speed,dir:p.dir};
  }
  function strokeForSpeed(s){return s>=45?'rgba(255,95,70,.95)':s>=30?'rgba(255,190,70,.95)':s>=15?'rgba(180,245,120,.95)':'rgba(235,250,255,.95)'}
  function drawWind(){
    if(!windMode||!windCtx||!map)return;const s=map.getSize();windCtx.clearRect(0,0,s.x,s.y);windCtx.fillStyle='rgba(20,80,145,.10)';windCtx.fillRect(0,0,s.x,s.y);
    windCtx.lineCap='round';windCtx.lineWidth=1.8;
    for(const p of windParticles){const v=windVectorAt(p.x,p.y);if(!v||p.age++>p.max||p.x<0||p.y<0||p.x>s.x||p.y>s.y){p.x=Math.random()*s.x;p.y=Math.random()*s.y;p.age=0;p.max=70+Math.random()*90;continue}const ox=p.x,oy=p.y;p.x+=v.dx;p.y+=v.dy;windCtx.strokeStyle=strokeForSpeed(v.speed);windCtx.beginPath();windCtx.moveTo(ox,oy);windCtx.lineTo(p.x+v.dx*4,p.y+v.dy*4);windCtx.stroke()}
    windAnim=requestAnimationFrame(drawWind);
  }
  function stopWindAnimation(){if(windAnim)cancelAnimationFrame(windAnim);windAnim=0;if(windCtx&&map){const s=map.getSize();windCtx.clearRect(0,0,s.x,s.y)}}

  function gridForBounds(){
    const b=map.getBounds(),rows=5,cols=5,out=[];for(let y=0;y<rows;y++){const lat=b.getSouth()+(b.getNorth()-b.getSouth())*(y/(rows-1));for(let x=0;x<cols;x++){const lng=b.getWest()+(b.getEast()-b.getWest())*(x/(cols-1));out.push({lat,lng})}}return out;
  }
  function saveWindCache(){try{localStorage.setItem(WIND_CACHE,JSON.stringify({at:Date.now(),points:windPoints}))}catch{}}
  function loadWindCache(){try{const c=JSON.parse(localStorage.getItem(WIND_CACHE)||'null');if(c?.points?.length){windPoints=c.points;return c}}catch{}return null}
  function updateWindHud(label){const h=$('ctWindHud');if(h){h.style.display=windMode?'block':'none';h.textContent=label||'💨 Venti'}const l=$('ctWindLegend');if(l)l.style.display=windMode?'block':'none'}
  function centerWindLabel(){
    if(!map||!windPoints.length)return '💨 Venti';const c=map.getCenter(),p=nearestWind(c.lat,c.lng);if(!p)return '💨 Venti';return `💨 ${wname(p.dir)} ${Math.round(p.speed||0)} km/h${p.gust!=null?' · raff. '+Math.round(p.gust)+' km/h':''}`;
  }
  async function loadWindGrid(force=false){
    if(!windMode||!map||windLoading)return;const now=Date.now();if(!force&&now-windLastLoad<5*60*1000&&windPoints.length){updateWindHud(centerWindLabel());return}windLoading=true;updateWindHud('💨 Aggiorno venti…');
    try{
      const g=gridForBounds(),lats=g.map(p=>p.lat.toFixed(5)).join(','),lngs=g.map(p=>p.lng.toFixed(5)).join(',');
      const u=`https://pfc-weather.invalid/forecast?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lngs)}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=GMT&forecast_days=1`;
      const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('dati vento non disponibili');const j=await r.json(),arr=Array.isArray(j)?j:[j];
      const pts=[];arr.forEach((o,i)=>{const c=o?.current||{};if(Number.isFinite(+c.wind_speed_10m))pts.push({lat:+(o.latitude??g[i]?.lat),lng:+(o.longitude??g[i]?.lng),speed:+c.wind_speed_10m,dir:+c.wind_direction_10m,gust:c.wind_gusts_10m!=null&&Number.isFinite(+c.wind_gusts_10m)?+c.wind_gusts_10m:null})});
      if(!pts.length)throw Error('nessun dato vento ricevuto');windPoints=pts;windLastLoad=now;saveWindCache();updateWindHud(centerWindLabel());seedParticles();
    }catch(e){const cached=loadWindCache();updateWindHud(cached?'💨 Venti · ultimo dato salvato':'💨 Venti non disponibili');console.warn('Wind layer',e)}finally{windLoading=false}
  }
  function scheduleWindReload(){if(!windMode)return;clearTimeout(windTimer);windTimer=setTimeout(()=>loadWindGrid(true),550)}
  function enableWind(){
    windMode=true;ensureWindCanvas();resizeWindCanvas();updateWindHud('💨 Aggiorno venti…');if(map.hasLayer(sat))map.removeLayer(sat);if(!map.hasLayer(street))street.addTo(map);document.querySelectorAll('.layerChoice').forEach(b=>b.classList.toggle('active',b.dataset.basemap==='wind'));loadWindGrid();stopWindAnimation();drawWind();
  }
  function disableWind(){windMode=false;clearTimeout(windTimer);stopWindAnimation();if(windCanvas)windCanvas.style.display='none';updateWindHud();}

  const previousSetLayer=setLayer;
  setLayer=function(k){
    if(k==='wind'){if(windCanvas)windCanvas.style.display='block';enableWind();return}
    disableWind();if(windCanvas)windCanvas.style.display='none';previousSetLayer(k);document.querySelectorAll('.layerChoice').forEach(b=>b.classList.toggle('active',b.dataset.basemap===k));
  };
  const previousInitMap=initMap;
  initMap=function(){previousInitMap();map.on('moveend zoomend',scheduleWindReload);map.on('resize',resizeWindCanvas)};
  const previousBind=bind;
  bind=function(){ensureWindUI();previousBind();const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.0'};
})();

// V6.1.1 - Camminata + punti legati al giorno di caccia + avvistamenti nello storico
(function(){
  const HUNT_DAY_KEY='cacciatraccia-hunt-day-v1';
  const today=()=>localDay();
  function huntDay(){return localStorage.getItem(HUNT_DAY_KEY)||today()}
  function setHuntDay(v){const d=v||today();localStorage.setItem(HUNT_DAY_KEY,d);const i=document.getElementById('ctHuntDay');if(i)i.value=d;renderMarkers();renderPoints()}

  function ensureHuntDayUI(){
    if(document.getElementById('ctHuntDayBar'))return;
    const list=$('pointsList'),card=list?.closest('.card');if(!card)return;
    const head=card.querySelector('.sectionHead');
    const bar=document.createElement('div');bar.id='ctHuntDayBar';bar.style.cssText='display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:8px 0 12px';
    bar.innerHTML=`<label style="flex:1;min-width:170px;font-weight:800">Giorno di caccia<input id="ctHuntDay" type="date" value="${huntDay()}" style="display:block;width:100%;margin-top:5px"></label><button id="ctHuntToday" class="secondary small" type="button">Oggi</button><label><input id="ctFilterPostDay" type="checkbox"> Solo questo giorno</label>`;
    head?.insertAdjacentElement('afterend',bar);
    $('ctHuntDay').onchange=e=>{filterPostsByDay=true;$('ctFilterPostDay').checked=true;setHuntDay(e.target.value)};
    $('ctFilterPostDay').onchange=e=>{filterPostsByDay=e.target.checked;renderMarkers();renderPoints()};
    $('ctHuntToday').onclick=()=>{filterPostsByDay=true;$('ctFilterPostDay').checked=true;setHuntDay(today())};
  }

  const prevFillModal=fillModal;
  fillModal=function(p){
    prevFillModal(p);
    if(!p&&$('pointHuntDate'))$('pointHuntDate').value=huntDay();
    const nameLabel=$('pointName')?.closest('div')?.querySelector('label');if(nameLabel)nameLabel.textContent='Nome del punto';
    const dayLabel=$('pointHuntDate')?.closest('div')?.querySelector('label');if(dayLabel)dayLabel.textContent='Giorno di caccia';
  };

  const prevSaveCurrent=saveCurrent;
  saveCurrent=async function(type='Postazione',open=false){
    const before=new Set((state.points||[]).map(p=>p.id));
    const r=await prevSaveCurrent(type,open);
    if(type!=='Avvistamento'){
      const p=(state.points||[]).find(x=>!before.has(x.id));
      if(p){p.huntDate=huntDay();save();renderMarkers();renderPoints()}
    }
    return r;
  };

  renderMarkers=function(){
    markerLayer.clearLayers();const day=huntDay();
    (state.points||[]).forEach(p=>{
      if(!validCoords(p)||p.type!=='Avvistamento'&&!matchesPostDay(p,day))return;
      const m=L.marker([p.lat,p.lng],{icon:icon(p.type)}).addTo(markerLayer);
      m.on('click',e=>{L.DomEvent.stopPropagation(e);fillModal(p)});
    });
  };

  renderPoints=function(){
    ensureHuntDayUI();
    const el=$('pointsList');if(!el)return;const day=huntDay();
    const mushroom=activityMode()==='mushroom';const pts=(state.points||[]).filter(p=>mushroom?p.sightingKind==='mushroom':p.sightingKind!=='mushroom'&&p.type!=='Avvistamento'&&matchesPostDay(p,day));
    el.innerHTML=pts.length?pts.map(p=>`<div class="item"><div class="itemTop"><div><h4>${esc(p.name||p.type)}</h4><div class="meta">${mushroom?'🍄 Fungo trovato':esc(p.type)} · ${mushroom?'Giorno uscita':'Giorno di caccia'} ${esc(p.huntDate||day)}</div></div></div>${(!mushroom&&(p.windName||p.weather))?`<div class="snap">💨 ${esc(p.windName||p.weather?.windName||'')} ${p.windSpeed??p.weather?.windSpeed??'-'} km/h${p.weather?.condition?' · 🌦 '+esc(p.weather.condition):''}</div>`:''}<div class="rowBtns"><button class="mini" onclick="CT.go('${p.id}')">Mappa</button><button class="mini" onclick="CT.edit('${p.id}')">✏️ Nome / giorno</button><button class="mini" onclick="CT.sharePoint('${p.id}')">↗ Condividi</button><button class="mini red" onclick="CT.del('${p.id}')">Elimina</button></div></div>`).join(''):`<div class="empty">${mushroom?'Nessun fungo salvato.':'Nessun punto per il giorno '+esc(day)+'.'}</div>`;
  };

  renderDiary=function(){
    const el=$('historyList');if(!el)return;const q=($('historySearch')?.value||'').toLowerCase();let rows=[];
    let sightings=(state.points||[]).filter(p=>p.type==='Avvistamento'&&pointMatchesMode(p));
    if(historyFilter==='diary')sightings=[];
    if(historyFilter!=='diary')rows.push(...sightings.filter(p=>!q||JSON.stringify(p).toLowerCase().includes(q)).map(p=>({kind:'point',ts:p.createdAt||p.huntDate,p})));
    if(historyFilter!=='sightings')rows.push(...state.diary.filter(d=>!q||JSON.stringify(d).toLowerCase().includes(q)).map(d=>({kind:'diary',ts:d.createdAt||d.date,d})));
    rows.sort((a,b)=>String(b.ts||'').localeCompare(String(a.ts||'')));
    el.innerHTML=rows.map(r=>r.kind==='point'?`<div class="item"><b>🕊 ${esc(r.p.species||r.p.name||'Avvistamento')}</b><div class="meta">${esc(when(r.p.createdAt))}</div><div>${r.p.sightingKind==='mushroom'?'Giorno uscita':'Giorno caccia'} ${esc(r.p.huntDate||'')}${r.p.sightingKind==='mushroom'?'':' · 💨 '+esc(r.p.windName||r.p.weather?.windName||'-')+' '+(r.p.windSpeed??r.p.weather?.windSpeed??'-')+' km/h'}</div>${r.p.notes?`<div>${esc(r.p.notes)}</div>`:''}<div class="rowBtns"><button class="mini" onclick="CT.edit('${r.p.id}')">Apri</button><button class="mini red" onclick="CT.del('${r.p.id}')">🗑 Elimina</button></div></div>`:`<div class="item"><b>${esc(r.d.game||r.d.type||'Diario')}</b><div class="meta">${esc(r.d.date||'')} · ${esc(r.d.zone||'')}</div>${r.d.notes?`<div>${esc(r.d.notes)}</div>`:''}${r.d.photo?`<img class="photoPreview" src="${r.d.photo}">`:''}<div class="rowBtns"><button class="mini red" onclick="CT.delDiary('${r.d.id}')">Elimina nota</button></div></div>`).join('')||'<div class="empty">Storico vuoto.</div>';
  };

  function renameWalking(){
    const q=$('quickTrackBtn')?.querySelector('span');if(q)q.textContent='Camminata';
    const nav=document.querySelector('nav button[data-page="track"]');if(nav)nav.innerHTML='<b>🥾</b>Camminata';
    const h=document.querySelector('#page-track .sectionHead h2');if(h)h.textContent='🥾 Camminata';
    if($('startTrackBtn'))$('startTrackBtn').textContent='▶ Inizia camminata';
    if($('stopTrackBtn'))$('stopTrackBtn').textContent='■ Termina e salva';
    const cards=document.querySelectorAll('#page-track .card h2');cards.forEach(x=>{if(x.textContent.trim()==='Uscite salvate')x.textContent='Camminate salvate'});
  }

  const prevBind=bind;
  bind=function(){prevBind();ensureHuntDayUI();renameWalking();const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.1'};
})();

// V6.1.2 - condivisione Camminata con mappa reale + descrizione + foto facoltativa
(function(){
  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke();
  }
  function coverDraw(ctx,img,x,y,w,h){
    const ir=img.width/img.height, br=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;
    if(ir>br){sw=img.height*br;sx=(img.width-sw)/2}else{sh=img.width/br;sy=(img.height-sh)/2}
    ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
  }
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=6){
    const words=String(text||'').trim().split(/\s+/).filter(Boolean);let line='',lines=[];
    for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=w}else line=t;if(lines.length>=maxLines)break}
    if(line&&lines.length<maxLines)lines.push(line);
    lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return lines.length;
  }
  function outingBounds(o){
    const a=o.coords||[];if(!a.length)return null;
    let minLa=Math.min(...a.map(p=>p[0])),maxLa=Math.max(...a.map(p=>p[0])),minLo=Math.min(...a.map(p=>p[1])),maxLo=Math.max(...a.map(p=>p[1]));
    const dLa=Math.max(.0015,maxLa-minLa),dLo=Math.max(.0015,maxLo-minLo),padLa=dLa*.22,padLo=dLo*.22;
    return {minLa:minLa-padLa,maxLa:maxLa+padLa,minLo:minLo-padLo,maxLo:maxLo+padLo};
  }
  async function fetchMapImage(bounds,w,h){
    if(!bounds||!navigator.onLine)return null;
    const bbox=[bounds.minLo,bounds.minLa,bounds.maxLo,bounds.maxLa].join(',');
    const services=['World_Imagery','World_Street_Map'];
    for(const svc of services){
      try{
        const url=`https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=4326&size=${w},${h}&format=png32&transparent=false&f=image`;
        const r=await fetch(url,{cache:'no-store'});if(!r.ok)continue;const blob=await r.blob();
        if('createImageBitmap' in window)return await createImageBitmap(blob);
        const obj=URL.createObjectURL(blob);const img=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>{URL.revokeObjectURL(obj);ok(im)};im.onerror=no;im.src=obj});return img;
      }catch(e){console.warn('Mappa condivisione',svc,e)}
    }
    return null;
  }
  function drawRoute(ctx,o,b,x,y,w,h){
    const a=o.coords||[];if(a.length<1||!b)return;
    const px=p=>x+(p[1]-b.minLo)/(b.maxLo-b.minLo)*w;
    const py=p=>y+h-(p[0]-b.minLa)/(b.maxLa-b.minLa)*h;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=14;ctx.beginPath();a.forEach((p,i)=>i?ctx.lineTo(px(p),py(p)):ctx.moveTo(px(p),py(p)));ctx.stroke();ctx.strokeStyle='#0d5a3b';ctx.lineWidth=8;ctx.stroke();
    const mark=(p,label,color)=>{const xx=px(p),yy=py(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(xx,yy,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.fillText(label,xx+20,yy+6)};
    mark(a[0],'Partenza','#16734b');if(a.length>1)mark(a[a.length-1],'Arrivo','#b6322b');ctx.restore();
  }
  async function drawPhoto(ctx,data,x,y,w,h){
    if(!data)return false;
    try{const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=data});coverDraw(ctx,im,x,y,w,h);return true}catch{return false}
  }
  async function newShareOut(id){
    const o=state.outings.find(x=>x.id===id);if(!o)return;
    toast('Preparo la scheda Camminata…');
    const hasPhoto=!!o.photo,W=1080,mapH=650,descH=o.note?210:0,photoH=hasPhoto?430:0,H=260+mapH+(descH?descH+28:0)+(photoH?photoH+28:0)+70;
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle='#f4f1e8';x.fillRect(0,0,W,H);
    x.fillStyle='#173f2b';x.fillRect(0,0,W,150);x.fillStyle='#fff';x.font='bold 52px sans-serif';x.fillText('Passione Funghi e Caccia',46,92);x.font='26px sans-serif';x.fillText('Camminata',48,128);
    x.fillStyle='#17251d';x.font='bold 35px sans-serif';x.fillText(new Date(o.start).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}),46,205);x.font='bold 42px sans-serif';x.fillStyle='#173f2b';x.fillText(`${(+o.distanceKm||0).toFixed(2)} km`,W-225,205);
    const mx=45,my=245,mw=W-90,b=outingBounds(o);x.fillStyle='#dce5d7';roundRect(x,mx,my,mw,mapH,28,true,false);
    const mapImg=await fetchMapImage(b,960,620);if(mapImg){x.save();roundRect(x,mx,my,mw,mapH,28,false,false);x.clip();coverDraw(x,mapImg,mx,my,mw,mapH);x.restore()}else{ x.fillStyle='#d6dfd1';x.fillRect(mx,my,mw,mapH);x.strokeStyle='#bcc8b7';x.lineWidth=2;for(let gx=mx;gx<mx+mw;gx+=80){x.beginPath();x.moveTo(gx,my);x.lineTo(gx,my+mapH);x.stroke()}for(let gy=my;gy<my+mapH;gy+=80){x.beginPath();x.moveTo(mx,gy);x.lineTo(mx+mw,gy);x.stroke()}x.fillStyle='#53675a';x.font='24px sans-serif';x.fillText('Mappa non disponibile offline',mx+28,my+45)}
    drawRoute(x,o,b,mx,my,mw,mapH);
    let cy=my+mapH+28;
    if(o.note){x.fillStyle='#fff';roundRect(x,45,cy,W-90,descH,24,true,false);x.fillStyle='#173f2b';x.font='bold 28px sans-serif';x.fillText('Descrizione',76,cy+48);x.fillStyle='#27342c';x.font='26px sans-serif';wrapText(x,o.note,76,cy+92,W-152,36,4);cy+=descH+28}
    if(hasPhoto){x.fillStyle='#fff';roundRect(x,45,cy,W-90,photoH,24,true,false);x.save();roundRect(x,58,cy+13,W-116,photoH-26,20,false,false);x.clip();await drawPhoto(x,o.photo,58,cy+13,W-116,photoH-26);x.restore();cy+=photoH+28}
    x.fillStyle='#68746b';x.font='22px sans-serif';x.fillText('Creato con Passione Funghi e Caccia',46,H-28);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));if(!blob)return toast('Impossibile creare la scheda');
    const file=new File([blob],`CacciaTraccia_Camminata_${new Date(o.start).toISOString().slice(0,10)}.jpg`,{type:'image/jpeg'});
    const text=`Camminata ${(+o.distanceKm||0).toFixed(2)} km · ${new Date(o.start).toLocaleDateString('it-IT')}${o.note?'\n'+o.note:''}`;
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{return await navigator.share({title:'Passione Funghi e Caccia',text,files:[file]})}catch(e){if(e?.name==='AbortError')return}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
  }
  function enhanceWalkingFields(){
    const old=$('trackNote');if(old&&old.tagName!=='TEXTAREA'){
      const ta=document.createElement('textarea');ta.id='trackNote';ta.rows=4;ta.placeholder='Es. zona battuta, uccelli incontrati, condizioni, note della giornata…';ta.value=old.value||'';old.replaceWith(ta);
    }
    const note=$('trackNote');const noteLabel=note?.closest('.field')?.querySelector('label');if(noteLabel)noteLabel.textContent='Descrizione da condividere (facoltativa)';
    const photo=$('trackPhoto');const photoLabel=photo?.closest('.field')?.querySelector('label');if(photoLabel)photoLabel.textContent='Foto da aggiungere alla scheda condivisa (facoltativa)';
    const p=document.querySelector('#page-track .card .note');if(p)p.textContent='Durante la camminata il percorso viene salvato sul telefono. Quando termini puoi condividere una scheda con mappa, traccia, km, descrizione e foto facoltativa.';
  }
  window.CT.share=newShareOut;
  const prevBind=bind;
  bind=function(){prevBind();enhanceWalkingFields();const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.2'};
})();

// V6.1.3 - editor slide per Camminate salvate: descrizione + foto + anteprima + condivisione
(function(){
  let slideId=null,slidePhoto=null,previewMap=null,previewRoute=null;
  const sharePrepared=window.CT?.share;

  function ensureSlideModal(){
    if(document.getElementById('ctSlideModal'))return;
    const modal=document.createElement('div');
    modal.id='ctSlideModal';modal.className='modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="dialog" style="max-width:760px;max-height:92vh;overflow:auto">
      <div class="sectionHead"><div><h2>🖼️ Prepara slide Camminata</h2><div class="muted">Modifica anche dopo aver salvato la camminata</div></div><button id="ctSlideClose" class="iconBtn" type="button">✕</button></div>
      <div id="ctSlideCard" style="background:#f4f1e8;border:1px solid #d6d8cf;border-radius:18px;overflow:hidden;margin:10px 0 16px">
        <div style="background:#173f2b;color:#fff;padding:16px 18px"><b style="font-size:22px">Passione Funghi e Caccia</b><div style="opacity:.82">Camminata</div></div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:14px 16px 8px;font-weight:800"><span id="ctSlideDate">-</span><span id="ctSlideKm">0.00 km</span></div>
        <div id="ctSlideMap" style="height:300px;margin:8px 14px;border-radius:14px;overflow:hidden;background:#dce5d7"></div>
        <div id="ctSlideDescPreview" style="display:none;background:#fff;margin:12px 14px;padding:14px;border-radius:14px;white-space:pre-wrap"></div>
        <img id="ctSlidePhotoPreview" style="display:none;width:calc(100% - 28px);max-height:320px;object-fit:cover;margin:12px 14px;border-radius:14px" alt="Foto Camminata">
      </div>
      <div class="field"><label>Descrizione della slide</label><textarea id="ctSlideDesc" rows="4" placeholder="Es. zona battuta, uccelli incontrati, vento, condizioni, note della giornata…"></textarea></div>
      <div class="field"><label>Foto facoltativa</label><input id="ctSlidePhotoInput" type="file" accept="image/*"></div>
      <div class="actionGrid">
        <button id="ctSlideRemovePhoto" class="secondary" type="button">🗑 Rimuovi foto</button>
        <button id="ctSlideSave" class="secondary" type="button">💾 Salva modifiche</button>
        <button id="ctSlideShare" class="primary" type="button">↗ Condividi slide</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    $('ctSlideClose').onclick=closeSlide;
    modal.addEventListener('click',e=>{if(e.target===modal)closeSlide()});
    $('ctSlideDesc').oninput=refreshSlidePreview;
    $('ctSlidePhotoInput').onchange=async e=>{
      const f=e.target.files?.[0];if(!f)return;
      try{slidePhoto=await fileData(f,1400,.82);refreshSlidePreview()}catch{toast('Foto non leggibile')}
    };
    $('ctSlideRemovePhoto').onclick=()=>{slidePhoto=null;$('ctSlidePhotoInput').value='';refreshSlidePreview()};
    $('ctSlideSave').onclick=()=>saveSlideEdits(true);
    $('ctSlideShare').onclick=async()=>{if(!slideId)return;saveSlideEdits(false);const id=slideId;toast('Preparo la slide…');await sharePrepared?.(id)};
  }

  function currentOuting(){return (state.outings||[]).find(o=>o.id===slideId)||null}
  function closeSlide(){document.getElementById('ctSlideModal')?.classList.remove('open');if(previewMap){try{previewMap.remove()}catch{}previewMap=null;previewRoute=null}}

  function refreshSlidePreview(){
    const o=currentOuting();if(!o)return;
    $('ctSlideDate').textContent=new Date(o.start).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
    $('ctSlideKm').textContent=`${(+o.distanceKm||0).toFixed(2)} km`;
    const d=($('ctSlideDesc')?.value||'').trim(),dp=$('ctSlideDescPreview');dp.textContent=d;dp.style.display=d?'block':'none';
    const im=$('ctSlidePhotoPreview');if(slidePhoto){im.src=slidePhoto;im.style.display='block'}else{im.removeAttribute('src');im.style.display='none'}
  }

  function buildPreviewMap(o){
    if(!window.L||!o?.coords?.length)return;
    if(previewMap){try{previewMap.remove()}catch{}previewMap=null}
    previewMap=L.map('ctSlideMap',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(previewMap);
    previewRoute=L.polyline(o.coords,{color:'#0d5a3b',weight:5,opacity:.95}).addTo(previewMap);
    if(o.coords.length){L.circleMarker(o.coords[0],{radius:7,color:'#fff',weight:3,fillColor:'#16734b',fillOpacity:1}).addTo(previewMap);L.circleMarker(o.coords[o.coords.length-1],{radius:7,color:'#fff',weight:3,fillColor:'#b6322b',fillOpacity:1}).addTo(previewMap)}
    try{previewMap.fitBounds(previewRoute.getBounds(),{padding:[28,28],maxZoom:17})}catch{previewMap.setView(o.coords[0],15)}
    setTimeout(()=>previewMap?.invalidateSize(),120);
  }

  function openSlide(id){
    ensureSlideModal();const o=(state.outings||[]).find(x=>x.id===id);if(!o)return;
    slideId=id;slidePhoto=o.photo||null;$('ctSlideDesc').value=o.note||'';$('ctSlidePhotoInput').value='';
    $('ctSlideModal').classList.add('open');refreshSlidePreview();setTimeout(()=>buildPreviewMap(o),80);
  }

  function saveSlideEdits(showToast=true){
    const o=currentOuting();if(!o)return false;
    o.note=($('ctSlideDesc')?.value||'').trim();o.photo=slidePhoto||null;o.updatedAt=new Date().toISOString();save();renderOutings();refreshSlidePreview();if(showToast)toast('Slide salvata');return true;
  }

  renderOutings=function(){
    const el=$('outingsList');if(!el)return;
    el.innerHTML=(state.outings||[]).length?(state.outings||[]).map(o=>`<div class="item"><div class="itemTop"><div><h4>${new Date(o.start).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</h4><div class="meta">${new Date(o.start).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div></div><b>${(+o.distanceKm||0).toFixed(2)} km</b></div>${o.note?`<div>${esc(o.note)}</div>`:''}${o.photo?`<img class="photoPreview" src="${o.photo}">`:''}<div class="rowBtns"><button class="mini" onclick="CT.out('${o.id}')">Mostra</button><button class="mini" onclick="CT.prepareSlide('${o.id}')">🖼️ Prepara slide</button><button class="mini red" onclick="CT.delOut('${o.id}')">Elimina</button></div></div>`).join(''):'<div class="empty">Nessuna camminata salvata.</div>';
  };

  window.CT.prepareSlide=openSlide;
  const prevBind=bind;
  bind=function(){prevBind();ensureSlideModal();renderOutings();const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.3'};
})();

// V6.1.4 - slide leggibili + mappa reale nelle condivisioni tramite mosaico di tessere
(function(){
  let preparedSlideId=null;
  const previousPrepare=window.CT?.prepareSlide;

  function mercY(lat){
    const s=Math.sin(Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180);
    return 0.5-Math.log((1+s)/(1-s))/(4*Math.PI);
  }
  function worldPoint(lat,lng,z){
    const size=256*Math.pow(2,z);
    return {x:(lng+180)/360*size,y:mercY(lat)*size};
  }
  function routeView(o,w,h){
    const a=o?.coords||[];if(!a.length)return null;
    let chosen=15;
    for(let z=18;z>=3;z--){
      const pts=a.map(p=>worldPoint(p[0],p[1],z));
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      const spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys);
      if(spanX<=w*.72&&spanY<=h*.68){chosen=z;break}
    }
    const pts=a.map(p=>worldPoint(p[0],p[1],chosen));
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
    const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    return {z:chosen,left:cx-w/2,top:cy-h/2,pts};
  }
  async function tileBitmap(url){
    try{
      const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw Error(String(r.status));const b=await r.blob();
      if('createImageBitmap' in window)return await createImageBitmap(b);
      const u=URL.createObjectURL(b);return await new Promise((ok,no)=>{const im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=no;im.src=u});
    }catch{return null}
  }
  async function drawTileMap(ctx,o,x,y,w,h){
    const view=routeView(o,w,h);if(!view)return false;
    const z=view.z,n=Math.pow(2,z),tx0=Math.floor(view.left/256),ty0=Math.floor(view.top/256),tx1=Math.floor((view.left+w)/256),ty1=Math.floor((view.top+h)/256);
    let drawn=0;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle='#d9e2d4';ctx.fillRect(x,y,w,h);
    for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
      if(ty<0||ty>=n)continue;const wx=((tx%n)+n)%n;
      let im=await tileBitmap(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${wx}`);
      if(!im)im=await tileBitmap(`https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`);
      if(im){ctx.drawImage(im,x+tx*256-view.left,y+ty*256-view.top,256,256);drawn++}
    }
    if(!drawn){ctx.fillStyle='#d6dfd1';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#b7c5b4';ctx.lineWidth=2;for(let gx=x;gx<x+w;gx+=70){ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke()}for(let gy=y;gy<y+h;gy+=70){ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke()}ctx.fillStyle='#526557';ctx.font='24px sans-serif';ctx.fillText('Mappa non disponibile',x+28,y+44)}
    const pts=view.pts;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,.94)';ctx.lineWidth=14;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(x+p.x-view.left,y+p.y-view.top):ctx.moveTo(x+p.x-view.left,y+p.y-view.top));ctx.stroke();ctx.strokeStyle='#0d5a3b';ctx.lineWidth=8;ctx.stroke();
    const mark=(p,label,color)=>{const px=x+p.x-view.left,py=y+p.y-view.top;ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.fillText(label,px+18,py+5)};
    if(pts.length){mark(pts[0],'Partenza','#16734b');if(pts.length>1)mark(pts.at(-1),'Arrivo','#b6322b')}
    ctx.restore();return drawn>0;
  }
  function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));ctx.fill()}
  function wrap(ctx,text,x,y,max,line,maxLines=5){const words=String(text||'').split(/\s+/).filter(Boolean);let l='',rows=[];for(const w of words){const t=l?l+' '+w:w;if(ctx.measureText(t).width>max&&l){rows.push(l);l=w}else l=t;if(rows.length>=maxLines)break}if(l&&rows.length<maxLines)rows.push(l);rows.forEach((r,i)=>ctx.fillText(r,x,y+i*line));}
  async function drawDataPhoto(ctx,data,x,y,w,h){if(!data)return false;try{const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=data});const ir=im.width/im.height,br=w/h;let sx=0,sy=0,sw=im.width,sh=im.height;if(ir>br){sw=im.height*br;sx=(im.width-sw)/2}else{sh=im.width/br;sy=(im.height-sh)/2}ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);return true}catch{return false}}
  async function shareBetter(id){
    const o=(state.outings||[]).find(x=>x.id===id);if(!o)return;
    toast('Creo la slide con la mappa…');
    const W=1080,mapH=620,descH=o.note?190:0,photoH=o.photo?380:0,H=250+mapH+(descH?descH+25:0)+(photoH?photoH+25:0)+65;
    const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    g.fillStyle='#f4f1e8';g.fillRect(0,0,W,H);g.fillStyle='#173f2b';g.fillRect(0,0,W,145);g.fillStyle='#fff';g.font='bold 50px sans-serif';g.fillText('Passione Funghi e Caccia',44,88);g.font='25px sans-serif';g.fillText('Camminata',46,124);
    g.fillStyle='#17251d';g.font='bold 32px sans-serif';g.fillText(new Date(o.start).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}),44,202);g.fillStyle='#173f2b';g.font='bold 40px sans-serif';g.textAlign='right';g.fillText(`${(+o.distanceKm||0).toFixed(2)} km`,W-44,202);g.textAlign='left';
    const mx=44,my=235,mw=W-88;await drawTileMap(g,o,mx,my,mw,mapH);
    let cy=my+mapH+25;
    if(o.note){g.fillStyle='#fff';rr(g,44,cy,W-88,descH,22);g.fillStyle='#173f2b';g.font='bold 27px sans-serif';g.fillText('Descrizione',72,cy+43);g.fillStyle='#26352c';g.font='25px sans-serif';wrap(g,o.note,72,cy+82,W-144,34,4);cy+=descH+25}
    if(o.photo){g.fillStyle='#fff';rr(g,44,cy,W-88,photoH,22);g.save();g.beginPath();g.rect(58,cy+14,W-116,photoH-28);g.clip();await drawDataPhoto(g,o.photo,58,cy+14,W-116,photoH-28);g.restore();cy+=photoH+25}
    g.fillStyle='#68746b';g.font='21px sans-serif';g.fillText('Creato con Passione Funghi e Caccia',44,H-24);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));if(!blob)return toast('Impossibile creare la slide');
    const file=new File([blob],`CacciaTraccia_Camminata_${new Date(o.start).toISOString().slice(0,10)}.jpg`,{type:'image/jpeg'});const text=`Camminata ${(+o.distanceKm||0).toFixed(2)} km · ${new Date(o.start).toLocaleDateString('it-IT')}${o.note?'\n'+o.note:''}`;
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{return await navigator.share({title:'Passione Funghi e Caccia',text,files:[file]})}catch(e){if(e?.name==='AbortError')return}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
  }

  if(previousPrepare){window.CT.prepareSlide=function(id){preparedSlideId=id;return previousPrepare(id)}}
  window.CT.share=shareBetter;

  function compactSavedPhotos(){
    document.querySelectorAll('#outingsList img.photoPreview').forEach(img=>{img.style.width='120px';img.style.height='90px';img.style.maxWidth='120px';img.style.objectFit='cover';img.style.borderRadius='10px';img.style.display='block';img.style.marginTop='8px'});
  }
  const prevRender=renderOutings;
  renderOutings=function(){prevRender();compactSavedPhotos()};

  const prevBind=bind;
  bind=function(){
    prevBind();
    compactSavedPhotos();
    const shareBtn=$('ctSlideShare');if(shareBtn)shareBtn.onclick=async()=>{if(!preparedSlideId)return;const saveBtn=$('ctSlideSave');if(saveBtn)saveBtn.click();await shareBetter(preparedSlideId)};
    const card=$('ctSlideCard');if(card){card.style.maxWidth='100%';card.style.margin='10px 0 14px'}
    const mapBox=$('ctSlideMap');if(mapBox)mapBox.style.height='220px';
    const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.4';
  };
})();

// V6.1.7 - Avvistamento storico -> mappa interna + vento attuale + tasto Google Maps visibile sulla mappa
(function(){
  function mapsIconSvg(){
    return `<svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true"><path fill="#4285F4" d="M24 3c-8.3 0-15 6.5-15 14.6C9 28.7 24 45 24 45s15-16.3 15-27.4C39 9.5 32.3 3 24 3z"/><path fill="#34A853" d="M11.1 10.2C9.8 12.3 9 14.8 9 17.6c0 5.4 3.5 11.9 7.2 17.2L25 23z"/><path fill="#FBBC04" d="M24 3c-5.4 0-10.2 2.8-12.9 7.2L25 23l5.8-18.7C28.7 3.5 26.4 3 24 3z"/><path fill="#EA4335" d="M30.8 4.3L25 23l11.8 8.6c1.3-2.5 2.2-5 2.2-7.6 0-8.3-3.2-15.2-8.2-19.7z"/><circle cx="24" cy="17.5" r="6.2" fill="#fff"/></svg>`;
  }

  function ensureMapNavigateButton(){
    const wrap=document.querySelector('.mapWrap');
    if(!wrap||document.getElementById('ctMapsFloat'))return;
    const b=document.createElement('button');
    b.id='ctMapsFloat';b.type='button';b.title='Apri Google Maps per arrivare al punto';
    b.style.cssText='display:none;position:absolute;right:12px;bottom:14px;z-index:1135;align-items:center;gap:7px;border:0;border-radius:15px;background:#fff;color:#173f2b;padding:8px 12px 8px 9px;font:800 13px/1 system-ui;box-shadow:0 3px 12px #0005;min-height:48px';
    b.innerHTML=mapsIconSvg()+`<span>Maps</span>`;
    b.onclick=()=>navigateSelected();
    wrap.appendChild(b);
  }
  function showMapNavigateButton(show){const b=$('ctMapsFloat');if(b)b.style.display=show?'flex':'none'}

  const originalSelectMapPoint=selectMapPoint;
  selectMapPoint=async function(lat,lng){
    if($('selectedTitle'))$('selectedTitle').textContent='Punto selezionato';
    if($('navigateBtn'))$('navigateBtn').innerHTML=mapsIconSvg()+'<span style="margin-left:6px">Google Maps</span>';
    if($('weatherRefreshBtn'))$('weatherRefreshBtn').textContent='🌦 Meteo e vento del punto';
    const r=await originalSelectMapPoint(lat,lng);
    showMapNavigateButton(true);
    return r;
  };

  const originalClearSelected=clearSelected;
  clearSelected=function(){originalClearSelected();showMapNavigateButton(false)};

  async function openHistoryPoint(id){
    const p=(state.points||[]).find(x=>x.id===id);
    if(!p)return toast('Punto non trovato');
    if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lng))return toast('Coordinate del punto non disponibili');
    follow=false;
    $('followBtn')?.classList.remove('active');
    showPage('map');
    map.setView([+p.lat,+p.lng],17,{animate:true});
    await selectMapPoint(+p.lat,+p.lng);
    if($('selectedTitle'))$('selectedTitle').textContent=`🕊️ ${p.species||p.name||'Avvistamento salvato'}`;
    if($('selectedCoords'))$('selectedCoords').textContent=`${(+p.lat).toFixed(6)}, ${(+p.lng).toFixed(6)} · vento attuale`;
    if($('navigateBtn'))$('navigateBtn').innerHTML=mapsIconSvg()+'<span style="margin-left:6px">Google Maps</span>';
    try{
      const ring=L.circleMarker([+p.lat,+p.lng],{radius:18,color:'#f2b72b',weight:4,fill:false,opacity:1}).addTo(map);
      setTimeout(()=>{try{map.removeLayer(ring)}catch{}},7000);
    }catch{}
    toast('Avvistamento aperto sulla mappa · vento attuale aggiornato');
  }

  renderDiary=function(){
    const el=$('historyList');if(!el)return;
    const q=($('historySearch')?.value||'').toLowerCase();let rows=[];
    let sightings=(state.points||[]).filter(p=>(p.type==='Avvistamento'||p.sightingKind==='mushroom')&&pointMatchesMode(p));
    if(historyFilter==='diary')sightings=sightings.filter(p=>p.sightingKind==='mushroom');
    rows.push(...sightings.filter(p=>!q||JSON.stringify(p).toLowerCase().includes(q)).map(p=>({kind:'point',ts:p.createdAt||p.huntDate,p})));
    if(historyFilter!=='sightings')rows.push(...state.diary.filter(d=>!q||JSON.stringify(d).toLowerCase().includes(q)).map(d=>({kind:'diary',ts:d.createdAt||d.date,d})));
    rows.sort((a,b)=>String(b.ts||'').localeCompare(String(a.ts||'')));
    el.innerHTML=rows.map(r=>r.kind==='point'?`<div class="item"><b>🕊 ${esc(r.p.species||r.p.name||'Avvistamento')}</b><div class="meta">${esc(when(r.p.createdAt))}</div><div>${r.p.sightingKind==='mushroom'?'Appostamento funghi · Giorno uscita':'Giorno caccia'} ${esc(r.p.huntDate||'')}${r.p.sightingKind==='mushroom'?'':' · 💨 '+esc(r.p.windName||r.p.weather?.windName||'-')+' '+(r.p.windSpeed??r.p.weather?.windSpeed??'-')+' km/h'}</div>${r.p.photo?`<img class="photoPreview" src="${r.p.photo}" alt="Foto fungo salvata">`:""}${r.p.notes?`<div>${esc(r.p.notes)}</div>`:''}<div class="rowBtns"><button class="mini" onclick="CT.openHistoryPoint('${r.p.id}')">🗺 Mappa + vento attuale</button><button class="mini" onclick="CT.edit('${r.p.id}')">✏️ Modifica</button><button class="mini red" onclick="CT.del('${r.p.id}')">🗑 Elimina</button></div></div>`:`<div class="item"><b>${esc(r.d.game||r.d.type||'Diario')}</b><div class="meta">${esc(r.d.date||'')} · ${esc(r.d.zone||'')}</div>${r.d.notes?`<div>${esc(r.d.notes)}</div>`:''}${r.d.photo?`<img class="photoPreview" src="${r.d.photo}">`:''}<div class="rowBtns"><button class="mini red" onclick="CT.delDiary('${r.d.id}')">Elimina nota</button></div></div>`).join('')||'<div class="empty">Storico vuoto.</div>';
  };

  window.CT.openHistoryPoint=openHistoryPoint;

  const prevBind=bind;
  bind=function(){
    prevBind();ensureMapNavigateButton();
    const v=$('ctVersionBadge');if(v)v.textContent='• V6.1.7';
    if($('navigateBtn'))$('navigateBtn').innerHTML=mapsIconSvg()+'<span style="margin-left:6px">Google Maps</span>';
    if($('pointNavigateBtn'))$('pointNavigateBtn').innerHTML=mapsIconSvg()+'<span style="margin-left:6px">Google Maps</span>';
    if($('weatherRefreshBtn'))$('weatherRefreshBtn').textContent='🌦 Meteo e vento del punto';
  };
})();

// V6.1.9 - verifica condizioni appostamenti, pioggia/cambio vento, Favugna, GPS orientato, area offline, backup automatico, condivisione completa punti
(function(){
  const CT_VER='6.1.12';
  const AUTO_SNAP_KEY='cacciatraccia-auto-snapshot-v1';
  const OFFLINE_TILE_CACHE='cacciatraccia-offline-tiles-v1';
  let ctHeadingFollow=false,conditionLayer=null;

  // ---------- nomi locali del vento ----------
  function localWindName(name){
    const n=String(name||'').trim();
    return window.PFC_WIND_LABELS?.name(n)||n;
  }
  function angleDiff(a,b){
    const x=Math.abs((((+a||0)-(+b||0)+540)%360)-180);return x;
  }
  function fmtHour(iso){try{return new Date(iso).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}catch{return '-'}}
  function fmtDateTime(iso){try{return new Date(iso).toLocaleString('it-IT',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return iso||'-'}}
  function isoLocal(date){
    const p=n=>String(n).padStart(2,'0');
    return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
  }
  function decorateLocalWind(root=document){
    try{root.querySelectorAll('.snap,.weatherNow,#historyList,#pointsList,#pointWeatherSummary,#weatherBody').forEach(el=>{
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{const old=node.nodeValue||'';if(old.includes('Voria (')||old.includes('Favugna ('))return;const next=old.replace(/Libeccio \(Favugna\)/g,'Libeccio').replace(/\b(Tramontana|Grecale|Ostro|Libeccio)\b/g,n=>window.PFC_WIND_LABELS?.name(n)||n);if(next!==old)node.nodeValue=next;});
    });}catch{}
  }

  // ---------- meteo esteso: pioggia e prossimo cambio vento ----------
  function nearestHourlyIndex(times,target=Date.now()){
    if(!times?.length)return -1;let best=0,bd=Infinity;
    times.forEach((t,i)=>{const d=Math.abs(new Date(t).getTime()-target);if(d<bd){bd=d;best=i}});return best;
  }
  function firstWindChange(hourly,startIndex){
    const dirs=hourly?.wind_direction_10m||[],speeds=hourly?.wind_speed_10m||[],times=hourly?.time||[];
    if(startIndex<0||!times.length)return null;
    const d0=dirs[startIndex]==null?NaN:Number(dirs[startIndex]);
    const s0=speeds[startIndex]==null?NaN:Number(speeds[startIndex]);
    if(!Number.isFinite(d0)||!Number.isFinite(s0))return null;
    for(let i=startIndex+1;i<Math.min(times.length,startIndex+13);i++){
      const d=dirs[i]==null?NaN:Number(dirs[i]),speed=speeds[i]==null?NaN:Number(speeds[i]);
      if(!Number.isFinite(d)||!Number.isFinite(speed))continue;
      if(angleDiff(d0,d)>=45||Math.abs(speed-s0)>=12)return {time:times[i],dir:d,speed};
    }
    return null;
  }
  weather=async function(lat,lng){
    const __pfcTargetLat=+lat,__pfcTargetLng=+lng;
    $('weatherBody').innerHTML='<div class="empty">Carico meteo…</div>';
    try{
      const u=`https://pfc-weather.invalid/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
      const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('Meteo non disponibile');const j=await r.json(),c=j.current||{},h=j.hourly||{};
      if(!selected){selected={lat:__pfcTargetLat,lng:__pfcTargetLng,weather:null};}else if(!Number.isFinite(+selected.lat)||!Number.isFinite(+selected.lng)||Math.abs((+selected.lat)-__pfcTargetLat)>1e-7||Math.abs((+selected.lng)-__pfcTargetLng)>1e-7)return null;
      const idx=nearestHourlyIndex(h.time,Date.now()),rain=idx>=0?(h.precipitation_probability?.[idx]??null):null,change=firstWindChange(h,idx);
      selected.weather={source:j.source||'Open-Meteo',fetchedAt:new Date().toISOString(),temperature:c.temperature_2m,condition:wtext(c.weather_code),windName:wname(c.wind_direction_10m),windDir:wdir(c.wind_direction_10m),windDeg:+c.wind_direction_10m||0,windSpeed:c.wind_speed_10m,windGust:c.wind_gusts_10m,rainProbability:rain,nextWindChange:change};
      const cards=[];
      for(let i=Math.max(0,idx);i<Math.min((h.time||[]).length,Math.max(0,idx)+6);i++){
        cards.push(`<div class="ctHour"><b>${fmtHour(h.time[i])}</b><span>🌧 ${h.precipitation_probability?.[i]==null?'—':Math.round(h.precipitation_probability[i])+'%'}</span><span>💨 ${esc(localWindName(wname(h.wind_direction_10m?.[i])))} ${(h.wind_speed_10m?.[i]==null?'—':Math.round(h.wind_speed_10m[i]))} km/h</span></div>`);
      }
      $('weatherBody').innerHTML=`<div class="weatherGrid"><div class="weatherNow"><span>Temperatura</span><b>${c.temperature_2m??'-'} °C</b></div><div class="weatherNow"><span>Condizioni</span><b>${wtext(c.weather_code)}</b></div><div class="weatherNow"><span>Vento</span><b>${esc(localWindName(wname(c.wind_direction_10m)))} ${wdir(c.wind_direction_10m)}</b><small>${(c.wind_speed_10m==null?'—':Math.round(c.wind_speed_10m))} km/h</small></div><div class="weatherNow"><span>Raffiche</span><b>${(c.wind_gusts_10m==null?'—':Math.round(c.wind_gusts_10m))} km/h</b></div><div class="weatherNow"><span>Pioggia</span><b>${rain==null?'-':Math.round(rain)+'%'}</b></div><div class="weatherNow"><span>Prossimo cambio vento</span><b>${change?fmtHour(change.time):'nessun cambio rilevato'}</b>${change?`<small>${esc(localWindName(wname(change.dir)))} ${Math.round(change.speed)} km/h</small>`:''}</div></div><div class="ctHourly">${cards.join('')}</div>`;
      $('weatherStamp').textContent=new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      decorateLocalWind();
      return selected.weather;
    }catch(e){
      if(!selected||Math.abs(selected.lat-__pfcTargetLat)>1e-7||Math.abs(selected.lng-__pfcTargetLng)>1e-7)return null;
      $('weatherBody').innerHTML=`<div class="empty">${esc(e.message)}${navigator.onLine?'':' · ultimo dato salvato resta nel punto'}</div>`;
    }
  };

  // ---------- GPS: segue posizione + orientamento, ma lascia ruotare manualmente ----------
  startGps=function(){
    if(gpsWatch!=null||!navigator.geolocation)return;
    gpsWatch=navigator.geolocation.watchPosition(p=>{
      lastPos={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0),heading:p.coords.heading,speed:p.coords.speed};
      $('gpsBadge').textContent=`GPS ±${lastPos.acc} m`;
      if(!userMarker)userMarker=L.circleMarker([lastPos.lat,lastPos.lng],{radius:9,color:'#fff',weight:4,fillColor:'#2878d8',fillOpacity:1}).addTo(map);
      else userMarker.setLatLng([lastPos.lat,lastPos.lng]);
      if(follow){
        map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});
        if(ctHeadingFollow&&Number.isFinite(+lastPos.heading)&&(+lastPos.speed||0)>.6)setBearing(+lastPos.heading);
      }
      updateCar();
    },()=>{$('gpsBadge').textContent='GPS non disponibile';},{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  };

  // Quando fissi rapidamente un punto, conserva automaticamente il meteo di quel momento.
  const prevSaveCurrent619=saveCurrent;
  saveCurrent=async function(type='Postazione',open=false){
    const before=new Set((state.points||[]).map(x=>x.id));
    const r=await prevSaveCurrent619(type,open);
    const p=(state.points||[]).find(x=>!before.has(x.id));
    if(p&&navigator.onLine){
      try{
        const oldSelected=selected;
        selected={lat:p.lat,lng:p.lng,weather:p.weather||null};
        const snapshot=await weather(p.lat,p.lng);
        if(snapshot){
          p.weather=JSON.parse(JSON.stringify(snapshot));
          p.windName=p.weather.windName||p.windName||'';
          p.windDir=p.weather.windDir||p.windDir||'';
          p.windDeg=p.weather.windDeg;
          p.windSpeed=p.weather.windSpeed;
          p.windGust=p.weather.windGust;
          save();
          if(open){
            $('pointWindName')&&($('pointWindName').value=p.windName||'');
            $('pointWindDir')&&($('pointWindDir').value=p.windDir||'');
            $('pointWindSpeed')&&($('pointWindSpeed').value=p.windSpeed??'');
            $('pointWindGust')&&($('pointWindGust').value=p.windGust??'');
            $('pointWeatherSummary')&&($('pointWeatherSummary').textContent=`${p.weather.condition||''} · ${localWindName(p.windName)} ${p.windSpeed??'-'} km/h · pioggia ${p.weather.rainProbability??'-'}%`);
          }
        }
        if(oldSelected&&!open)selected=oldSelected;
      }catch(e){console.warn('Meteo automatico punto',e)}
    }
    return r;
  };

  // ---------- verifica condizioni appostamenti ----------
  function ensureConditionModal(){
    if(document.getElementById('ctConditionModal'))return;
    const style=document.createElement('style');style.textContent=`
      .ctHourly{display:flex;gap:7px;overflow:auto;padding:9px 1px 2px;margin-top:8px}.ctHour{min-width:150px;display:grid;gap:3px;background:#f4f7f1;border:1px solid #d7d8d0;border-radius:11px;padding:8px;font-size:11px}.ctHour b{font-size:13px}.ctCondResult{border:1px solid #d7d8d0;border-left:6px solid #8c958d;border-radius:13px;padding:11px;margin:8px 0;background:#fff}.ctCondResult.good{border-left-color:#1e8b4e;background:#f1fbf4}.ctCondResult.bad{border-left-color:#b74c3e;background:#fff7f5}.ctCondTitle{display:flex;justify-content:space-between;gap:8px;align-items:center}.ctCondTitle b{font-size:15px}.ctCondMeta{font-size:12px;line-height:1.5;margin-top:5px}.ctGood{color:#14753f;font-weight:900}.ctBad{color:#a3392d;font-weight:900}.ctQuestion{font-size:20px!important;font-weight:900!important}.ctOfflineNote{font-size:11px;color:#657067;margin-top:7px}`;document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='ctConditionModal';modal.className='modal';
    const now=new Date();now.setSeconds(0,0);
    modal.innerHTML=`<div class="dialog" style="max-width:760px;max-height:92vh;overflow:auto"><div class="sectionHead"><div><h2>❓ Verifica condizioni appostamenti</h2><div class="muted">Confronto con vento e condizioni salvate quando hai fissato ogni appostamento</div></div><button id="ctConditionClose" class="iconBtn">✕</button></div><div class="formGrid"><div><label>Data</label><input id="ctConditionDate" type="date" value="${isoLocal(now).slice(0,10)}"></div><div><label>Ora</label><input id="ctConditionTime" type="time" value="${isoLocal(now).slice(11,16)}"></div><div class="full"><div class="actionGrid"><button id="ctCondToday" class="secondary" type="button">Oggi</button><button id="ctCondTomorrow" class="secondary" type="button">Domani</button><button id="ctConditionRun" class="primary" type="button">🌦 Verifica tutti</button></div></div></div><div id="ctConditionSummary" class="ctOfflineNote">Verifico vento, raffiche, probabilità di pioggia e il primo cambio importante nelle ore successive.</div><div id="ctConditionResults"></div></div>`;
    document.body.appendChild(modal);
    $('ctConditionClose').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
    const setDay=plus=>{const d=new Date();d.setDate(d.getDate()+plus);$('ctConditionDate').value=isoLocal(d).slice(0,10)};
    $('ctCondToday').onclick=()=>setDay(0);$('ctCondTomorrow').onclick=()=>setDay(1);$('ctConditionRun').onclick=runConditionCheck;
  }
  function openConditionCheck(){ensureConditionModal();$('ctConditionModal').classList.add('open')};window.__PFC_OPEN_CONDITION_CHECK__=openConditionCheck
  function ensureConditionButton(){
    const right=document.querySelector('.mapTools.right');if(right&&!$('ctConditionBtn')){const b=document.createElement('button');b.id='ctConditionBtn';b.className='mapBtn ctQuestion';b.title='Verifica condizioni appostamenti';b.textContent='?';right.appendChild(b);b.onclick=openConditionCheck}
  }
  function pointBaseWind(p){
    const num=v=>(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))?Number(v):null;
    let deg=num(p.windDeg);if(deg==null)deg=num(p.weather?.windDeg);
    if(deg==null){
      const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];
      const raw=String(p.windName||p.weather?.windName||'');const n=window.PFC_WIND_LABELS?.canonical(raw)||raw.replace(/\s*\(.*?\)\s*/g,'').trim(),ix=names.indexOf(n);
      if(ix>=0)deg=ix*45;
    }
    const speed=num(p.windSpeed)??num(p.weather?.windSpeed);
    const gust=num(p.windGust)??num(p.weather?.windGust);
    const rain=num(p.weather?.rainProbability);
    return {deg,speed,gust,rain};
  }
  async function forecastAtPoint(p,target){
    const day=isoLocal(target).slice(0,10);
    const now=new Date(),sameDay=isoLocal(now).slice(0,10)===day,nearNow=Math.abs(target.getTime()-now.getTime())<=90*60*1000;
    const currentPart=sameDay&&nearNow?'&current=weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m':'';
    const u=`https://pfc-weather.invalid/forecast?latitude=${p.lat}&longitude=${p.lng}${currentPart}&hourly=precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&wind_speed_unit=kmh&timezone=auto&start_date=${day}&end_date=${day}`;
    const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('Meteo non disponibile');const j=await r.json(),h=j.hourly||{};const idx=nearestHourlyIndex(h.time,target.getTime());if(idx<0)throw Error('Orario non disponibile');const change=firstWindChange(h,idx);
    // Se stai verificando "adesso" (o entro circa 90 minuti), uso gli stessi dati
    // correnti usati quando salvi il punto. Così un punto appena fissato non risulta
    // falsamente "diverso" solo perché il confronto prendeva l'ora intera successiva.
    if(sameDay&&nearNow&&j.current){
      return {time:j.current.time||h.time[idx],dir:+j.current.wind_direction_10m||0,speed:+j.current.wind_speed_10m||0,gust:j.current.wind_gusts_10m??null,rain:h.precipitation_probability?.[idx]??null,code:j.current.weather_code,change,live:true};
    }
    return {time:h.time[idx],dir:+h.wind_direction_10m?.[idx]||0,speed:+h.wind_speed_10m?.[idx]||0,gust:h.wind_gusts_10m?.[idx]??null,rain:h.precipitation_probability?.[idx]??null,code:h.weather_code?.[idx],change,live:false};
  }
  function clearConditionLayer(){try{conditionLayer?.clearLayers()}catch{}conditionLayer=null}
  window.__PFC_CLEAR_CONDITION_LAYER__=clearConditionLayer;
  async function runConditionCheck(){
    const date=$('ctConditionDate').value,time=$('ctConditionTime').value||'08:00';if(!date)return toast('Scegli la data');
    const target=new Date(`${date}T${time}:00`);if(Number.isNaN(target.getTime()))return toast('Data o ora non valida');
    const focus=lastPos&&Number.isFinite(+lastPos.lat)&&Number.isFinite(+lastPos.lng)?[+lastPos.lat,+lastPos.lng]:(()=>{const m=map?.getCenter?.();return m?[m.lat,m.lng]:null})();
    let pts=(state.points||[]).filter(p=>{
      const t=String(p?.type||'').toLowerCase();
      return t!=='avvistamento'&&t!=='parcheggio'&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lng);
    });
    // "Verifica tutti" deve davvero controllare TUTTI i punti salvati.
    // Prima venivano esclusi i punti oltre 20 km (e tagliati a 12), facendo apparire
    // erroneamente "nessun punto salvato" quando gli appostamenti erano lontani dal GPS.
    if(focus)pts=pts.map(p=>({p,d:haveSafe(focus,[+p.lat,+p.lng])})).sort((a,b)=>a.d-b.d).map(x=>x.p);
    const out=$('ctConditionResults');if(!pts.length){out.innerHTML='<div class="empty">Non risultano appostamenti/punti salvati. Salva prima almeno un punto dalla mappa.</div>';return}
    if(!navigator.onLine){out.innerHTML='<div class="empty">Per controllare una previsione nuova serve Internet. I punti e i dati salvati restano comunque disponibili offline.</div>';return}
    out.innerHTML='<div class="empty">Controllo gli appostamenti…</div>';$('ctConditionRun').disabled=true;clearConditionLayer();conditionLayer=L.layerGroup().addTo(map);
    const rows=[];
    for(const p of pts){
      try{
        const f=await forecastAtPoint(p,target),base=pointBaseWind(p);let good=false,reason='';
        if(base.deg==null||base.speed==null){reason='Mancano dati meteo di riferimento salvati';}
        else{const dd=angleDiff(base.deg,f.dir),ds=Math.abs(base.speed-f.speed),checks=[dd<=45,ds<=10],parts=[`Δ direzione ${Math.round(dd)}°`,`Δ velocità ${Math.round(ds)} km/h`];if(base.gust!=null&&f.gust!=null&&Number.isFinite(+f.gust)){const dg=Math.abs(base.gust-(+f.gust));checks.push(dg<=15);parts.push(`Δ raffiche ${Math.round(dg)} km/h`)}if(base.rain!=null&&f.rain!=null&&Number.isFinite(+f.rain)){const dr=Math.abs(base.rain-(+f.rain));checks.push(dr<=25);parts.push(`Δ pioggia ${Math.round(dr)}%`)}good=checks.every(Boolean);reason=parts.join(' · ');}
        rows.push({p,f,good,reason,base});
        const color=good?'#1e8b4e':'#b74c3e';L.circleMarker([p.lat,p.lng],{radius:16,color,weight:5,fillColor:color,fillOpacity:.16}).addTo(conditionLayer);
      }catch(e){rows.push({p,error:e.message||'Errore meteo'})}
    }
    const ok=rows.filter(r=>r.good).length;$('ctConditionSummary').innerHTML=`Controllo per <b>${esc(fmtDateTime(target.toISOString()))}</b> · <span class="ctGood">${ok} simili</span> su ${rows.length}. Il verde significa “simile alle condizioni registrate”, non garantisce che il meteo resti invariato.`;
    out.innerHTML=rows.map(r=>{
      if(r.error)return `<div class="ctCondResult"><div class="ctCondTitle"><b>${esc(r.p.name||r.p.type)}</b><span>⚠️</span></div><div class="ctCondMeta">${esc(r.error)}</div></div>`;
      const change=r.f.change?`${fmtHour(r.f.change.time)} → ${esc(localWindName(wname(r.f.change.dir)))} ${Math.round(r.f.change.speed)} km/h`:'nessun cambio importante nelle 12 h successive';
      const ref=r.base.deg==null?'non registrato':`${esc(localWindName(wname(r.base.deg)))} ${Math.round(r.base.speed||0)} km/h`;
      return `<div class="ctCondResult ${r.good?'good':'bad'}"><div class="ctCondTitle"><b>${esc(r.p.name||r.p.type)}</b><span class="${r.good?'ctGood':'ctBad'}">${r.good?'● SIMILE':'● DIVERSA'}</span></div><div class="ctCondMeta">Riferimento salvato: <b>${ref}</b><br>Previsione: <b>${esc(localWindName(wname(r.f.dir)))} ${wdir(r.f.dir)} · ${Math.round(r.f.speed)} km/h</b> · raffiche ${r.f.gust==null?'non disponibili':Math.round(r.f.gust)+' km/h'}<br>🌧 Pioggia: <b>${r.f.rain==null?'non disponibile':Math.round(r.f.rain)+'%'}</b> · 🌦 ${esc(wtext(r.f.code))}<br>↻ Cambio vento: <b>${change}</b><br><span class="muted">${esc(r.reason)}</span></div><div class="rowBtns"><button class="mini" onclick="CT.condMap('${r.p.id}')">🗺 Mappa</button><button class="mini" onclick="CT.edit('${r.p.id}')">✏️ Dettagli</button></div></div>`;
    }).join('');
    $('ctConditionRun').disabled=false;decorateLocalWind(out);
  }

  function haveSafe(a,b){try{return hav(a,b)}catch{return Infinity}}
  function localOfflineBounds(){
    if((map?.getZoom?.()||0)>=13)return map.getBounds();
    const m=lastPos&&Number.isFinite(+lastPos.lat)&&Number.isFinite(+lastPos.lng)?{lat:+lastPos.lat,lng:+lastPos.lng}:map.getCenter();
    const km=4,dLat=km/111.32,dLng=km/(111.32*Math.max(.25,Math.cos(m.lat*Math.PI/180)));
    return L.latLngBounds([m.lat-dLat,m.lng-dLng],[m.lat+dLat,m.lng+dLng]);
  }

  // ---------- salva un'area satellitare da usare con poca rete ----------
  function tileXY(lat,lng,z){const n=2**z,x=Math.floor((lng+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);return {x,y}}
  async function saveOfflineArea(){
    if(!map)return toast('Mappa non pronta');if(!navigator.onLine)return toast('Serve Internet per salvare una nuova area');
    const b=localOfflineBounds(),base=Math.max(13,Math.min(17,Math.round(map.getZoom()))),reqs=[];
    for(const z of [base,Math.min(18,base+1)]){
      const nw=tileXY(b.getNorth(),b.getWest(),z),se=tileXY(b.getSouth(),b.getEast(),z),n=2**z;
      for(let y=Math.max(0,nw.y-1);y<=Math.min(n-1,se.y+1);y++)for(let x=nw.x-1;x<=se.x+1;x++){const xx=((x%n)+n)%n;reqs.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${xx}`)}
    }
    const streetMode=map.hasLayer(street);const all=[...new Set(reqs)].map(u=>{if(!streetMode)return u;const [z,y,x]=u.split('/').slice(-3);return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`});if(all.length>240)return toast('Area troppo grande: ingrandisci la mappa e salva una zona più piccola.');const urls=all;if(!urls.length)return toast('Area non disponibile');
    toast(`Salvo ${urls.length} tessere mappa…`);let done=0;
    try{
      const cache=await caches.open(OFFLINE_TILE_CACHE);
      for(let i=0;i<urls.length;i+=4){const batch=urls.slice(i,i+4);await Promise.allSettled(batch.map(async u=>{const q=new Request(u,{mode:'no-cors',cache:'reload'});const r=await fetch(q);if(r&&(r.ok||r.type==='opaque')){await cache.put(q,r.clone());done++}}));}
      localStorage.setItem('cacciatraccia-offline-area-last',JSON.stringify({at:new Date().toISOString(),count:done,center:map.getCenter(),zoom:base}));toast(done===urls.length?`Zona salvata offline: ${done} tessere`:`Area incompleta: ${done} tessere su ${urls.length}. Riprova prima dell’uscita.`);
    }catch(e){console.warn(e);toast('Salvataggio area incompleto: '+done+' tessere')}
  }
  function ensureOfflineButton(){
    const card=$('page-backup')?.querySelector('.card:last-child');if(card&&!$('ctOfflineAreaBtn')){const b=document.createElement('button');b.id='ctOfflineAreaBtn';b.className='secondary';b.style.marginTop='10px';b.textContent='📥 Salva area mappa attuale offline';b.onclick=()=>{showPage('map');setTimeout(saveOfflineArea,180)};card.appendChild(b)}
  }

  // ---------- backup automatico locale silenzioso ----------
  function autoSnapshot(force=false){
    try{
      const last=+localStorage.getItem(AUTO_SNAP_KEY)||0;if(!force&&Date.now()-last<6*60*60*1000)return;
      const arr=snapshots(),copy=JSON.parse(JSON.stringify(state));arr.unshift({id:'auto-'+Date.now().toString(36),at:new Date().toISOString(),auto:true,data:copy});localStorage.setItem(SNAP_STORE,JSON.stringify(arr.slice(0,25)));localStorage.setItem(AUTO_SNAP_KEY,String(Date.now()));renderSnapshots();
    }catch(e){console.warn('Backup automatico',e)}
  }
  function markAutoSnapshots(){
    document.querySelectorAll('#snapshotsList .item').forEach(el=>{if(el.textContent&&!el.querySelector('.ctAutoMark')){const b=document.createElement('span');b.className='ctAutoMark muted';b.style.marginLeft='6px';b.textContent='backup';el.querySelector('b')?.appendChild(b)}})
  }
  const prevRenderSnapshots=renderSnapshots;
  renderSnapshots=function(){prevRenderSnapshots();markAutoSnapshots()};

  // ---------- condivisione punto con foto quando presente ----------
  async function dataUrlFile(data,name='CacciaTraccia-punto.jpg'){
    if(!data)return null;try{const r=await fetch(data),b=await r.blob();return new File([b],name,{type:b.type||'image/jpeg'})}catch{return null}
  }
  async function sharePointFull(id){
    const p=(state.points||[]).find(x=>x.id===id);if(!p)return;
    const text=pointShareText(p).replace(/Libeccio/g,'Libeccio (Favugna)'),file=await dataUrlFile(p.photo,`CacciaTraccia_${String(p.name||p.type||'punto').replace(/[^a-z0-9_-]+/gi,'_')}.jpg`);
    try{if(file&&navigator.share&&navigator.canShare?.({files:[file]}))return await navigator.share({title:p.name||'Passione Funghi e Caccia',text,files:[file]});if(navigator.share)return await navigator.share({title:p.name||'Passione Funghi e Caccia',text})}catch(e){if(e?.name==='AbortError')return}
    await shareText(text,p.name||'Passione Funghi e Caccia');
  }

  // ---------- integrazione UI / comportamento manuale mappa ----------
  const prevRenderAll=renderAll;
  renderAll=function(){prevRenderAll();decorateLocalWind();};
  const prevBind=bind;
  bind=function(){
    prevBind();ensureConditionModal();ensureConditionButton();ensureOfflineButton();autoSnapshot(false);decorateLocalWind();
    const oldFollow=$('followBtn')?.onclick;if($('followBtn'))$('followBtn').onclick=()=>{oldFollow?.();ctHeadingFollow=false};
    if($('northBtn'))$('northBtn').onclick=()=>{ctHeadingFollow=false;toggleNorthLock()};
    const stopFollowForManualMap=()=>{
      // Blocca immediatamente anche un'eventuale animazione GPS già partita.
      try{map?.stop?.()}catch{}
      follow=false;
      $('followBtn')?.classList.remove('active');
    };
    map?.on('dragstart',stopFollowForManualMap);
    // Al primo contatto manuale con la mappa esci SEMPRE da "Seguimi".
    // Capture=true fa scattare il blocco prima dei gestori touch di Leaflet.
    const mapEl=map?.getContainer?.();
    if(mapEl&&!mapEl.dataset.ctManualPanFix2){
      mapEl.dataset.ctManualPanFix2='1';
      mapEl.addEventListener('pointerdown',stopFollowForManualMap,{capture:true,passive:true});
      mapEl.addEventListener('touchstart',stopFollowForManualMap,{capture:true,passive:true});
      mapEl.addEventListener('touchmove',stopFollowForManualMap,{capture:true,passive:true});
      mapEl.addEventListener('mousedown',stopFollowForManualMap,{capture:true,passive:true});
      mapEl.addEventListener('wheel',stopFollowForManualMap,{capture:true,passive:true});
    }
    window.addEventListener('pagehide',()=>autoSnapshot(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)autoSnapshot(false)});
    const v=$('ctVersionBadge');if(v)v.textContent='• V'+CT_VER;
  };
  window.CT.sharePoint=sharePointFull;
  window.CT.condMap=id=>{const p=(state.points||[]).find(x=>x.id===id);if(!p)return;$('ctConditionModal')?.classList.remove('open');showPage('map');follow=false;$('followBtn')?.classList.remove('active');map.setView([p.lat,p.lng],17,{animate:true});selectMapPoint(p.lat,p.lng)};
})();

// V6.1.11 - aiuto contestuale: pressione prolungata sui simboli/tasti
(function(){
  const HELP_DELAY=650;
  const descriptions={
    locateBtn:'Centra la mappa sulla tua posizione GPS attuale.',
    followBtn:'Attiva o disattiva il seguimento: la mappa si sposta insieme a te.',
    northBtn:'Attiva o disattiva il blocco verso Nord. Quando è spento ruota con due dita.',
    rotateLeftBtn:'Ruota la mappa verso sinistra.',
    rotateRightBtn:'Ruota la mappa verso destra.',
    layersBtn:'Apre la scelta tra mappa satellitare, stradale e livello Venti.',
    ctConditionBtn:'Controlla le condizioni previste sui tuoi appostamenti e le confronta con quelle salvate.',
    quickSightingBtn:'Salva rapidamente un avvistamento nella posizione in cui ti trovi.',
    quickSaveHereBtn:'Fissa un punto nella posizione scelta sulla mappa. Se non hai toccato un punto preciso, usa il centro della mappa.',
    quickTrackBtn:'Apre la Camminata per registrare il percorso GPS della giornata.',
    quickCarBtn:'Memorizza dove hai lasciato l’auto.',
    savePointBtn:'Salva la posizione selezionata tra i tuoi punti.',
    navigateBtn:'Apre Google Maps per raggiungere il punto selezionato.',
    shareSelectedBtn:'Condivide il punto selezionato con le informazioni disponibili.',
    weatherRefreshBtn:'Aggiorna meteo e vento del punto selezionato.',
    parkHereBtn:'Fissa la posizione attuale dell’auto sulla mappa.',
    moveCarBtn:'Permette di aggiornare la posizione salvata dell’auto.',
    returnCarBtn:'Mostra il percorso per ritornare alla posizione dell’auto.',
    clearCarBtn:'Rimuove la posizione dell’auto salvata.',
    fitPointsBtn:'Inquadra sulla mappa tutti i punti salvati visibili.',
    startTrackBtn:'Avvia la registrazione GPS della Camminata.',
    stopTrackBtn:'Termina e salva la Camminata registrata.',
    centerTrackBtn:'Inquadra sulla mappa il percorso della Camminata.',
    trackToCarBtn:'Aiuta a tornare alla posizione dell’auto durante la Camminata.',
    exportJsonBtn:'Esporta un backup completo dei dati di CacciaTraccia.',
    exportTxtBtn:'Esporta un file di testo con le coordinate dei punti salvati.',
    makeSnapshotBtn:'Crea una copia locale dello stato attuale dei dati.',
    persistBtn:'Chiede al telefono di conservare con maggiore priorità i dati locali dell’app.',
    syncNowBtn:'Salva una copia privata completa nel tuo account quando sei online.',
    accountBtn:'Mostra il tuo account e consente di uscire.',
    ctOfflineAreaBtn:'Salva nella cache l’area di mappa visualizzata per usarla con poca rete.',
    ctAudioToggle:'Apre o chiude il lettore degli audio personali.',
    ctAudioPrev:'Passa all’audio personale precedente.',
    ctAudioPlay:'Avvia o mette in pausa l’audio personale.',
    ctAudioNext:'Passa all’audio personale successivo.',
    ctAudioLoop:'Attiva o disattiva la ripetizione continua dell’audio personale.'
  };

  let timer=null,startX=0,startY=0,active=null,tip=null,suppressClickUntil=0;

  function ensureTip(){
    if(tip)return tip;
    const style=document.createElement('style');
    style.textContent=`
      #ctLongHelp{position:fixed;left:50%;bottom:128px;transform:translateX(-50%);z-index:4000;width:min(88vw,430px);background:#173f2bf2;color:#fff;border:1px solid #ffffff30;border-radius:16px;padding:13px 15px;box-shadow:0 8px 28px #0007;font:700 14px/1.4 system-ui;text-align:left;opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease}
      #ctLongHelp.show{opacity:1;transform:translateX(-50%) translateY(-5px)}
      #ctLongHelp b{display:block;font-size:15px;margin-bottom:4px}
      #ctLongHelp small{display:block;opacity:.78;font-weight:600;margin-top:5px}
    `;
    document.head.appendChild(style);
    tip=document.createElement('div');tip.id='ctLongHelp';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');
    document.body.appendChild(tip);return tip;
  }

  function labelFor(el){
    return (el.getAttribute('aria-label')||el.getAttribute('title')||el.querySelector?.('span')?.textContent||el.textContent||'Funzione').trim().replace(/\s+/g,' ');
  }
  function descriptionFor(el){
    if(el.dataset?.ctHelp)return el.dataset.ctHelp;
    if(el.id&&descriptions[el.id])return descriptions[el.id];
    const title=el.getAttribute?.('title');
    if(title&&title.trim())return title.trim();
    const label=labelFor(el);
    if(!label)return '';
    return 'Questo comando serve per: '+label.toLowerCase()+'.';
  }
  function showHelp(el){
    const desc=descriptionFor(el);if(!desc)return;
    const box=ensureTip(),name=labelFor(el);
    box.innerHTML='<b>'+esc(name)+'</b>'+esc(desc)+'<small>Rilascia per chiudere. Il tocco normale continua a eseguire il comando.</small>';
    box.classList.add('show');suppressClickUntil=Date.now()+750;
    try{navigator.vibrate?.(35)}catch{}
  }
  function hideHelp(){clearTimeout(timer);timer=null;active=null;tip?.classList.remove('show')}
  function start(el,e){
    if(el.dataset.ctNoLongHelp==='1')return;
    if(e.button!=null&&e.button!==0)return;
    active=el;startX=e.clientX??0;startY=e.clientY??0;
    clearTimeout(timer);timer=setTimeout(()=>{if(active===el)showHelp(el)},HELP_DELAY);
  }
  function move(e){
    if(!active)return;const x=e.clientX??0,y=e.clientY??0;
    if(Math.hypot(x-startX,y-startY)>14)hideHelp();
  }
  function bindHelp(){
    ensureTip();
    const candidates=document.querySelectorAll('button,.mapBtn,.quickAction,nav button,.iconBtn');
    candidates.forEach(el=>{
      if(el.dataset.ctNoLongHelp==='1'||el.id==='teamPTT'||el.id==='teamMapTalk'||el.dataset.ctLongHelpBound==='1')return;
      const desc=descriptionFor(el);if(!desc)return;
      el.dataset.ctLongHelpBound='1';
      el.addEventListener('pointerdown',e=>start(el,e),{passive:true});
      el.addEventListener('pointermove',move,{passive:true});
      el.addEventListener('pointerup',hideHelp,{passive:true});
      el.addEventListener('pointercancel',hideHelp,{passive:true});
      el.addEventListener('pointerleave',hideHelp,{passive:true});
      el.addEventListener('contextmenu',e=>{e.preventDefault();showHelp(el);setTimeout(hideHelp,2200)});
      el.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
    });
  }

  const observer=new MutationObserver(()=>bindHelp());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  const prevBind=bind;
  bind=function(){prevBind();bindHelp();const v=$('ctVersionBadge');if(v)v.textContent='• V6.3.0'};
})();

// V6.3.0 FINAL - base 6.1.11 funzionante + correzioni richieste + funghi
(function(){
  const FINAL_VER='6.3.4';
  let mushMode=false;
  const sightChecks=new Map();

  // ---------- UI generale ----------
  function addFinalStyles(){
    if(document.getElementById('ctFinalStyles'))return;
    const s=document.createElement('style');s.id='ctFinalStyles';
    s.textContent=
      '.quickAction.mushroom{background:#e7f0df;color:#31531c}.quickAction.identify{background:#e5eef8;color:#244f75}'+
      '.ctMushPin{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#fff;border:3px solid #4d7133;box-shadow:0 2px 7px #0005;font-size:23px}'+
      '.ctCarOff{position:relative;display:inline-block}.ctCarOff:after{content:"";position:absolute;left:-3px;right:-3px;top:48%;height:4px;border-radius:3px;background:#b5362c;transform:rotate(-42deg);box-shadow:0 0 0 1px #fff8}'+
      '.ctSightCheck{display:none;margin:10px 0 12px;padding:11px;border:1px solid #d7d8d0;border-radius:14px;background:#f7f8f4}.ctSightGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ctSightGrid input{margin-top:4px}.ctSightRun{width:100%;margin-top:8px}.ctSightSummary{font-size:12px;color:#657067;margin-top:7px}'+
      '.ctSightStatus{margin:8px 0;padding:8px 10px;border-radius:11px;font-size:12px;font-weight:800}.ctSightStatus.good{background:#eef9f1;color:#166d3c;border:1px solid #b9dfc5}.ctSightStatus.bad{background:#fff3f1;color:#9c382f;border:1px solid #edc7c1}.ctSightStatus.missing{background:#f2f3f0;color:#667069;border:1px solid #d8dbd5}.ctSightStatus small{display:block;margin-top:3px;font-weight:650;opacity:.9}'+
      '@media(max-width:520px){.mapQuickActions{grid-template-columns:repeat(3,1fr)!important}.quickAction{min-height:64px}.quickAction span{font-size:10px}}';
    document.head.appendChild(s);
  }

  function renameApp(){
    document.title='Passione Funghi e Caccia';
    const h=document.querySelector('.brand h1');if(h)h.textContent='Passione Funghi e Caccia';
    const sm=document.querySelector('.brand small');if(sm)sm.textContent='GPS • caccia • funghi • meteo • diario • offline';
    const q=document.querySelector('#quickTrackBtn span');if(q)q.textContent='Camminata';
    const bird=document.querySelector('#quickSightingBtn span');if(bird)bird.textContent='Avv. uccelli';
    const label=document.querySelector('#pointSpecies')?.closest('div')?.querySelector('label');if(label&&!mushMode)label.textContent='Uccelli / funghi trovati';
  }

  // ---------- Seguimi verde/bianco ----------
  function syncFollow(){
    const b=$('followBtn');if(!b)return;
    b.classList.toggle('active',!!follow);
    b.style.background=follow?'#173f2b':'#fff';
    b.style.color=follow?'#fff':'#173f2b';
    b.title=follow?'Seguimi: ATTIVO':'Seguimi: DISATTIVO';
    b.setAttribute('aria-pressed',follow?'true':'false');
    b.dataset.ctHelp=follow?'Seguimi attivo: la mappa segue la tua posizione. Tocca per disattivare.':'Seguimi disattivato: la mappa resta ferma. Tocca per attivare.';
  }
  const baseToggleFollow=toggleFollow;
  toggleFollow=function(){baseToggleFollow();syncFollow();};

  // ---------- Auto: un solo pulsante, trascinamento con pressione lunga ----------
  function syncCarButton(){
    const b=$('quickCarBtn');if(!b)return;
    const ic=b.querySelector('b'),tx=b.querySelector('span');
    if(state.car){
      if(ic){ic.className='ctCarOff';ic.textContent='🚗';}
      if(tx)tx.textContent='Rimuovi auto';
      b.dataset.ctHelp='Rimuove il punto auto. Per spostarlo tieni premuto il simbolo dell’auto sulla mappa e trascinalo.';
    }else{
      if(ic){ic.className='';ic.textContent='🚗';}
      if(tx)tx.textContent='Segna auto';
      b.dataset.ctHelp='Memorizza dove hai parcheggiato.';
    }
    const r=$('ctReturnCarBtn');if(r)r.style.display=state.car?'':'none';
  }
  function removeCarFinal(){
    try{if(returnLine){map.removeLayer(returnLine);returnLine=null}}catch{}
    state.car=null;save();renderCar();toast('Posizione auto rimossa');
  }
  async function carToggle(){
    if(state.car){removeCarFinal();return}
    await parkCar();syncCarButton();
  }
  function bindCarDrag(marker){
    const el=marker&&marker.getElement&&marker.getElement();if(!el||el.dataset.ctDragFinal==='1')return;
    el.dataset.ctDragFinal='1';el.style.touchAction='none';
    let timer=null,drag=false,pid=null,sx=0,sy=0;
    const stopTimer=()=>{if(timer){clearTimeout(timer);timer=null}};
    el.addEventListener('pointerdown',e=>{
      if(e.button!=null&&e.button!==0)return;
      pid=e.pointerId;sx=e.clientX||0;sy=e.clientY||0;drag=false;stopTimer();
      timer=setTimeout(()=>{drag=true;try{el.setPointerCapture(pid)}catch{};try{map.dragging.disable()}catch{};toast('Trascina l’auto nel nuovo punto')},600);
      e.stopPropagation();
    },{passive:true});
    el.addEventListener('pointermove',e=>{
      if(!drag){if(Math.hypot((e.clientX||0)-sx,(e.clientY||0)-sy)>14)stopTimer();return}
      e.preventDefault();e.stopPropagation();
      try{marker.setLatLng(map.mouseEventToLatLng(e))}catch{}
    },{passive:false});
    const finish=e=>{
      const moved=drag;stopTimer();
      if(moved){
        drag=false;try{map.dragging.enable()}catch{}
        const ll=marker.getLatLng();state.car={lat:ll.lat,lng:ll.lng,updatedAt:new Date().toISOString()};save();updateCar();toast('Posizione auto spostata');
      }
      if(e)e.stopPropagation();
    };
    el.addEventListener('pointerup',finish,{passive:true});
    el.addEventListener('pointercancel',finish,{passive:true});
    el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()},{capture:true});
    el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation()});
  }
  function ensureReturnCarButton(){
    if($('ctReturnCarBtn'))return;
    const left=document.querySelector('.mapTools.left');if(!left)return;
    const b=document.createElement('button');b.id='ctReturnCarBtn';b.className='mapBtn';b.title='Rientro auto';b.textContent='↩🚗';b.style.fontSize='14px';left.appendChild(b);
    b.onclick=carReturn;b.dataset.ctHelp='Mostra la linea di rientro verso l’auto salvata.';
  }
  renderCar=function(){
    if(!map){syncCarButton();return}
    if(carMarker){try{map.removeLayer(carMarker)}catch{}carMarker=null}
    if(state.car){
      carMarker=L.marker([state.car.lat,state.car.lng],{icon:L.divIcon({className:'',html:'<div style="font-size:30px;filter:drop-shadow(0 2px 2px #0005)">🚗</div>',iconSize:[36,36],iconAnchor:[18,18]})});
      carMarker.addTo(map);
      setTimeout(()=>bindCarDrag(carMarker),0);
    }
    updateCar();syncCarButton();
  };
  function hideOldAutoCard(){const p=$('parkHereBtn');const c=p&&p.closest('.card');if(c)c.style.display='none';}

  // ---------- Avvistamenti: scegli giorno/ora e mostra verde/rosso + fino a ----------
  const pad=n=>String(n).padStart(2,'0');
  function localDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function hour(v){try{return new Date(v).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}catch{return '-'}}
  function windName(deg){const a=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];return a[Math.round((((+deg||0)%360)+360)%360/45)%8]}
  function windDir(deg){const a=['N','NE','E','SE','S','SO','O','NO'];return a[Math.round((((+deg||0)%360)+360)%360/45)%8]}
  function ang(a,b){return Math.abs((((+a||0)-(+b||0)+540)%360)-180)}
  const meteoNumber=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
  function baseWind(p){
    let d=meteoNumber(p.windDeg)??meteoNumber(p.weather?.windDeg);
    if(d==null){const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];const raw=String(p.windName||p.weather?.windName||'');const n=window.PFC_WIND_LABELS?.canonical(raw)||raw.replace(/\s*\(.*?\)\s*/g,'').trim();const i=names.indexOf(n);if(i>=0)d=i*45;}
    return {d,s:meteoNumber(p.windSpeed)??meteoNumber(p.weather?.windSpeed)};
  }
  function nearest(times,t){let ix=-1,bd=Infinity;(times||[]).forEach((x,i)=>{const q=Math.abs(new Date(x).getTime()-t.getTime());if(q<bd){bd=q;ix=i}});return ix}
  function similar(p,h,i){
    const b=baseWind(p);if(b.d==null||b.s==null)return {ok:false,missing:true};
    const d=meteoNumber(h.wind_direction_10m?.[i]),s=meteoNumber(h.wind_speed_10m?.[i]),r=meteoNumber(h.precipitation_probability?.[i]);if(d==null||s==null||r==null)return {ok:false,missing:true};
    return {ok:ang(b.d,d)<=45&&Math.abs(b.s-s)<=10&&r<=55,missing:false,d,s,r};
  }
  async function checkSighting(p,target){
    const next=new Date(target);next.setDate(next.getDate()+1);
    const url='https://pfc-weather.invalid/forecast?latitude='+encodeURIComponent(p.lat)+'&longitude='+encodeURIComponent(p.lng)+'&hourly=precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&wind_speed_unit=kmh&timezone=auto&start_date='+localDate(target)+'&end_date='+localDate(next);
    const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('Meteo non disponibile');
    const j=await res.json(),h=j.hourly||{},i=nearest(h.time,target);if(i<0)throw Error('Orario non disponibile');
    const now=similar(p,h,i);if(now.missing)return {missing:true,ok:false};
    let until=null;
    if(now.ok){let k=i+1;for(;k<Math.min(h.time.length,i+13);k++)if(!similar(p,h,k).ok)break;until=h.time[Math.min(k,h.time.length-1)]||null}
    let change=null;for(let k=i+1;k<Math.min(h.time.length,i+13);k++){const d=meteoNumber(h.wind_direction_10m?.[k]),s=meteoNumber(h.wind_speed_10m?.[k]);if(d==null||s==null)continue;if(ang(now.d,d)>=45||Math.abs(now.s-s)>=12){change=h.time[k];break}}
    return {ok:now.ok,missing:false,d:now.d,s:now.s,r:now.r,until,change};
  }
  function ensureSightCheck(){
    if($('ctSightingCheck'))return;
    const tabs=document.querySelector('#page-diary .tabs');if(!tabs)return;
    const d=new Date();d.setHours(d.getHours()+1,0,0,0);
    const box=document.createElement('div');box.id='ctSightingCheck';box.className='ctSightCheck';
    box.innerHTML='<b>🌦 Quando vuoi partire?</b><div class="muted" style="margin:3px 0 8px">Confronto gli avvistamenti uccelli con vento e meteo registrati.</div><div class="ctSightGrid"><label>Giorno<input id="ctSightingDate" type="date" value="'+localDate(d)+'"></label><label>Ora<input id="ctSightingTime" type="time" value="'+pad(d.getHours())+':00"></label></div><button id="ctSightingRun" class="primary ctSightRun" type="button">● Controlla avvistamenti</button><div id="ctSightingSummary" class="ctSightSummary">Verde = condizioni simili; mostro anche fino a quando restano simili.</div>';
    tabs.insertAdjacentElement('afterend',box);$('ctSightingRun').onclick=runSightChecks;
  }
  async function runSightChecks(){
    const date=$('ctSightingDate')?.value,time=$('ctSightingTime')?.value||'08:00';if(!date)return toast('Scegli il giorno');
    if(!navigator.onLine)return toast('Serve Internet per controllare le previsioni');
    const target=new Date(date+'T'+time+':00'),pts=(state.points||[]).filter(p=>p.type==='Avvistamento'&&p.sightingKind!=='mushroom'&&validCoords(p));
    if(!pts.length){$('ctSightingSummary').textContent='Nessun avvistamento uccelli salvato.';return}
    sightChecks.clear();let good=0;$('ctSightingRun').disabled=true;
    for(let i=0;i<pts.length;i++){
      $('ctSightingSummary').textContent='Controllo '+(i+1)+' di '+pts.length+'…';
      try{const z=await checkSighting(pts[i],target);sightChecks.set(pts[i].id,z);if(z.ok)good++}catch(e){sightChecks.set(pts[i].id,{error:e.message||'Errore'})}
      decorateSightChecks();
    }
    $('ctSightingSummary').innerHTML='<b>'+good+'</b> avvistamenti con condizioni simili su '+pts.length+' · '+date+' alle '+time+'.';$('ctSightingRun').disabled=false;
  }
  function decorateSightChecks(){
    const host=$('historyList');if(!host)return;
    host.querySelectorAll('.ctSightStatus').forEach(x=>x.remove());
    host.querySelectorAll('button').forEach(btn=>{
      const code=btn.getAttribute('onclick')||'',m=code.match(/CT\.openHistoryPoint\('([^']+)'\)/);if(!m)return;
      const z=sightChecks.get(m[1]);if(!z)return;
      const item=btn.closest('.item');if(!item)return;const box=document.createElement('div');
      if(z.error){box.className='ctSightStatus missing';box.textContent='⚠️ '+z.error}
      else if(z.missing){box.className='ctSightStatus missing';box.innerHTML='● DATI INSUFFICIENTI<small>Manca il vento salvato per il confronto.</small>'}
      else if(z.ok){box.className='ctSightStatus good';box.innerHTML='● CONDIZIONI SIMILI'+(z.until?' · fino alle '+hour(z.until):'')+'<small>💨 '+windName(z.d)+' '+windDir(z.d)+' · '+Math.round(z.s)+' km/h · 🌧 '+Math.round(z.r)+'%'+(z.change?' · cambio vento '+hour(z.change):'')+'</small>'}
      else{box.className='ctSightStatus bad';box.innerHTML='● CONDIZIONI DIVERSE<small>💨 '+windName(z.d)+' '+windDir(z.d)+' · '+Math.round(z.s)+' km/h · 🌧 '+Math.round(z.r)+'%'+(z.change?' · cambio vento '+hour(z.change):'')+'</small>'}
      const row=item.querySelector('.rowBtns');row?item.insertBefore(box,row):item.appendChild(box);
    });
  }

  // ---------- Funghi: foto e appostamento personale, senza riconoscimento ----------
  async function quickMush(){
    openSelectedObservation(true);
  }
  function mushIcon(){return L.divIcon({className:'',html:'<div class="ctMushPin">🍄</div>',iconSize:[39,39],iconAnchor:[19,35]})}

  // conserva il filtro giorno per postazioni, ma gli avvistamenti restano sempre visibili
  renderMarkers=function(){
    if(!markerLayer)return;markerLayer.clearLayers();
    const day=$('ctHuntDay')?.value||localStorage.getItem('cacciatraccia-hunt-day-v1')||localDay();
    (state.points||[]).forEach(p=>{
      if(!validCoords(p)||!pointMatchesMode(p))return;if(activityMode()!=='mushroom'&&p.type!=='Avvistamento'&&!matchesPostDay(p,day))return;
      const ic=p.type==='Avvistamento'&&p.sightingKind==='mushroom'?mushIcon():icon(p.type);
      const m=L.marker([p.lat,p.lng],{icon:ic});m.addTo(markerLayer);m.on('click',e=>{L.DomEvent.stopPropagation(e);fillModal(p)});
    });
  };

  const baseFill=fillModal;
  fillModal=function(p){
    mushMode=p?p.sightingKind==='mushroom':activityMode()==='mushroom';baseFill(p);
    const lab=$('pointSpecies')?.closest('div')?.querySelector('label');if(lab)lab.textContent=mushMode?'Nome fungo (facoltativo)':'Uccelli / funghi trovati';
    if($('pointSpecies'))$('pointSpecies').placeholder=mushMode?'Nome inserito da te':'es. tordi, colombacci, porcini…';
    const photo=$('pointPhoto');if(!photo)return;
    if(mushMode)photo.setAttribute('capture','environment');else photo.removeAttribute('capture');
    photo.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const current=editing;try{const data=await fileData(f);if(editing===current&&photo.files[0]===f)$('pointPhotoPreview').innerHTML='<img src="'+data+'" style="max-width:100%;border-radius:12px">';}catch(e){toast(e.message)}};
  };

  const baseRenderDiary=renderDiary;
  renderDiary=function(){
    baseRenderDiary();ensureSightCheck();const b=$('ctSightingCheck');if(b){let hunt=true;try{hunt=JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode!=='mushroom'}catch{}b.style.display=hunt&&historyFilter==='sightings'?'block':'none';}
    (state.points||[]).filter(p=>p.sightingKind==='mushroom').forEach(p=>{
      const btn=[...document.querySelectorAll('#historyList button')].find(x=>(x.getAttribute('onclick')||'').includes("'"+p.id+"'")),item=btn?.closest('.item');if(!item)return;
      const title=item.querySelector('b');if(title)title.textContent='🍄 '+(p.species||p.name||'Fungo trovato');
      [...item.querySelectorAll('div')].forEach(d=>{if(/Giorno caccia/.test(d.textContent||''))d.innerHTML=d.innerHTML.replace('Giorno caccia','Giorno uscita')});
    });
    decorateSightChecks();
  };

  const basePointShare=pointShareText;
  pointShareText=function(p){
    if(!p||p.sightingKind!=='mushroom'){
      const t=basePointShare(p);return String(t).replaceAll('CacciaTraccia Italia','Passione Funghi e Caccia');
    }
    return (p.species||p.name||'Fungo trovato')+'\nTipo: Fungo trovato\nData/ora: '+when(p.createdAt)+'\nGiorno uscita: '+(p.huntDate||'-')+'\nCoordinate: '+p.lat+', '+p.lng+'\nVento: '+(p.windName||p.weather?.windName||'-')+' '+(p.windSpeed??p.weather?.windSpeed??'-')+' km/h\nNote: '+(p.notes||'-')+'\nGoogle Maps: https://www.google.com/maps?q='+p.lat+','+p.lng;
  };

  const oldOpenHistory=window.CT&&window.CT.openHistoryPoint;
  if(oldOpenHistory)window.CT.openHistoryPoint=async function(id){const r=await oldOpenHistory(id);const p=state.points.find(x=>x.id===id);if(p?.sightingKind==='mushroom'&&$('selectedTitle'))$('selectedTitle').textContent='🍄 '+(p.species||p.name||'Fungo trovato');return r};

  // ---------- bind finale ----------
  const baseBind=bind;
  bind=function(){
    baseBind();addFinalStyles();renameApp();ensureReturnCarButton();hideOldAutoCard();ensureSightCheck();
    const f=$('followBtn');if(f){f.onclick=()=>{toggleFollow();syncFollow()};syncFollow()}
    const car=$('quickCarBtn');if(car)car.onclick=carToggle;
    const mush=$('quickMushroomBtn');if(mush){mush.onclick=quickMush;mush.dataset.ctHelp='Aggiungi foto e note, poi salva l’appostamento nel diario.'}

    const backup=$('backupQuickBtn');if(backup)backup.onclick=()=>showPage('backup');
    map?.on('dragstart',()=>{if(follow){follow=false;syncFollow()}});
    syncCarButton();
    const v=$('ctVersionBadge');if(v)v.textContent='• V'+FINAL_VER;
  };

  const baseRenderAll=renderAll;
  renderAll=function(){baseRenderAll();renameApp();syncFollow();syncCarButton()};
})();

// One GPS controller for startup, locate, resume and lazy-loaded features.
(function(){
  let pending=null, retryTimer=null, retries=0, generation=0, watchTimer=null;
  const badge=t=>{const el=$('gpsBadge');if(el)el.textContent=t;};
  const message=e=>e?.code===1?'GPS: autorizzazione negata':e?.code===2?'GPS: posizione non disponibile':'GPS: segnale debole · premi ◎ per riprovare';
  const valid=c=>c&&typeof c.latitude==='number'&&typeof c.longitude==='number'&&Number.isFinite(c.latitude)&&Number.isFinite(c.longitude)&&Math.abs(c.latitude)<=90&&Math.abs(c.longitude)<=180;
  function followUi(on){
    follow=!!on;
    const b=$('followBtn');
    if(b){b.classList.toggle('active',follow);b.setAttribute('aria-pressed',String(follow));b.title=follow?'Seguimi: ATTIVO':'Seguimi: DISATTIVO';b.style.background='';b.style.color='';}
  }
  function apply(raw){
    if(!valid(raw?.coords))throw Object.assign(new Error('Coordinate GPS non valide'),{code:2});
    const c=raw.coords;
    lastPos={lat:c.latitude,lng:c.longitude,acc:Math.round(c.accuracy||0),heading:typeof c.heading==='number'?c.heading:null,speed:typeof c.speed==='number'?c.speed:null};
    retries=0;
    if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
    badge('GPS ±'+lastPos.acc+' m');
window.dispatchEvent(new CustomEvent('pfc:position',{detail:{...lastPos}}));
    if(map){
      if(!userMarker)userMarker=L.circleMarker([lastPos.lat,lastPos.lng],{radius:9,color:'#fff',weight:4,fillColor:'#2878d8',fillOpacity:1}).addTo(map);
      else userMarker.setLatLng([lastPos.lat,lastPos.lng]);
      if(follow)map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});
      updateCar();
    }
    return lastPos;
  }
  function once(opts){
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish=(err,p)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(p);};
      // Some Android WebViews never invoke either native callback.
      const timer=setTimeout(()=>finish({code:3}),opts.timeout+1000);
      try{navigator.geolocation.getCurrentPosition(p=>finish(null,p),e=>finish(e),opts);}catch(e){finish(e);}
    });
  }
  function stopWatch(){
    generation++;
    clearTimeout(watchTimer);watchTimer=null;
    if(gpsWatch!=null){try{navigator.geolocation.clearWatch(gpsWatch);}catch{}gpsWatch=null;}
  }
  function retry(){
    if(document.hidden||retryTimer)return;
    if(retries>=3){badge('GPS: premi ◎ per riprovare');return;}
    retryTimer=setTimeout(()=>{retryTimer=null;startGps();},[2500,5000,9000][retries++]);
  }
  function watch(){
    if(gpsWatch!=null||document.hidden||!navigator.geolocation)return;
    const token=++generation;
    const fail=e=>{if(token!==generation)return;stopWatch();badge(message(e));if(e?.code!==1)retry();};
    const arm=()=>{clearTimeout(watchTimer);watchTimer=setTimeout(()=>fail({code:3}),26000);};
    arm();
    try{
      gpsWatch=navigator.geolocation.watchPosition(raw=>{
        if(token!==generation)return;
        try{apply(raw);arm();}catch(e){fail(e);}
      },fail,{enableHighAccuracy:true,maximumAge:10000,timeout:24000});
    }catch(e){fail(e);}
  }
  function request(){
    if(pending)return pending;
    if(!navigator.geolocation){badge('GPS non disponibile');return Promise.resolve(null);}
    badge('GPS: ricerca posizione…');
    pending=(async()=>{
      try{
        let raw;
        try{raw=await once({enableHighAccuracy:false,timeout:8000,maximumAge:10000});}
        catch(e){if(e?.code===1)throw e;raw=await once({enableHighAccuracy:true,timeout:15000,maximumAge:10000});}
        const result=apply(raw);watch();return result;
      }catch(e){badge(message(e));if(e?.code!==1)retry();return null;}
      finally{pending=null;}
    })();
    return pending;
  }
  getFix=request;
  startGps=function(){if(gpsWatch!=null)return Promise.resolve(lastPos);return request();};
  locate=function(){
    retries=0;if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
    followUi(true);
    // Centering happens only in apply(), respecting a drag during the pending fix.
    return request();
  };
  toggleFollow=function(){followUi(!follow);if(follow){if(lastPos&&map)map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});else request();}toast(follow?'Seguimi attivo':'Seguimi disattivato');};
  const baseBind=bind;
  bind=function(){
    baseBind();
    $('locateBtn').onclick=locate;$('followBtn').onclick=toggleFollow;
    const stop=()=>followUi(false);
    map.on('dragstart',stop);
    map.getContainer().addEventListener('pointerdown',e=>{if(!e.target.closest('.leaflet-control'))stop();},{passive:true});
    followUi(follow);
  };
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stopWatch();clearTimeout(retryTimer);retryTimer=null;}
    else {retries=0;startGps();}
  });
  window.addEventListener('pageshow',()=>{if(map&&!document.hidden&&gpsWatch==null)startGps();});
  window.__PFC_FINAL_DIAG__=()=>({version:'6.9.8',follow,lastPos:lastPos?{...lastPos}:null,gpsWatchActive:gpsWatch!=null,gpsPending:!!pending,retries,selected:selected?{lat:selected.lat,lng:selected.lng}:null,center:map?.getCenter?.()});
  document.documentElement.dataset.pfcVersion='6.9.8';
})();

const __pfc6621SafeStartGps=startGps,__pfc6621SafeGetFix=getFix,__pfc6621SafeLocate=locate;

window.__PFC6621_RESTORE_SAFE__=()=>{startGps=__pfc6621SafeStartGps;getFix=__pfc6621SafeGetFix;locate=__pfc6621SafeLocate;};


window.__PFC_APP_STATUS__={version:'6.9.8',state:'loading'};
const setBootStatus=(state,error=null)=>{
  window.__PFC_APP_STATUS__={version:'6.9.10-meteo',state,error};
  const pill=$('netPill');if(pill){pill.textContent=state==='ready'?'v6.9.10':state==='error'?'Avvio da riprovare':'Caricamento…';pill.title=error||'Passione Funghi e Caccia 6.9.8';}
  window.dispatchEvent(new CustomEvent('pfc:ready',{detail:window.__PFC_APP_STATUS__}));
};
setBootStatus('loading');
window.__PFC_BOOT_READY__.then(()=>{
 try{
   // V6.6.1 - controlli modalità, ATC/regione, aree protette, GPS stabile e radar orizzontale
(function(){
  const FIX_VER='6.6.2';
  const CFG_KEY='pfc-v661-settings';
  const REGIONS=['Puglia'];
  let cfg={mode:'hunt',region:'Puglia',detectedRegion:'',province:'',atc:''};
  let protectedWmsLayer=null, protectedOsmLayer=null, radarOpen=false, radarHeading=null, radarListener=null;
  let detectBusy=false,lastDetectTry=0;
  const radarPrevDistances=new Map();
  try{cfg={...cfg,...JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}}catch{}
  cfg.region='Puglia';try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch{}
  const q=id=>document.getElementById(id);
  const persist=()=>{try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch{}};
  const clamp360=n=>((n%360)+360)%360;
  const diffAngle=(a,b)=>Math.abs((((a-b)+540)%360)-180);
  const kmDist=(a,b)=>{const R=6371,d2r=Math.PI/180,dLat=(b.lat-a.lat)*d2r,dLon=(b.lng-a.lng)*d2r,x=Math.sin(dLat/2)**2+Math.cos(a.lat*d2r)*Math.cos(b.lat*d2r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  const bearing=(a,b)=>{const r=Math.PI/180,p1=a.lat*r,p2=b.lat*r,dl=(b.lng-a.lng)*r;return clamp360(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/r);};

  function addStyles(){
    if(q('ct661Styles'))return;
    const s=document.createElement('style');s.id='ct661Styles';s.textContent=`
      .ct661{border:1px solid #b8c8b9;background:linear-gradient(180deg,#fffef9,#f2f7f1)}
      .ctModeRow{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0 10px}.ctModeBtn{border:1px solid #cbd4ca;background:#fff;border-radius:12px;padding:10px;font-weight:900}.ctModeBtn.active{background:#173f2b;color:#fff;border-color:#173f2b}
      .ct661Grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ct661Grid .full{grid-column:1/-1}.ct661Status{padding:9px;border-radius:11px;background:#edf3ed;font-size:12px;line-height:1.45}.ct661Actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.ct661Actions button{min-height:48px}
      .ctCompareHero{width:100%;margin-top:9px;background:#184f31;color:#fff;border:0;border-radius:13px;padding:13px;font-weight:900;font-size:15px;box-shadow:0 5px 16px #173f2b33}.ctCalendar{border-left:5px solid #986718}.ctCalendar .actionGrid{grid-template-columns:1fr 1fr}
      .ctProtButtons{display:grid;grid-template-columns:1fr;gap:8px}.ctProtNote{font-size:11px;color:#687069;line-height:1.45;margin-top:8px}
      .ctRadarDialog{background:#102117;color:#fff}.ctRadarStage{position:relative;height:290px;border-radius:16px;overflow:hidden;background:#07110c;margin:10px 0 8px}.ctRadarVideo{width:100%;height:100%;object-fit:cover;display:block;opacity:.72}.ctRadarStage .ctRadarCompass{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;background:radial-gradient(circle,#214c3277,#10211755 68%)}.ctRadarCameraMsg{position:absolute;left:10px;right:10px;bottom:8px;text-align:center;background:#0009;padding:6px 8px;border-radius:10px;font-size:11px}.ctRadarCompass{width:220px;height:220px;border-radius:50%;margin:12px auto;border:3px solid #ffffff88;position:relative;background:radial-gradient(circle,#214c32,#102117 68%)}.ctRadarCompass:before{content:'▲';position:absolute;left:50%;top:10px;transform:translateX(-50%);font-size:26px;color:#fff}.ctRadarCompass:after{content:'';position:absolute;left:50%;top:50%;width:3px;height:84px;background:#f1d36b;transform-origin:50% 100%;transform:translate(-50%,-100%) rotate(var(--radar-rot,0deg));border-radius:4px}.ctRadarDeg{text-align:center;font-size:34px;font-weight:900}.ctRadarFlat{text-align:center;font-size:12px;opacity:.85}.ctRadarList{display:grid;gap:7px;margin-top:12px}.ctRadarItem{background:#ffffff12;border:1px solid #ffffff2d;border-radius:12px;padding:10px}.ctRadarItem b{display:block}.ctRadarAway{color:#f0c98b;font-size:11px}.ctRadarClose{background:#fff;color:#173f2b}.ctRadarHint{text-align:center;font-size:11px;opacity:.78;margin:6px 0 0}
      @media(max-width:520px){.ct661Actions{grid-template-columns:1fr 1fr}.ct661Actions button:last-child{grid-column:1/-1}.ct661Grid{grid-template-columns:1fr}.ct661Grid .full{grid-column:1}.ctRadarCompass{width:190px;height:190px}}
    `;document.head.appendChild(s);
  }

  function ensureControlCard(){
    const page=q('page-map');if(!page||q('ct661Card'))return;
    const card=document.createElement('div');card.id='ct661Card';card.className='card ct661';
    card.innerHTML=`<div class="sectionHead"><div><h2 style="margin-bottom:2px">🧭 Modalità e territorio</h2><div class="muted">v${FIX_VER} · controlli indipendenti dalla mappa</div></div><span id="ct661ModePill" class="pill soft">Caccia</span></div>
      <div class="ctModeRow"><button id="ctModeHunt" class="ctModeBtn" type="button">🕊 Caccia</button><button id="ctModeMush" class="ctModeBtn" type="button">🍄 Funghi</button></div>
      <div class="ct661Grid"><div><label>Regolamenti</label><select id="ctRegion" aria-label="Regolamenti Puglia" disabled><option value="Puglia">Puglia</option></select></div><div><label>ATC / provincia</label><div id="ctAtcStatus" class="ct661Status">Da rilevare</div></div><div class="full ct661Status" id="ctGeoStatus">Premi “Rileva territorio” oppure attiva il GPS.</div></div>
      <div class="ct661Actions"><button id="ctDetectTerritory" class="secondary" type="button">◎ Rileva territorio</button><button id="ctProtectedBtn" class="secondary" type="button">🛡 Aree protette</button><button id="ctRadarBtn" class="secondary" type="button">📡 Radar punti</button></div>
      <button id="ctCompareMainBtn" class="ctCompareHero" type="button">❓ CONFRONTA METEO DEI PUNTI SEGNATI</button>`;
    const first=Array.from(page.children).find(e=>e.classList.contains('mapWrap'));page.insertBefore(card,first||null);
    q('ctRegion').value=cfg.region||'auto';
    q('ctModeHunt').onclick=()=>setMode('hunt');q('ctModeMush').onclick=()=>setMode('mushroom');
    q('ctRegion').onchange=e=>{cfg.region=e.target.value;persist();renderTerritory();if(cfg.region==='auto')detectTerritory(true)};
    q('ctDetectTerritory').onclick=()=>detectTerritory(true);q('ctProtectedBtn').onclick=openProtected;q('ctRadarBtn').onclick=openRadar;
    q('ctCompareMainBtn').onclick=()=>{const b=q('ctConditionBtn');if(b)b.click();else toast('Confronto meteo in caricamento: riprova tra un istante')};
    ensureCalendarCard();renderTerritory();applyMode();
  }

  function ensureCalendarCard(){
    const page=q('page-map');if(!page||q('ctCalendarCard'))return;
    const card=document.createElement('div');card.id='ctCalendarCard';card.className='card ctCalendar';
    card.innerHTML=`<div class="sectionHead"><div><h2 style="margin-bottom:2px">📅 Calendario venatorio</h2><div id="ctCalendarSub" class="muted">Fonte regionale ufficiale</div></div><span class="pill soft">Caccia</span></div><div id="ctCalendarText" style="font-size:13px">Consulta le fonti ufficiali della Regione Puglia.</div><div class="actionGrid"><button id="ctCalendarOpen" class="secondary" type="button">Apri fonte ufficiale</button><button id="ctAtcOpen" class="secondary" type="button">Apri ATC / cartografia</button></div>`;
    const anchor=q('ct661Card');anchor?.insertAdjacentElement('afterend',card);
    q('ctCalendarOpen').onclick=()=>openOfficial('calendar');q('ctAtcOpen').onclick=()=>openOfficial('atc');
  }

  function regionNow(){return 'Puglia';}
  function pugliaAtc(province){
    const p=String(province||'').toLowerCase();
    if(p.includes('foggia'))return 'ATC Foggia';
    if(p.includes('barletta')||p.includes('andria')||p.includes('trani')||p==='bt')return 'ATC BAT · PFVR 2024-2029';
    if(p.includes('bari'))return 'ATC Bari';
    if(p.includes('brindisi'))return 'ATC Brindisi';
    if(p.includes('taranto'))return 'ATC Taranto';
    if(p.includes('lecce'))return 'ATC Lecce';
    return province?`ATC da verificare · ${province}`:'ATC da verificare';
  }
  function renderTerritory(){
    const region=regionNow();
    if(q('ctRegion')&&q('ctRegion').value!==cfg.region)q('ctRegion').value=cfg.region;
    const atc=region==='Puglia'?(cfg.atc||pugliaAtc(cfg.province)):(cfg.province?`Provincia: ${cfg.province}`:'Da rilevare');
    if(q('ctAtcStatus'))q('ctAtcStatus').innerHTML=region?`<b>${esc(atc)}</b><br><span class="muted">${esc(region)}</span>`:'Da rilevare';
    if(q('ctGeoStatus'))q('ctGeoStatus').textContent=region?`${cfg.region==='auto'?'GPS automatico':'Regole Puglia'} · ${region}${cfg.province?' · '+cfg.province:''}`:'Territorio non ancora rilevato';
    if(q('ctCalendarText'))q('ctCalendarText').textContent=region==='Puglia'?'Puglia · calendario venatorio e aggiornamenti nella fonte regionale ufficiale.':(region?`${region} · usa il collegamento per consultare il calendario regionale aggiornato.`:'Consulta le fonti ufficiali della Regione Puglia.');
  }

  async function detectTerritory(force=false){
    if(detectBusy)return;
    if(!force&&Date.now()-lastDetectTry<60000)return;
    detectBusy=true;lastDetectTry=Date.now();
    let pos=lastPos;
    if((!pos||force)&&navigator.geolocation){
      try{pos=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy}),no,{enableHighAccuracy:true,timeout:12000,maximumAge:3000}))}catch(e){if(!lastPos){detectBusy=false;toast('GPS non disponibile: '+(e.message||''));return}pos=lastPos;}
    }
    if(!pos){detectBusy=false;return toast('Attiva il GPS per rilevare Regione e ATC');}
    if(q('ctGeoStatus'))q('ctGeoStatus').textContent='Rilevo Regione e provincia…';
    try{
      const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(pos.lat)}&lon=${encodeURIComponent(pos.lng)}&zoom=10&addressdetails=1&accept-language=it`;
      const r=await fetch(u,{headers:{'Accept':'application/json'},cache:'no-store'});if(!r.ok)throw Error('servizio territorio '+r.status);
      const j=await r.json(),a=j.address||{};
      const reg=a.state||a.region||'',prov=a.province||a.county||a.state_district||'';
      cfg.detectedRegion=REGIONS.find(x=>x.toLowerCase()===String(reg).toLowerCase())||reg||cfg.detectedRegion;
      cfg.province=String(prov||'').replace(/^Provincia di\s+/i,'').trim();
      cfg.atc=cfg.detectedRegion==='Puglia'?pugliaAtc(cfg.province):'';persist();renderTerritory();
    }catch(e){console.warn('Territorio',e);if(q('ctGeoStatus'))q('ctGeoStatus').textContent='GPS attivo · Regione non ottenuta dalla rete';}
    finally{detectBusy=false;}
  }

  function setMode(mode){cfg.mode=mode==='mushroom'?'mushroom':'hunt';persist();applyMode();renderMarkers();renderPoints();renderDiary();window.dispatchEvent(new CustomEvent('pfc:activity-mode',{detail:{mode:cfg.mode}}));}
  function applyMode(){
    const hunt=cfg.mode!=='mushroom';
    q('ctModeHunt')?.classList.toggle('active',hunt);q('ctModeMush')?.classList.toggle('active',!hunt);
    const pill=q('ct661ModePill'),label=hunt?'Caccia':'Funghi';if(pill&&pill.textContent!==label)pill.textContent=label;
    ['quickSightingBtn','ctConditionBtn','ctCompareMainBtn','ctCalendarCard','ctHuntDayBar'].forEach(id=>{const e=q(id);if(e)e.style.display=hunt?'':'none'});
    // The comparison panel also depends on the diary filter. Keep its explicit
    // display value: the stylesheet defaults to display:none.
    const sightCheck=q('ctSightingCheck');
    if(sightCheck)sightCheck.style.display=hunt&&historyFilter==='sightings'?'block':'none';
    ['quickMushroomBtn'].forEach(id=>{const e=q(id);if(e)e.style.display=hunt?'none':''});
  }

  function protectedModal(){
    let m=q('ctProtectedModal');if(m)return m;
    m=document.createElement('div');m.id='ctProtectedModal';m.className='modal';m.innerHTML=`<div class="dialog"><div class="sectionHead"><div><h2>🛡 Aree protette e cartografia</h2><div class="muted">La finestra non sostituisce la mappa: puoi chiuderla e continuare a usare tutti i comandi.</div></div><button id="ctProtectedClose" class="iconBtn">✕</button></div><div class="ctProtButtons"><button id="ctOfficialOverlay" class="primary" type="button">Mostra/nascondi strato ufficiale Puglia</button><button id="ctOsmOverlay" class="secondary" type="button">Ricrea aree protette visibili da OpenStreetMap</button><button id="ctOfficialPortal" class="secondary" type="button">Apri cartografia ufficiale Regione</button><button id="ctProtectedClear" class="danger" type="button">Togli tutti gli strati protetti</button></div><div id="ctProtectedStatus" class="ctProtNote">Lo strato ufficiale usa il WMS del SIT Puglia quando la Regione è Puglia. La cartografia ricreata usa i confini pubblici OpenStreetMap presenti nell’area visibile.</div></div>`;document.body.appendChild(m);
    q('ctProtectedClose').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
    q('ctOfficialOverlay').onclick=toggleOfficialProtected;q('ctOsmOverlay').onclick=loadOsmProtected;q('ctOfficialPortal').onclick=()=>openOfficial('map');q('ctProtectedClear').onclick=clearProtected;
    return m;
  }
  function openProtected(){protectedModal().classList.add('open');}
  function clearProtected(){
    try{if(protectedWmsLayer){map.removeLayer(protectedWmsLayer);protectedWmsLayer=null}}catch{}
    try{if(protectedOsmLayer){map.removeLayer(protectedOsmLayer);protectedOsmLayer=null}}catch{}
    if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Strati protetti rimossi. La mappa resta completamente utilizzabile.';
  }
  function toggleOfficialProtected(){
    if(!map||!window.L)return toast('Mappa non pronta');
    if(regionNow()!=='Puglia')return toast('Strato WMS integrato disponibile per Puglia; usa “Apri cartografia ufficiale Regione” per le altre regioni');
    try{
      if(protectedWmsLayer){map.removeLayer(protectedWmsLayer);protectedWmsLayer=null;if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Strato ufficiale Puglia nascosto.';return}
      protectedWmsLayer=L.tileLayer.wms('https://webapps.sit.puglia.it/arcgis/services/Operationals/AreeProtetteReteNatura2000/MapServer/WMSServer',{layers:'0,1,2,3,4,5,6,7,8',format:'image/png',transparent:true,version:'1.3.0',attribution:'SIT Regione Puglia',opacity:.62});
      protectedWmsLayer.on?.('tileerror',()=>{if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Il server WMS ufficiale non ha restituito una tessera. Puoi usare la cartografia ricreata oppure aprire il portale ufficiale.'});
      protectedWmsLayer.addTo(map);if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Strato ufficiale SIT Puglia attivo sopra la mappa.';
    }catch(e){console.warn(e);toast('Strato ufficiale non disponibile in questo momento')}
  }
  async function loadOsmProtected(){
    if(!map||!window.L)return toast('Mappa non pronta');
    const b=map.getBounds();if(!b)return;
    if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Carico le aree protette visibili…';
    try{
      const bbox=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].join(',');
      const query=`[out:json][timeout:20];(way["boundary"="protected_area"](${bbox});relation["boundary"="protected_area"](${bbox});way["leisure"="nature_reserve"](${bbox});relation["leisure"="nature_reserve"](${bbox}););out geom;`;
      const r=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{cache:'no-store'});if(!r.ok)throw Error('Overpass '+r.status);const j=await r.json();
      if(protectedOsmLayer)try{map.removeLayer(protectedOsmLayer)}catch{}
      protectedOsmLayer=L.layerGroup().addTo(map);let n=0;
      const drawGeom=(g,tags)=>{if(!g?.length)return;const ll=g.filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>[+x.lat,+x.lon]);if(ll.length<2)return;const poly=L.polygon(ll,{color:'#2b6b44',weight:2,fillColor:'#4b8a5c',fillOpacity:.12});const name=tags?.name||tags?.protect_class||'Area protetta';poly.bindPopup(`<b>🛡 ${esc(name)}</b><br><small>Fonte ricreata: OpenStreetMap</small>`);poly.addTo(protectedOsmLayer);n++};
      (j.elements||[]).forEach(el=>{if(el.geometry)drawGeom(el.geometry,el.tags);(el.members||[]).forEach(m=>{if(m.geometry)drawGeom(m.geometry,el.tags)})});
      if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent=n?`Cartografia ricreata attiva: ${n} confini caricati nell’area visibile.`:'Nessun confine protetto trovato nell’area visibile.';
    }catch(e){console.warn(e);if(q('ctProtectedStatus'))q('ctProtectedStatus').textContent='Cartografia ricreata non disponibile ora. La mappa principale continua a funzionare.';}
  }

  function officialRegionSearch(kind){
    const reg=regionNow()||'Puglia';
    if(reg==='Puglia'){
      if(kind==='calendar')return 'https://www.regione.puglia.it/web/foreste-biodiversita/stagione-venatoria';
      if(kind==='atc')return 'https://www.regione.puglia.it/web/foreste-biodiversita/ambiti-territoriali-di-caccia-atc';
      return 'https://pugliacon.regione.puglia.it/web/sit-puglia-sit/wms';
    }
    const topic=kind==='calendar'?'calendario venatorio 2026 2027':kind==='atc'?'ATC ambiti territoriali di caccia':'geoportale aree protette cartografia';
    return 'https://www.google.com/search?q='+encodeURIComponent(`Regione ${reg} ${topic} sito ufficiale`);
  }
  function openOfficial(kind){try{window.open(officialRegionSearch(kind),'_blank','noopener')}catch{location.href=officialRegionSearch(kind)}}

  function radarModal(){
    let m=q('ctRadarModal');if(m)return m;
    m=document.createElement('div');m.id='ctRadarModal';m.className='modal';m.innerHTML=`<div class="dialog ctRadarDialog"><div class="sectionHead"><div><h2 style="margin-bottom:2px">📡 Radar punti salvati</h2><div class="muted" style="color:#ffffffaa">GPS e bussola. Tieni il telefono piatto e ruotalo solo a sinistra/destra.</div></div><button id="ctRadarClose" class="iconBtn ctRadarClose">✕</button></div><div class="ctRadarStage"><div id="ctRadarCompass" class="ctRadarCompass"></div></div><div id="ctRadarDeg" class="ctRadarDeg">—°</div><div id="ctRadarFlat" class="ctRadarFlat">Attendo sensore…</div><div class="ctRadarHint">Mostro soltanto punti entro 10 km nella direzione in cui stai guardando. Se ti stai allontanando dal punto, la distanza numerica viene nascosta.</div><div id="ctRadarList" class="ctRadarList"></div></div>`;document.body.appendChild(m);
    q('ctRadarClose').onclick=closeRadar;m.onclick=e=>{if(e.target===m)closeRadar()};return m;
  }
  async function openRadar(){
    if(!lastPos){const p=await getFix?.();if(p)lastPos=p}if(!lastPos)return toast('Serve il GPS per usare il radar');
    radarModal().classList.add('open');radarOpen=true;radarPrevDistances.clear();
    try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const ok=await DeviceOrientationEvent.requestPermission();if(ok!=='granted')throw Error('permesso orientamento negato')}}catch(e){toast(e.message||'Sensore orientamento non disponibile')}
    radarListener=onOrientation;window.addEventListener('deviceorientationabsolute',radarListener,true);window.addEventListener('deviceorientation',radarListener,true);renderRadar();
  }
  function closeRadar(){radarOpen=false;q('ctRadarModal')?.classList.remove('open');if(radarListener){window.removeEventListener('deviceorientationabsolute',radarListener,true);window.removeEventListener('deviceorientation',radarListener,true);radarListener=null}}
  let lastTilt=null,lastRaw=null,lastAccepted=null;
  function circularSmooth(prev,next,f=.22){if(prev==null)return next;let d=(((next-prev)+540)%360)-180;return clamp360(prev+d*f)}
  function onOrientation(e){
    if(!radarOpen)return;
    const beta=Number(e.beta||0),gamma=Number(e.gamma||0),flat=Math.abs(beta)<=28&&Math.abs(gamma)<=28;
    const raw=Number.isFinite(+e.webkitCompassHeading)?clamp360(+e.webkitCompassHeading):(Number.isFinite(+e.alpha)?clamp360(360-(+e.alpha)):null);
    if(raw==null)return;
    if(!flat){if(q('ctRadarFlat'))q('ctRadarFlat').textContent='📱 Rimetti il telefono piatto: direzione bloccata';lastTilt={beta,gamma};return;}
    if(lastTilt&&lastRaw!=null){const tiltMove=Math.hypot(beta-lastTilt.beta,gamma-lastTilt.gamma),yawMove=diffAngle(raw,lastRaw);if(tiltMove>3.5&&yawMove<9){lastTilt={beta,gamma};lastRaw=raw;return;}}
    lastTilt={beta,gamma};lastRaw=raw;lastAccepted=circularSmooth(lastAccepted,raw,.28);radarHeading=lastAccepted;
    if(q('ctRadarFlat'))q('ctRadarFlat').textContent='✅ Telefono piatto · ruota a sinistra/destra';renderRadar();
  }
  function renderRadar(){
    if(!radarOpen)return;const deg=q('ctRadarDeg'),comp=q('ctRadarCompass'),list=q('ctRadarList');if(!list)return;
    if(radarHeading==null){deg.textContent='—°';list.innerHTML='<div class="ctRadarItem">Muovi lentamente il telefono a sinistra/destra per iniziare.</div>';return}
    deg.textContent=Math.round(radarHeading)+'°';comp?.style.setProperty('--radar-rot',radarHeading+'deg');
    const origin=lastPos,arr=(state.points||[]).map(p=>{const d=kmDist(origin,{lat:+p.lat,lng:+p.lng}),br=bearing(origin,{lat:+p.lat,lng:+p.lng});return{p,d,br,delta:diffAngle(br,radarHeading)}}).filter(x=>Number.isFinite(x.d)&&x.d<=10&&x.delta<=28).sort((a,b)=>a.d-b.d);
    if(!arr.length){list.innerHTML='<div class="ctRadarItem"><b>Nessun punto in questa direzione</b><span>Ruota lentamente a sinistra o destra.</span></div>';return}
    list.innerHTML=arr.filter((x,i)=>x.p.__friend||i<8).map(x=>{const prev=radarPrevDistances.get(x.p.id),away=prev!=null&&x.d>prev+.03;radarPrevDistances.set(x.p.id,x.d);const label=x.p.species||x.p.name||x.p.type||'Punto';const dist=x.d<1?Math.round(x.d*1000)+' m':x.d.toFixed(1)+' km';return `<div class="ctRadarItem"><b>${x.p.type==='Avvistamento'?'🕊':String(label).toLowerCase().includes('fung')?'🍄':'📍'} ${esc(label)}</b><span>Direzione ${Math.round(x.br)}° · scarto ${Math.round(x.delta)}°</span>${away?'<div class="ctRadarAway">↩ Ti stai allontanando: distanza nascosta</div>':`<div style="font-size:18px;font-weight:900;margin-top:3px">${dist}</div>`}</div>`}).join('');
  }

  // GPS filtrato: riduce il “ballo” da fermo e scarta salti poco affidabili.
  let stableFix=null;
  startGps=function(){
    if(gpsWatch!=null||!navigator.geolocation)return;
    gpsWatch=navigator.geolocation.watchPosition(p=>{
      const raw={lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0),heading:p.coords.heading,speed:p.coords.speed};
      if(!Number.isFinite(raw.lat)||!Number.isFinite(raw.lng))return;
      if(stableFix){const jump=kmDist(stableFix,raw)*1000;if(jump>Math.max(90,(raw.acc||0)*2.2)&&(!raw.speed||raw.speed<2))return;const d=jump;if(d<35){const k=d<8?.12:.28;raw.lat=stableFix.lat+(raw.lat-stableFix.lat)*k;raw.lng=stableFix.lng+(raw.lng-stableFix.lng)*k;}}
      stableFix={...raw};lastPos={...raw};
      if(q('gpsBadge'))q('gpsBadge').textContent=`GPS ±${lastPos.acc} m`;
      try{if(!userMarker)userMarker=L.circleMarker([lastPos.lat,lastPos.lng],{radius:9,color:'#fff',weight:4,fillColor:'#2878d8',fillOpacity:1}).addTo(map);else userMarker.setLatLng([lastPos.lat,lastPos.lng]);if(follow)map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});updateCar?.();}catch(e){console.warn('GPS UI',e)}
      if(cfg.region==='auto'&&!cfg.detectedRegion)detectTerritory(false);if(radarOpen)renderRadar();
    },()=>{if(q('gpsBadge'))q('gpsBadge').textContent='GPS non disponibile';},{enableHighAccuracy:true,maximumAge:1200,timeout:20000});
  };

  function boot661(){addStyles();ensureControlCard();ensureCalendarCard();applyMode();setTimeout(()=>{applyMode();renderTerritory();if(cfg.region==='auto'&&!cfg.detectedRegion&&lastPos)detectTerritory(false)},600);const mo=new MutationObserver(()=>applyMode());const p=q('page-map');if(p)mo.observe(p,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot661,{once:true});else boot661();
})();
// V6.6.3 - hardening territorio/ATC e aree protette senza bloccare la mappa
(function(){
  const VER='6.6.3';
  const CFG_KEY='pfc-v661-settings';
  const REGIONS=['Puglia'];
  const qs=id=>document.getElementById(id);
  let officialImage=null,osmLayer=null,officialActive=false,officialTimer=0,detectBusy663=false;

  function readCfg(){try{return{mode:'hunt',detectedRegion:'',province:'',atc:'',...JSON.parse(localStorage.getItem(CFG_KEY)||'{}'),region:'Puglia'}}catch{return{mode:'hunt',region:'Puglia',detectedRegion:'',province:'',atc:''}}}
  function writeCfg(c){c.region='Puglia';try{localStorage.setItem(CFG_KEY,JSON.stringify(c))}catch{}}
  function normRegion(s){const v=String(s||'').trim().toLowerCase().replace(/\s+/g,' ');return REGIONS.find(r=>r.toLowerCase()===v)||REGIONS.find(r=>v.includes(r.toLowerCase()))||String(s||'').trim()}
  function cleanProvince(s){return String(s||'').replace(/^provincia\s+di\s+/i,'').replace(/^città\s+metropolitana\s+di\s+/i,'').trim()}
  function pugliaAtc663(province,city=''){const p=cleanProvince(province).toLowerCase(),m=String(city||'').toLowerCase().replace(/[^a-zà-ÿ ]/g,' ').replace(/\\s+/g,' ').trim();if(p.includes('foggia')||p==='fg')return 'ATC Foggia';if(p.includes('bari')||p==='ba')return 'ATC Bari';if(p.includes('brindisi')||p==='br')return 'ATC Brindisi';if(p.includes('taranto')||p==='ta')return 'ATC Taranto';if(p.includes('lecce')||p==='le')return 'ATC Lecce';if(p.includes('barletta')||p.includes('andria')||p.includes('trani')||p==='bt'){const fg=['trinitapoli','san ferdinando di puglia','margherita di savoia'];const ba=['andria','barletta','bisceglie','canosa di puglia','canosa','minervino murge','spinazzola','trani'];if(fg.some(x=>m.includes(x)))return 'ATC Foggia';if(ba.some(x=>m.includes(x)))return 'ATC Bari';return 'ATC Bari / Foggia · verifica comune BAT'}return province?`ATC da verificare · ${cleanProvince(province)}`:'ATC da rilevare'}
  function regionNow663(c=readCfg()){return 'Puglia'}
  function setStatus(t){const e=qs('ctGeoStatus');if(e)e.textContent=t}
  function render663(){const c=readCfg(),reg=regionNow663(c),atc=reg==='Puglia'?(c.atc||pugliaAtc663(c.province,c.city)):(c.province?`Provincia: ${cleanProvince(c.province)}`:'Da rilevare');const rs=qs('ctRegion');if(rs&&rs.value!==c.region)rs.value=c.region;if(qs('ctAtcStatus'))qs('ctAtcStatus').innerHTML=reg?`<b>${esc(atc)}</b><br><span class="muted">${esc(reg)}</span>`:'Da rilevare';if(qs('ctGeoStatus'))qs('ctGeoStatus').textContent=reg?`${c.region==='auto'?'GPS automatico':'Regole Puglia'} · ${reg}${c.province?' · '+cleanProvince(c.province):''}`:'Territorio non ancora rilevato';if(qs('ctCalendarText'))qs('ctCalendarText').textContent=reg==='Puglia'?'Puglia · calendario venatorio e aggiornamenti nella fonte regionale ufficiale.':(reg?`${reg} · apri la fonte ufficiale per il calendario aggiornato.`:'Consulta le fonti ufficiali della Regione Puglia.');}

  async function fetchJsonTimeout(url,ms=9000){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:ac.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(tm)}}
  async function reverseTerritory(lat,lng){
    try{const j=await fetchJsonTimeout(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=10&addressdetails=1&accept-language=it`,8000),a=j.address||{};return{region:normRegion(a.state||a.region||''),province:cleanProvince(a.province||a.county||a.state_district||''),city:String(a.city||a.town||a.village||a.municipality||a.hamlet||'').trim()}}catch(e){console.warn('Nominatim territorio',e)}
    try{const j=await fetchJsonTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=it`,8000);return{region:normRegion(j.principalSubdivision||j.localityInfo?.administrative?.find?.(x=>/region/i.test(x.description||''))?.name||''),province:cleanProvince(j.localityInfo?.administrative?.find?.(x=>/province/i.test(x.description||''))?.name||''),city:String(j.city||j.locality||'').trim()}}catch(e){console.warn('Fallback territorio',e)}
    return null;
  }
  async function detect663(force=false){
    if(detectBusy663)return;detectBusy663=true;try{
      let p=lastPos;
      if((!p||force)&&navigator.geolocation){try{p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(x=>ok({lat:x.coords.latitude,lng:x.coords.longitude,acc:x.coords.accuracy}),no,{enableHighAccuracy:true,timeout:12000,maximumAge:2500}))}catch(e){if(!p)throw e}}
      if(!p){toast('Attiva il GPS per rilevare Regione e ATC');return}
      setStatus('GPS acquisito · rilevo Regione e provincia…');
      const t=await reverseTerritory(p.lat,p.lng);if(!t?.region){setStatus('GPS attivo · territorio non ottenuto dalla rete. Puoi scegliere la Regione manualmente.');return}
      const c=readCfg();c.detectedRegion=t.region;c.province=t.province||c.province;c.city=t.city||c.city||'';c.atc=t.region==='Puglia'?pugliaAtc663(c.province,c.city):'';writeCfg(c);render663();window.dispatchEvent(new CustomEvent('pfc:territory',{detail:{region:t.region,province:c.province,atc:c.atc}}));return {region:t.region,province:c.province,atc:c.atc};
    }catch(e){console.warn('Rilevamento territorio 6.6.3',e);setStatus('GPS non disponibile o servizio territorio temporaneamente non raggiungibile.');}finally{detectBusy663=false}
  }

  function ensurePanel(){
    let p=qs('ct663ProtectedPanel');if(p)return p;
    const wrap=document.querySelector('.mapWrap');if(!wrap)return null;
    p=document.createElement('div');p.id='ct663ProtectedPanel';p.style.cssText='display:none;position:absolute;left:10px;right:10px;bottom:10px;z-index:1250;background:#fffef7f2;border:1px solid #bdc9bb;border-radius:14px;padding:10px;box-shadow:0 8px 28px #0004;backdrop-filter:blur(7px);max-height:48%;overflow:auto';
    p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>🛡 Aree protette</b><button id="ct663ProtClose" class="iconBtn" type="button">✕</button></div><div id="ct663ProtStatus" class="muted" style="font-size:11px;margin:7px 0">La mappa resta utilizzabile. Nessun controllo lungo blocca l'interfaccia.</div><div class="actionGrid"><button id="ct663Official" class="primary" type="button">Ufficiale Puglia</button><button id="ct663Osm" class="secondary" type="button">Aree visibili OSM</button><button id="ct663Portal" class="secondary" type="button">Portale ufficiale</button><button id="ct663Clear" class="danger" type="button">Togli strati</button></div>`;
    wrap.appendChild(p);qs('ct663ProtClose').onclick=()=>{p.style.display='none'};qs('ct663Official').onclick=toggleOfficial663;qs('ct663Osm').onclick=loadOsm663;qs('ct663Portal').onclick=()=>openOfficial663('map');qs('ct663Clear').onclick=clearProtected663;return p;
  }
  function protStatus(t){const e=qs('ct663ProtStatus');if(e)e.textContent=t}
  function openProtected663(){const p=ensurePanel();if(!p)return toast('Mappa non pronta');p.style.display=p.style.display==='none'||!p.style.display?'block':'none'}
  function clearOfficial(){officialActive=false;clearTimeout(officialTimer);if(officialImage){try{map.removeLayer(officialImage)}catch{}officialImage=null}}
  function clearProtected663(){clearOfficial();if(osmLayer){try{map.removeLayer(osmLayer)}catch{}osmLayer=null}protStatus('Strati rimossi. Mappa completamente libera.')}
  const LOCAL_ZONE_KM=12;
  function localZoneBounds(){
    const z=map?.getZoom?.()||0;
    if(z>=12)return map.getBounds();
    const mc=lastPos&&Number.isFinite(+lastPos.lat)&&Number.isFinite(+lastPos.lng)?{lat:+lastPos.lat,lng:+lastPos.lng}:map.getCenter();
    const dLat=LOCAL_ZONE_KM/111.32,dLng=LOCAL_ZONE_KM/(111.32*Math.max(.25,Math.cos(mc.lat*Math.PI/180)));
    return L.latLngBounds([mc.lat-dLat,mc.lng-dLng],[mc.lat+dLat,mc.lng+dLng]);
  }
  function officialUrl(){const b=localZoneBounds(),w=Math.min(1000,Math.max(620,Math.round(map.getSize().x*1.15))),h=Math.min(1000,Math.max(620,Math.round(map.getSize().y*1.15)));return `https://webapps.sit.puglia.it/arcgis/rest/services/Operationals/AreeProtetteReteNatura2000/MapServer/export?bbox=${encodeURIComponent([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(','))}&bboxSR=4326&imageSR=4326&size=${w},${h}&format=png32&transparent=true&layers=show%3A0%2C1%2C2%2C3&f=image&_=${Date.now()}`}
  function refreshOfficial(){if(!officialActive||!map||!window.L)return;clearTimeout(officialTimer);officialTimer=setTimeout(()=>{try{const b=localZoneBounds(),u=officialUrl();if(officialImage)map.removeLayer(officialImage);officialImage=L.imageOverlay(u,b,{opacity:.58,interactive:false,crossOrigin:false});officialImage.on?.('load',()=>protStatus('✅ Cartografia ufficiale caricata solo nella zona interessata (max 12 km).'));officialImage.on?.('error',()=>protStatus('Server ufficiale lento/non disponibile. Usa “Aree visibili OSM” o il portale ufficiale.'));officialImage.addTo(map)}catch(e){console.warn('Overlay ufficiale 6.6.3',e);protStatus('Cartografia ufficiale non disponibile ora. La mappa principale resta attiva.')}},220)}
  function toggleOfficial663(){const c=readCfg(),reg=regionNow663(c);if(reg&&reg!=='Puglia')return toast('Lo strato integrato è disponibile per Puglia; per le altre Regioni usa il portale ufficiale');if(!map||!window.L)return toast('Mappa non pronta');if(officialActive){clearOfficial();protStatus('Strato ufficiale Puglia nascosto.');return}officialActive=true;protStatus('Carico cartografia ufficiale Puglia…');refreshOfficial()}

  async function overpassRequest(query){const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let last;for(const ep of endpoints){try{return await fetchJsonTimeout(ep+'?data='+encodeURIComponent(query),12000)}catch(e){last=e;console.warn('Overpass',ep,e)}}throw last||Error('Overpass non disponibile')}
  async function loadOsm663(){
    if(!map||!window.L)return toast('Mappa non pronta');if(map.getZoom()<9){protStatus('🔎 Ingrandisci la mappa almeno a livello 9: evito ricerche troppo grandi che possono bloccare il telefono.');return}
    const b=localZoneBounds(),bbox=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].join(',');protStatus('Cerco i confini protetti solo nella zona interessata (max 12 km)…');
    try{const query=`[out:json][timeout:10][maxsize:4500000];(way["boundary"="protected_area"](${bbox});relation["boundary"="protected_area"](${bbox});way["leisure"="nature_reserve"](${bbox});relation["leisure"="nature_reserve"](${bbox}););out geom 140;`;const j=await overpassRequest(query);if(osmLayer)try{map.removeLayer(osmLayer)}catch{}osmLayer=L.layerGroup().addTo(map);let n=0;const draw=(g,t)=>{if(n>=140||!g?.length)return;const ll=g.filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>[+x.lat,+x.lon]);if(ll.length<3)return;const poly=L.polygon(ll,{color:'#2b6b44',weight:2,fillColor:'#4b8a5c',fillOpacity:.13});poly.bindPopup(`<b>🛡 ${esc(t?.name||'Area protetta')}</b><br><small>Fonte: OpenStreetMap</small>`);poly.addTo(osmLayer);n++};(j.elements||[]).forEach(el=>{if(el.geometry)draw(el.geometry,el.tags);(el.members||[]).forEach(m=>m.geometry&&draw(m.geometry,el.tags))});protStatus(n?`✅ ${n} confini caricati solo nella zona interessata. La mappa resta attiva.`:'Nessun confine protetto trovato nell’area visibile.');}
    catch(e){console.warn('Aree OSM 6.6.3',e);protStatus('Ricerca aree protette interrotta senza bloccare la mappa. Riprova più tardi o usa il portale ufficiale.')}
  }
  function officialUrl663(kind){const c=readCfg(),reg=regionNow663(c)||'Puglia';if(reg==='Puglia'){if(kind==='calendar')return 'https://www.regione.puglia.it/web/foreste-biodiversita/stagione-venatoria';if(kind==='atc')return 'https://politiche-energetiche.regione.puglia.it/it/web/foreste-biodiversita/ambiti-territoriali-di-caccia-atc';return 'https://webapps.sit.puglia.it/arcgis/rest/services/Operationals/AreeProtetteReteNatura2000/MapServer'}const topic=kind==='calendar'?'calendario venatorio 2026 2027':kind==='atc'?'ATC ambiti territoriali di caccia':'geoportale aree protette cartografia';return 'https://www.google.com/search?q='+encodeURIComponent(`Regione ${reg} ${topic} sito ufficiale`)}
  function openOfficial663(kind){const u=officialUrl663(kind);try{window.open(u,'_blank','noopener')}catch{location.href=u}}

  function rewire(){
    const d=qs('ctDetectTerritory');if(d)d.onclick=()=>detect663(true);
    const r=qs('ctRegion');if(r)r.onchange=e=>{const c=readCfg();c.region=e.target.value;writeCfg(c);render663();if(c.region==='auto')detect663(true)};
    const p=qs('ctProtectedBtn');if(p)p.onclick=openProtected663;
    const cal=qs('ctCalendarOpen');if(cal)cal.onclick=()=>openOfficial663('calendar');const atc=qs('ctAtcOpen');if(atc)atc.onclick=()=>openOfficial663('atc');
    render663();if(map?.on)map.on('moveend',()=>{if(officialActive)refreshOfficial()});
    const old=qs('ctProtectedModal');if(old)old.remove();
    const pill=qs('ct661ModePill');if(pill)pill.title=`Territorio fix ${VER}`;
  }
  window.__PFC_TERRITORY_REFRESH__=()=>detect663(false);
  function boot(){let tries=0;const tm=setInterval(()=>{tries++;if(qs('ct661Card')&&map){clearInterval(tm);rewire();const c=readCfg();if(c.region==='auto'&&!c.detectedRegion)setTimeout(()=>detect663(false),500)}else if(tries>40)clearInterval(tm)},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
// V6.7.0 FINAL - selezione mappa robusta su Android: tolleranza al tremolio + fallback pressione lunga
(function(){
  const VER='6.7.0', HOLD_MS=650, MOVE_PX=16;
  const el=map?.getContainer?.();
  if(!el || el.dataset.ctFinalLongPress6700==='1')return;
  el.dataset.ctFinalLongPress6700='1';

  let timer=null,active=false,sx=0,sy=0,finalPin=null;

  // Leaflet normalmente avvia il drag dopo pochissimi pixel: aumentiamo la tolleranza
  // per non annullare una pressione lunga a causa del naturale tremolio del dito.
  try{
    const d=map?.dragging?._draggable;
    if(d?.options)d.options.clickTolerance=Math.max(Number(d.options.clickTolerance)||3,MOVE_PX+2);
  }catch(e){console.warn('Tolleranza drag 6.7.0',e)}

  const isBackground=t=>!t?.closest?.('.leaflet-control,.leaflet-marker-icon,.leaflet-interactive');

  function followOff(){
    follow=false;
    const b=$('followBtn');
    if(b){
      b.classList.remove('active');
      b.setAttribute('aria-pressed','false');
      b.style.background='#fff';
      b.style.color='#173f2b';
      b.title='Seguimi: DISATTIVO';
    }
  }

  const baseSelect=selectMapPoint;
  selectMapPoint=async function(lat,lng){
    window.__PFC_FINAL_LAST_SELECT__={lat:+lat,lng:+lng,at:Date.now()};
    return baseSelect(lat,lng);
  };

  function recent(lat,lng){
    const s=window.__PFC_FINAL_LAST_SELECT__;
    return !!(s&&Date.now()-s.at<1100&&Math.abs(s.lat-lat)<2e-5&&Math.abs(s.lng-lng)<2e-5);
  }

  function mark(lat,lng){
    try{
      if(!finalPin){
        finalPin=L.circleMarker([lat,lng],{radius:10,color:'#173f2b',weight:4,fillColor:'#fff',fillOpacity:1,interactive:false,dashArray:'3 2'}).addTo(map);
      }else finalPin.setLatLng([lat,lng]);
    }catch(e){console.warn('Marker finale 6.7.0',e)}
  }

  function coordsAt(x,y){
    const r=el.getBoundingClientRect();
    const px=Math.max(0,Math.min(r.width,x-r.left));
    const py=Math.max(0,Math.min(r.height,y-r.top));
    return map.containerPointToLatLng(L.point(px,py));
  }

  function choose(x,y){
    const ll=coordsAt(x,y);
    if(!ll||!Number.isFinite(+ll.lat)||!Number.isFinite(+ll.lng))return;
    if(recent(+ll.lat,+ll.lng))return;
    followOff();
    mark(+ll.lat,+ll.lng);
    Promise.resolve(selectMapPoint(+ll.lat,+ll.lng)).catch(e=>console.warn('Selezione finale 6.7.0',e));
    try{navigator.vibrate?.(35)}catch{}
    toast('Punto segnato — ora puoi salvarlo');
  }

  function clearTimer(){if(timer){clearTimeout(timer);timer=null}}
  function stop(){active=false;clearTimer()}

  function down(e){
    if(e.button!=null&&e.button!==0)return;
    if(!isBackground(e.target))return;
    sx=e.clientX||0;sy=e.clientY||0;active=true;clearTimer();
    timer=setTimeout(()=>{if(active){active=false;timer=null;choose(sx,sy)}},HOLD_MS);
  }
  function move(e){
    if(!active)return;
    if(Math.hypot((e.clientX||0)-sx,(e.clientY||0)-sy)>MOVE_PX)stop();
  }

  el.addEventListener('pointerdown',down,{capture:true,passive:true});
  el.addEventListener('pointermove',move,{capture:true,passive:true});
  el.addEventListener('pointerup',stop,{capture:true,passive:true});
  el.addEventListener('pointercancel',stop,{capture:true,passive:true});
  el.addEventListener('contextmenu',e=>{
    if(!isBackground(e.target))return;
    e.preventDefault();
    const ll=coordsAt(e.clientX||sx,e.clientY||sy);
    if(ll&&!recent(+ll.lat,+ll.lng))choose(e.clientX||sx,e.clientY||sy);
  },true);

  map?.on('dragstart',followOff);
  $('clearSelectedBtn')?.addEventListener('click',()=>{
    if(finalPin){try{map.removeLayer(finalPin)}catch{}finalPin=null}
  });

  const badge=$('ctVersionBadge');
  if(badge)badge.textContent='• V6.7.0 FINAL';
  console.info('Passione Funghi e Caccia '+VER+' FINAL attiva');
})();
   window.__PFC6621_RESTORE_SAFE__();
   let radarReady=false;
   const radarBtn=$('ctRadarBtn');
   radarBtn.onclick=function activateRadar(){
     try{
       if(!radarReady){// V6.6.4 - radar orizzontale stabile: ignora su/giu e inclinazioni, usa solo rotazione sul piano
(function(){
  const VER='6.8.0';
  const q=id=>document.getElementById(id);
  const norm=n=>((n%360)+360)%360;
  const adiff=(a,b)=>Math.abs((((a-b)+540)%360)-180);
  const smooth=(a,b,f=.18)=>{if(a==null)return b;const d=(((b-a)+540)%360)-180;return norm(a+d*f)};
  const distKm=(a,b)=>{const R=6371,r=Math.PI/180,d1=(b.lat-a.lat)*r,d2=(b.lng-a.lng)*r,x=Math.sin(d1/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(d2/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
  const bear=(a,b)=>{const r=Math.PI/180,p1=a.lat*r,p2=b.lat*r,dl=(b.lng-a.lng)*r;return norm(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/r)};
  let open=false,heading=null,lastSample=null,stableCount=0,absoluteSeenAt=0,jumpCandidate=null;
  const prevDist=new Map();
  function ensureCss(){if(q('ct664Css'))return;const s=document.createElement('style');s.id='ct664Css';s.textContent=`
#ctRadar664{z-index:3000}.ct664Dialog{background:linear-gradient(155deg,#152f24,#091a14);color:#f2f8f1;max-width:620px;border:1px solid #80b59640}.ct664Dialog h2{font-size:24px;margin:0 0 5px}.ct664Dialog .sectionHead{margin-bottom:14px}.ct664Stage{position:relative;height:min(48vh,390px);min-height:260px;border-radius:24px;overflow:hidden;background:radial-gradient(ellipse at center,#214c39,#0a1b17 72%);border:1px solid #77c39735}.ct679Scope{position:absolute;width:72%;max-width:300px;aspect-ratio:1;left:50%;top:48%;transform:translate(-50%,-50%);border-radius:50%;border:1px solid #9fe5be70;background:repeating-radial-gradient(circle,transparent 0 24%,#89c9a42c 24.5% 25%,transparent 25.5% 49%);box-shadow:0 0 35px #72c89e12,inset 0 0 32px #78daa516;pointer-events:none}.ct679Scope:before{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -24deg, #78efb344 0deg, #b0f8c930 48deg,transparent 48deg 360deg)}.ct679Scope:after{content:'';position:absolute;left:50%;top:50%;width:9px;height:9px;transform:translate(-50%,-50%);border-radius:50%;background:#d4ffdf;box-shadow:0 0 0 6px #b5f9d019,0 0 20px #92fac9}.ct664Reticle{position:absolute;inset:0;pointer-events:none}.ct664Reticle:before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:#9bdcbb40}.ct664Reticle:after{content:'';position:absolute;top:50%;left:0;right:0;height:1px;background:#9bdcbb40}.ct679Forward{position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:10px;letter-spacing:2px;color:#c6e8d1}.ct679Range{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-size:10px;color:#b8d6c5;white-space:nowrap;letter-spacing:1px}.ct664Deg{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#092119df;border:1px solid #9ddeba40;padding:6px 16px;border-radius:999px;font-size:24px;font-weight:800;letter-spacing:1px}.ct664State{position:absolute;left:12px;right:12px;bottom:12px;background:#0a201be8;padding:10px;border-radius:14px;font-size:12px;text-align:center;border:1px solid #80b59630}.ct679RadarStatus{font-size:11px;color:#a8c6b4;margin:8px 2px}.ct664List{display:grid;gap:8px;margin-top:10px;max-height:30vh;overflow:auto}.ct664Item{background:#ffffff08;border:1px solid #ffffff1c;border-radius:16px;padding:14px}.ct664Item b{display:block;font-size:16px;margin-bottom:4px}.ct664Item span{font-size:13px;color:#c7dacf}.ct664Away{font-size:11px;color:#f0c98b}.ct664Ready{color:#b8f0c7}.ct664Hold{color:#ffd58b}
`;document.head.appendChild(s)}
  function modal(){let m=q('ctRadar664');if(m)return m;ensureCss();m=document.createElement('div');m.id='ctRadar664';m.className='modal';m.innerHTML=`<div class="dialog ct664Dialog"><div class="sectionHead"><div><h2>◎ Radar punti</h2><div class="muted" style="color:#b4cdbf;font-size:12px">Tieni il telefono piatto e ruota lentamente.</div></div><button id="ct664Close" class="iconBtn" type="button" aria-label="Chiudi radar">✕</button></div><div class="ct664Stage"><div class="ct679Scope" aria-hidden="true"><div class="ct664Reticle"></div><span class="ct679Forward">DIREZIONE</span><span class="ct679Range">10 KM · ±24°</span></div><div id="ct664Deg" class="ct664Deg">—°</div><div id="ct664State" class="ct664State">Attendo sensore…</div></div><div class="ct679RadarStatus">Radar direzionale · GPS e bussola</div><div class="muted" style="color:#b4cdbf;margin-top:8px;font-size:12px">Amici: tutte le direzioni, con nome e distanza. Punti personali: entro 10 km nella direzione del telefono. Se ti allontani dai punti personali, la distanza viene nascosta.</div><div id="ct664List" class="ct664List"></div></div>`;document.body.appendChild(m);q('ct664Close').onclick=closeRadar;m.onclick=e=>{if(e.target===m)closeRadar()};return m}
  function screenAngle(){try{return Number(screen.orientation?.angle||window.orientation||0)||0}catch{return 0}}
  function rawHeading(e){if(e.webkitCompassHeading!=null&&Number.isFinite(+e.webkitCompassHeading))return norm(+e.webkitCompassHeading);if(e.alpha==null||!Number.isFinite(+e.alpha))return null;return norm(360-(+e.alpha)+screenAngle())}
  function setState(txt,cls){const e=q('ct664State');if(!e)return;e.className='ct664State '+(cls||'');e.textContent=txt}
  function acceptRaw(raw,now){if(heading==null){heading=raw;jumpCandidate=null;return true}const d=adiff(raw,heading);if(d<1.2)return false;if(d>42){if(!jumpCandidate||adiff(jumpCandidate.raw,raw)>7||now-jumpCandidate.at>700){jumpCandidate={raw,at:now,count:1};return false}jumpCandidate.count++;if(jumpCandidate.count<3)return false;jumpCandidate=null;heading=smooth(heading,raw,.32);return true}jumpCandidate=null;heading=smooth(heading,raw,d>18?.28:.16);return true}
  function orientation(e){if(!open)return;const now=performance.now();if(e.type==='deviceorientationabsolute')absoluteSeenAt=now;else if(now-absoluteSeenAt<1400)return;const beta=e.beta==null?NaN:Number(e.beta),gamma=e.gamma==null?NaN:Number(e.gamma),raw=rawHeading(e);if(!Number.isFinite(beta)||!Number.isFinite(gamma)||raw==null)return;const flat=Math.abs(beta)<=12&&Math.abs(gamma)<=12;if(!flat){stableCount=0;lastSample={beta,gamma,raw,at:now};setState('📱 Direzione bloccata: rimetti il telefono piatto','ct664Hold');return}if(lastSample){const tiltMove=Math.hypot(beta-lastSample.beta,gamma-lastSample.gamma);if(tiltMove>1.8){stableCount=0;lastSample={beta,gamma,raw,at:now};setState('⏸ Inclinazione rilevata: direzione congelata','ct664Hold');return}}stableCount++;lastSample={beta,gamma,raw,at:now};if(stableCount<3){setState('Mantieni il telefono piatto…','ct664Hold');return}if(acceptRaw(raw,now)){setState('✅ Piatto · ruota a sinistra/destra','ct664Ready');render()}}
  function render(){const deg=q('ct664Deg'),list=q('ct664List');if(!list)return;if(heading==null){if(deg)deg.textContent='—°';list.innerHTML='<div class="ct664Item">Attendo una rotazione orizzontale stabile.</div>';return}if(deg)deg.textContent=Math.round(heading)+'°';const o=lastPos;if(!o){list.innerHTML='<div class="ct664Item">GPS non disponibile.</div>';return}let mode='hunt';try{mode=JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode||'hunt'}catch{}const src=(state.points||[]).filter(p=>mode==='mushroom'?p.sightingKind==='mushroom':p.sightingKind!=='mushroom');if(mode==='hunt')src.push(...(window.__PFC_FRIEND_POINTS__?.()||[]),...(window.__PFC_DOG_POINTS__?.()||[]));if(state.car&&Number.isFinite(+state.car.lat)&&Number.isFinite(+state.car.lng))src.push({id:'__car__',lat:+state.car.lat,lng:+state.car.lng,name:'Auto parcheggiata',type:'Parcheggio',__car:true});const arr=src.map(p=>{const d=distKm(o,{lat:+p.lat,lng:+p.lng}),b=bear(o,{lat:+p.lat,lng:+p.lng});return{p,d,b,delta:adiff(b,heading)}}).filter(x=>Number.isFinite(x.d)&&(x.p.__friend||(x.d<=10&&x.delta<=24))).sort((a,b)=>Number(!!b.p.__friend)-Number(!!a.p.__friend)||a.d-b.d);const scope=document.querySelector('#ctRadar664 .ct679Scope');if(scope){scope.querySelectorAll('.teamRadarDot').forEach(e=>e.remove());for(const x of arr.filter(x=>x.p.__friend)){const a=(x.b-heading)*Math.PI/180,r=18+Math.min(x.d/10,1)*25,d=document.createElement('span');d.className='teamRadarDot';d.style.cssText='position:absolute;left:'+(50+Math.sin(a)*r)+'%;top:'+(50-Math.cos(a)*r)+'%;transform:translate(-50%,-50%);font-size:11px;color:white;background:#246b9d;border-radius:8px;padding:3px;max-width:80px;overflow:hidden;white-space:nowrap';d.textContent='👤 '+x.p.name;scope.appendChild(d);}}if(!arr.length){list.innerHTML='<div class="ct664Item"><b>Nessun punto in questa direzione</b><span>Ruota lentamente sul piano.</span></div>';return}list.innerHTML=arr.filter((x,i)=>x.p.__friend||i<8).map(x=>{const old=prevDist.get(x.p.id),away=!x.p.__friend&&!x.p.__dog&&old!=null&&x.d-old>0.02;prevDist.set(x.p.id,x.d);const label=x.p.species||x.p.name||x.p.type||'Punto',ico=x.p.__dog?'🐕':x.p.__friend?'👤':x.p.__car?'🚗':x.p.sightingKind==='mushroom'?'🍄':x.p.type==='Avvistamento'?'🕊':'📍',d=x.d<1?Math.round(x.d*1000)+' m':x.d.toFixed(1)+' km';return `<div class="ct664Item"><b>${ico} ${esc(label)}</b><span>${x.p.__friend?(Math.abs((x.b-heading+540)%360-180)>135?'↓ Dietro di te':((x.b-heading+540)%360-180)>24?'↗ Alla tua destra':((x.b-heading+540)%360-180)<-24?'↖ Alla tua sinistra':'↑ Davanti a te')+' · ':''}Direzione ${Math.round(x.b)}° · scarto ${Math.round(x.delta)}°</span>${away?'<div class="ct664Away">↩ Ti stai allontanando · distanza nascosta</div>':`<div style="font-size:18px;font-weight:900;margin-top:3px">${d}</div>`}</div>`}).join('')}
  window.addEventListener('pfc:friends',()=>{if(open)render()});
  function resetOrientation(){heading=null;lastSample=null;stableCount=0;jumpCandidate=null;setState('Orientamento cambiato · tieni il telefono piatto','ct664Hold');render()}
  async function openRadar(){if(!lastPos){try{const p=await getFix?.();if(p)lastPos=p}catch{}}if(!lastPos)return toast('Serve il GPS per usare il radar');modal().classList.add('open');open=true;heading=null;lastSample=null;stableCount=0;jumpCandidate=null;prevDist.clear();setState('Attendo sensore…');render();try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw Error('Permesso orientamento negato')}}catch(e){toast(e.message||'Sensore orientamento non disponibile')}if(!open)return;window.addEventListener('deviceorientationabsolute',orientation,true);window.addEventListener('deviceorientation',orientation,true);screen.orientation?.addEventListener?.('change',resetOrientation);render()}
  function closeRadar(){open=false;q('ctRadar664')?.classList.remove('open');window.removeEventListener('deviceorientationabsolute',orientation,true);window.removeEventListener('deviceorientation',orientation,true);screen.orientation?.removeEventListener?.('change',resetOrientation);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&open)closeRadar()});window.addEventListener('blur',()=>{if(open)closeRadar()});window.addEventListener('pagehide',closeRadar);
  function wire(){const b=q('ctRadarBtn');if(b){b.onclick=openRadar;b.title=`Radar orizzontale stabile v${VER}`}const old=q('ctRadarModal');if(old)old.remove()}
  function boot(){if(q('ctRadarBtn')){wire();return}let n=0,t=setInterval(()=>{n++;if(q('ctRadarBtn')){clearInterval(t);wire()}else if(n>40)clearInterval(t)},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

window.__PFC6621_RESTORE_SAFE__();radarReady=true;}
       if(radarBtn.onclick===activateRadar)throw Error('Radar non collegato');
       radarBtn.onclick();
     }catch(e){console.error('Radar',e);toast('Radar non disponibile: riprova');}
   };
   // Pure alert rules, independent of map, sensors and network.
function createPfcAlertEngine(emit){
 const near=new Map(),areas=new Map();let territory=null;const weatherSeen=new Map();
 const valid=p=>p&&p.lat!==null&&p.lng!==null&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lng)&&Math.abs(+p.lat)<=90&&Math.abs(+p.lng)<=180;
 const distance=(a,b)=>{const r=Math.PI/180,x=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(x)))};
 const same=(a,b)=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
 function rings(segments){const pending=segments.map(s=>s.slice()).filter(s=>s.length>=2),out=[];while(pending.length){let ring=pending.shift(),changed=true;while(!same(ring[0],ring.at(-1))&&changed){changed=false;for(let i=0;i<pending.length;i++){let s=pending[i];if(same(ring.at(-1),s[0]))ring.push(...s.slice(1));else if(same(ring.at(-1),s.at(-1)))ring.push(...s.slice().reverse().slice(1));else if(same(ring[0],s.at(-1)))ring=s.slice(0,-1).concat(ring);else if(same(ring[0],s[0]))ring=s.slice().reverse().slice(0,-1).concat(ring);else continue;pending.splice(i,1);changed=true;break}}if(ring.length>=4&&same(ring[0],ring.at(-1)))out.push(ring)}return out}
 function parseAreas(elements){const out=[],seen=new Set();for(const e of elements||[]){const id=e.type+':'+e.id;if(seen.has(id))continue;seen.add(id);const geom=g=>(g||[]).filter(p=>valid({lat:p.lat,lng:p.lon})).map(p=>[+p.lon,+p.lat]);let outer=[],inner=[];if(e.type==='way')outer=rings([geom(e.geometry)]);else if(e.type==='relation'){outer=rings((e.members||[]).filter(m=>m.type==='way'&&(!m.role||m.role==='outer')).map(m=>geom(m.geometry)));inner=rings((e.members||[]).filter(m=>m.role==='inner').map(m=>geom(m.geometry)))}if(outer.length)out.push({id,name:e.tags?.name||'Area protetta',outer,inner})}return out}
 function inRing(p,ring){let inside=false;const x=+p.lng,y=+p.lat;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
 function boundaryDistance(p,rings){let best=Infinity;const kx=111320*Math.cos(p.lat*Math.PI/180),ky=111320;for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],ax=(a[0]-p.lng)*kx,ay=(a[1]-p.lat)*ky,bx=(b[0]-p.lng)*kx,by=(b[1]-p.lat)*ky,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy))}return best}
 function points(p,list,range=100){if(!valid(p)||p.acc==null||!Number.isFinite(+p.acc)||p.acc>50)return;const present=new Set();for(const point of list){if(!valid(point))continue;const id=String(point.id);present.add(id);const d=distance(p,point),s=near.get(id)||{count:0,active:false,last:Infinity};if(d-p.acc>range*1.5){s.active=false;s.count=0}else if(d+p.acc<=range&&d<=s.last+3){s.count++;if(s.count>=2&&!s.active){s.active=true;emit({kind:'near',key:id,title:point.__car?'Auto vicina':'Punto vicino',message:(point.species||point.name||'Punto salvato')+' · circa '+Math.round(d)+' m'})}}else s.count=0;s.last=d;near.set(id,s)}for(const id of near.keys())if(!present.has(id))near.delete(id)}
 function protectedAreas(p,list){if(!valid(p)||p.acc==null||!Number.isFinite(+p.acc)||p.acc>50)return;for(const area of list){const inside=area.outer.some(r=>inRing(p,r))&&!area.inner.some(r=>inRing(p,r)),d=boundaryDistance(p,[...area.outer,...area.inner]);if(d<=Math.max(20,p.acc))continue;const s=areas.get(area.id)||{inside:false,count:0};if(inside){s.count++;if(s.count>=2&&!s.inside){s.inside=true;emit({kind:'protected',key:area.id,title:'Area protetta rilevata',message:area.name+' · confine OSM, verifica la cartografia ufficiale'})}}else{s.count=0;s.inside=false}areas.set(area.id,s)}}
 function territoryChange(t){const key=[t.region,t.province,t.atc].join('|');if(!t.region)return;if(territory&&territory.key!==key)emit({kind:'territory',key,title:'Cambio territorio / ATC indicativo',message:t.region+' · '+(t.atc||t.province||'ATC da verificare')+'. Verifica i confini ufficiali.'});territory={key,...t}}
 function weather(j,now=Date.now(),limits={wind:40,gust:60,rain:70}){const h=j.hourly||{},times=h.time||[],rows=times.map((t,i)=>({t:+t*1000,code:h.weather_code?.[i],wind:h.wind_speed_10m?.[i],gust:h.wind_gusts_10m?.[i],rain:h.precipitation_probability?.[i]})).filter(x=>x.t>=now-3600000&&x.t<=now+3*3600000);const c=j.current;if(c&&Number.isFinite(+c.time)&&Math.abs(+c.time*1000-now)<3600000)rows.push({t:+c.time*1000,code:c.weather_code,wind:c.wind_speed_10m,gust:c.wind_gusts_10m});const issues=[];if(rows.some(x=>[95,96,99].includes(x.code)))issues.push(['storm','Temporale previsto']);if(rows.some(x=>x.wind!=null&&x.wind>=limits.wind||x.gust!=null&&x.gust>=limits.gust))issues.push(['wind','Vento o raffiche oltre soglia']);if(rows.some(x=>x.rain!=null&&x.rain>=limits.rain))issues.push(['rain','Probabilità di pioggia almeno '+limits.rain+'%']);for(const [key,message]of issues){const old=weatherSeen.get(key);if(old==null||now-old>=3600000){weatherSeen.set(key,now);emit({kind:'weather',key,title:'Avviso meteo · prossime 3 ore',message:message+' · previsione Meteo Aeronautica Militare'})}}}
 return {distance,valid,parseAreas,inRing,boundaryDistance,points,protectedAreas,territoryChange,weather};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createPfcAlertEngine;

(function(){
 const KEY='pfc-alert-settings-v1',LOG='pfc-alert-history-v1',q=id=>document.getElementById(id);
 let cfg={near:true,protected:true,weather:true,territory:true,vibration:true,sound:false,range:100,wind:40,gust:60,rain:70},history=[];
 try{cfg={...cfg,...JSON.parse(localStorage.getItem(KEY)||'{}')};history=JSON.parse(localStorage.getItem(LOG)||'[]').slice(0,30)}catch{}
 let audio=null,lastPosition=null,lastFixAt=0,unread=0;const statuses={gps:'Attendo GPS',protected:'Attendo GPS e rete',weather:'Attendo GPS e rete',territory:'Attendo GPS e rete'};
 const jobs={};let areaData=[],areaCenter=null,areaAt=0;
 const engine=createPfcAlertEngine(notify);
 function beep(){if(!cfg.sound||!audio||audio.state!=='running')return;try{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=660;g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);o.start();o.stop(audio.currentTime+.22)}catch{}}
 function notify(item){if(document.hidden)return;if(!cfg[item.kind==='near'?'near':item.kind==='protected'?'protected':item.kind==='weather'?'weather':'territory'])return;const entry={...item,at:Date.now()};history.unshift(entry);history=history.slice(0,30);try{localStorage.setItem(LOG,JSON.stringify(history))}catch{}unread++;if(cfg.vibration)try{navigator.vibrate?.([80,60,80])}catch{}beep();const banner=q('pfcAlertBanner');banner.hidden=false;q('pfcAlertBannerText').textContent=item.title+' · '+item.message;clearTimeout(banner._timer);banner._timer=setTimeout(()=>banner.hidden=true,10000);render();}
 function render(){const b=q('pfcAlertsBtn');if(b)b.textContent='🔔 Avvisi'+(unread?' · '+unread:'');const s=q('pfcAlertStatus');if(s)s.textContent=[statuses.gps,...['protected','weather','territory'].map(k=>(k==='protected'?'Aree':k==='weather'?'Meteo':'Territorio')+': '+(cfg[k]?statuses[k]:'disattivati'))].join(' · ');const list=q('pfcAlertHistory');if(list)list.innerHTML=history.length?history.map(a=>'<div class="pfcAlertEntry"><b>'+esc(a.title)+'</b><small>'+new Date(a.at).toLocaleString('it-IT')+'</small><p>'+esc(a.message)+'</p></div>').join(''):'<p class="muted">Nessun avviso ricevuto.</p>';}
 function modal(){let m=q('pfcAlertsModal');if(m)return m;m=document.createElement('div');m.id='pfcAlertsModal';m.className='modal';m.innerHTML='<div class="dialog"><div class="sectionHead"><h2>🔔 Avvisi durante l’uscita</h2><button id="pfcAlertClose" class="iconBtn" aria-label="Chiudi avvisi">✕</button></div><p class="muted">Attivi con l’app aperta e GPS preciso. Meteo e nuovi confini richiedono rete. Confini OSM e ATC indicativo: verifica sempre le fonti ufficiali.</p><div id="pfcAlertStatus" class="pfcAlertStatus"></div><div class="pfcAlertSettings">'+[['near','Punti e auto vicini'],['protected','Ingresso nelle aree protette'],['weather','Temporali, pioggia e vento'],['territory','Cambio territorio / ATC indicativo'],['vibration','Vibrazione'],['sound','Suono']].map(([k,label])=>'<label><input type="checkbox" id="pfcAlert_'+k+'" '+(cfg[k]?'checked':'')+'>'+label+'</label>').join('')+'<label>Distanza di prossimità<select id="pfcAlertRange">'+[25,50,100,200].map(n=>'<option value="'+n+'" '+(cfg.range===n?'selected':'')+'>'+n+' m</option>').join('')+'</select></label><label>Vento (km/h)<input id="pfcAlertWind" type="number" min="20" max="100" value="'+cfg.wind+'"></label><label>Raffiche (km/h)<input id="pfcAlertGust" type="number" min="30" max="150" value="'+cfg.gust+'"></label><label>Pioggia (%)<input id="pfcAlertRain" type="number" min="30" max="100" value="'+cfg.rain+'"></label></div><p class="muted">Sono avvisi calcolati dalle previsioni, non allerte ufficiali della Protezione Civile. Il suono funziona dopo l’attivazione qui; la vibrazione dipende dal telefono.</p><button id="pfcAlertTest" type="button" class="secondary">Prova suono e vibrazione</button><h3>Ultimi avvisi</h3><div id="pfcAlertHistory"></div></div>';document.body.appendChild(m);q('pfcAlertClose').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};for(const key of ['near','protected','weather','territory','vibration','sound'])q('pfcAlert_'+key).onchange=async e=>{cfg[key]=e.target.checked;if(key==='sound'&&cfg.sound)await unlockAudio();saveCfg()};for(const [id,key,min,max]of [['Range','range',25,200],['Wind','wind',20,100],['Gust','gust',30,150],['Rain','rain',30,100]])q('pfcAlert'+id).onchange=e=>{const n=Number(e.target.value);if(!Number.isFinite(n)){e.target.value=cfg[key];return}cfg[key]=Math.max(min,Math.min(max,n));e.target.value=cfg[key];saveCfg()};q('pfcAlertTest').onclick=async()=>{if(cfg.sound)await unlockAudio();beep();if(cfg.vibration)navigator.vibrate?.([80,60,80]);toast('Prova avviso · suono e vibrazione secondo le impostazioni')};render();return m}
 async function unlockAudio(){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();await audio.resume()}catch{toast('Suono non disponibile su questo dispositivo')}}
 function saveCfg(){try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}render()}
 function openPanel(){modal().classList.add('open');unread=0;render()}
 const button=document.createElement('button');button.id='pfcAlertsBtn';button.type='button';button.className='ghost';button.onclick=openPanel;document.querySelector('.topbar')?.appendChild(button);
 const banner=document.createElement('div');banner.id='pfcAlertBanner';banner.hidden=true;banner.setAttribute('role','status');banner.innerHTML='<button id="pfcAlertBannerText" type="button"></button><button id="pfcAlertDismiss" type="button" aria-label="Chiudi avviso">✕</button>';document.body.appendChild(banner);q('pfcAlertBannerText').onclick=openPanel;q('pfcAlertDismiss').onclick=()=>banner.hidden=true;
 async function json(url){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);try{const r=await fetch(url,{signal:ac.signal,headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
 function eligible(kind,p,interval,movement){const j=jobs[kind]||(jobs[kind]={});const now=Date.now();if(j.busy||j.at&&now-j.at<interval&&(!j.pos||engine.distance(j.pos,p)<movement))return false;if(j.at&&now-j.at<60000)return false;j.busy=true;j.at=now;j.pos={...p};return true}
 async function protectedLoad(p){if(!cfg.protected||!eligible('protected',p,5*60000,1000))return;statuses.protected='caricamento confini locali';render();try{const dy=3/111.32,dx=3/(111.32*Math.max(.25,Math.cos(p.lat*Math.PI/180))),bbox=[p.lat-dy,p.lng-dx,p.lat+dy,p.lng+dx].join(',');const query='[out:json][timeout:8][maxsize:3500000];(way["boundary"="protected_area"]('+bbox+');relation["boundary"="protected_area"]('+bbox+');way["leisure"="nature_reserve"]('+bbox+');relation["leisure"="nature_reserve"]('+bbox+'););out geom;is_in('+p.lat+','+p.lng+')->.here;(area.here["boundary"="protected_area"];area.here["leisure"="nature_reserve"];)->.inside;rel(pivot.inside);out geom;';const j=await json('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query));areaData=engine.parseAreas(j.elements);areaCenter={...p};areaAt=Date.now();statuses.protected=areaData.length?areaData.length+' confini OSM disponibili':'nessun confine restituito · copertura non garantita';if(cfg.protected&&lastPosition&&engine.distance(lastPosition,p)<2000)engine.protectedAreas(lastPosition,areaData)}catch{statuses.protected='rete non disponibile · verifica non aggiornata'}finally{jobs.protected.busy=false;render()}}
 async function weatherLoad(p){if(!cfg.weather||!eligible('weather',p,15*60000,5000))return;statuses.weather='caricamento previsioni';render();try{const j=await json('https://pfc-weather.invalid/forecast?latitude='+p.lat+'&longitude='+p.lng+'&current=weather_code,wind_speed_10m,wind_gusts_10m&hourly=weather_code,precipitation_probability,wind_speed_10m,wind_gusts_10m&wind_speed_unit=kmh&timeformat=unixtime&forecast_days=2');if(cfg.weather&&lastPosition&&engine.distance(lastPosition,p)<5000)engine.weather(j,Date.now(),cfg);statuses.weather='aggiornato '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}catch{statuses.weather='rete non disponibile · previsione non aggiornata'}finally{jobs.weather.busy=false;render()}}
 async function territoryLoad(p){if(!cfg.territory||!eligible('territory',p,5*60000,1000))return;try{const result=await window.__PFC_TERRITORY_REFRESH__?.();statuses.territory=result?'aggiornato · ATC indicativo':'non aggiornato · verifica manuale'}finally{jobs.territory.busy=false;render()}}
 function onPosition(p){if(document.hidden||!engine.valid(p))return;lastPosition={...p};lastFixAt=Date.now();statuses.gps=p.acc==null||!Number.isFinite(+p.acc)||p.acc>50?'GPS poco preciso · avvisi di posizione sospesi':'GPS ±'+Math.round(p.acc)+' m';if(p.acc!=null&&Number.isFinite(+p.acc)&&p.acc<=50){const mode=(()=>{try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode}catch{return 'hunt'}})();const list=(state.points||[]).filter(x=>mode==='mushroom'?x.sightingKind==='mushroom':x.sightingKind!=='mushroom');if(state.car)list.push({...state.car,id:'__car__',name:'Auto parcheggiata',__car:true});if(cfg.near)engine.points(p,list,cfg.range);if(cfg.protected&&areaCenter&&Date.now()-areaAt<30*60000&&engine.distance(areaCenter,p)<2000)engine.protectedAreas(p,areaData);Promise.allSettled([protectedLoad(p),weatherLoad(p),territoryLoad(p)]);}render()}
 window.addEventListener('pfc:position',e=>onPosition(e.detail));window.addEventListener('pfc:territory',e=>{window.__PFC_TERRITORY_LAST__=e.detail;if(cfg.territory&&Date.now()-lastFixAt<120000)engine.territoryChange(e.detail)});
 setInterval(()=>{if(document.hidden)return;if(Date.now()-lastFixAt>60000){statuses.gps='GPS da aggiornare · avvisi di posizione sospesi';render();return}if(lastPosition)Promise.allSettled([protectedLoad(lastPosition),weatherLoad(lastPosition),territoryLoad(lastPosition)])},30000);
 window.__PFC_ALERT_STATUS__=()=>({version:'6.8.0',settings:{...cfg},statuses:{...statuses},count:history.length});render();if(lastPos)onPosition(lastPos);
})();

   function backupPayload(){
     let activeTrack=null;try{activeTrack=JSON.parse(localStorage.getItem('cacciatraccia-active-track-v1')||'null')}catch{}
     return structuredClone({version:2,data:state,settings:window.PFC_LOCAL?.settings()||{},activeTrack,deletedPoints:pointDeletionList()});
   }
   function restoreCloudPayload(payload,mode='merge'){
     if(track.active)throw Error('Termina la camminata in corso prima di ripristinare un backup.');
     const incoming=payload?.data;if(!incoming||!['points','outings','diary'].every(k=>Array.isArray(incoming[k]))||incoming.points.some(p=>!validCoords(p))||(incoming.car!=null&&!validCoords(incoming.car))||incoming.outings.some(o=>!o||!Array.isArray(o.coords)||o.coords.some(c=>!Array.isArray(c)||!validCoords({lat:c[0],lng:c[1]})))||incoming.diary.some(d=>!d||typeof d!=='object'))throw Error('Backup non valido: dati locali conservati');
     const previous=structuredClone(state),settingsBefore=window.PFC_LOCAL?.settings()||{},trackBefore=localStorage.getItem('cacciatraccia-active-track-v1');
     const merge=(current,old)=>{const m=new Map(current.map(x=>[String(x.id),x]));for(const x of old){const local=m.get(String(x.id));if(!local||Date.parse(x.updatedAt||x.createdAt||0)>Date.parse(local.updatedAt||local.createdAt||0))m.set(String(x.id),x)}return [...m.values()]};
     const remoteDeletions=Array.isArray(payload.deletedPoints)?payload.deletedPoints:[];
     const mergedDeletions=mode==='replace'?combinePointDeletions([],remoteDeletions):combinePointDeletions(pointDeletionList(),remoteDeletions);
     const deletedById=new Map(mergedDeletions.map(x=>[x.id,x.deletedAt]));
     const next=mode==='replace'?structuredClone(incoming):{...previous,points:merge(previous.points,incoming.points).filter(p=>pointSurvivesDeletion(p,deletedById)),outings:merge(previous.outings,incoming.outings),diary:merge(previous.diary,incoming.diary),car:previous.car||incoming.car||null};
     makeSnapshot();
     try{
       localStorage.setItem(STORE,JSON.stringify(next));
       // Only restore whitelisted application settings, never auth or group secrets.
       if(mode==='replace')for(const key of Object.keys(settingsBefore)){if(key===POINT_DELETIONS_KEY)continue;let value=payload.settings?.[key];if(value==null)continue;if(typeof value!=='string')throw Error('Impostazioni backup non valide');if(key==='pfc-v661-settings'){const c=JSON.parse(value);c.region='Puglia';value=JSON.stringify(c)}if(key==='cacciatraccia-weather-v2')value=JSON.stringify({model:'best_match',site:'openmeteo',custom:''});localStorage.setItem(key,value);}
       localStorage.setItem(POINT_DELETIONS_KEY,JSON.stringify(mergedDeletions));
       if(payload.activeTrack?.coords?.length&&!trackBefore){if(payload.activeTrack.coords.some(c=>!validCoords({lat:c[0],lng:c[1]})))throw Error('Percorso recuperato non valido');localStorage.setItem('cacciatraccia-active-track-v1',JSON.stringify(payload.activeTrack))}
       state=next;renderAll();window.dispatchEvent(new Event('pfc:data-changed'));return true;
     }catch(e){state=previous;localStorage.setItem(STORE,JSON.stringify(previous));for(const [k,v]of Object.entries(settingsBefore))if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);if(trackBefore==null)localStorage.removeItem('cacciatraccia-active-track-v1');else localStorage.setItem('cacciatraccia-active-track-v1',trackBefore);renderAll();throw e;}
   }
   window.__PFC_LIVE_API__={backup:backupPayload,restoreBackup:restoreCloudPayload,points:()=>structuredClone(state.points||[]),map:()=>map,getFix:()=>getFix(),showMap:()=>{follow=false;$('followBtn')?.classList.remove('active');showPage('map');},openSightings:()=>{showPage('diary');historyFilter='sightings';document.querySelectorAll('[data-history]').forEach(b=>b.classList.toggle('active',b.dataset.history==='sightings'));renderDiary();}};
   const badge=$('ctVersionBadge');if(badge)badge.textContent='• V6.9.11';
   setBootStatus('ready');
 }catch(e){console.error('Avvio funzioni',e);setBootStatus('error',e.message);}
}).catch(e=>{
 console.error('Avvio mappa',e);setBootStatus('error',e.message);
 const target=$('map');if(target&&!target.children.length)target.innerHTML='<div class="empty">Mappa non caricata. Controlla la connessione e ricarica.</div>';
});

})();





