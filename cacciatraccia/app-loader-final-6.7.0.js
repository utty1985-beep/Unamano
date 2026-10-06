const requestedVersion='6700';
const longPressTester=true;
const safeFixTester=true;
const fullFixTester=true;
const experimental=true;
const gpsFixTester=true;
const assetVersion='6.7.0-final';
const core=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const enhancementParts=[27,28,29,30,32,33,34,37,38];
const enhancements=enhancementParts.map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const radar=`./v6/part35.txt?v=${assetVersion}`;

function bootError(m){
  console.error(m);
  const pill=document.getElementById('netPill');
  if(pill)pill.textContent='● errore avvio';
  const map=document.getElementById('map');
  if(map&&!map.children.length)map.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore avvio: ${String(m)}</div>`;
}
const fetchPart=async p=>{
  const ac=new AbortController();
  const tm=setTimeout(()=>ac.abort(),12000);
  try{
    const r=await fetch(new URL(p,location.href),{cache:'no-store',signal:ac.signal});
    if(!r.ok)throw new Error(`${p}: ${r.status}`);
    return await r.text();
  } finally { clearTimeout(tm); }
};
async function loadGroup(parts,label,batchSize=6){
  const texts=[];
  const pill=document.getElementById('netPill');
  for(let i=0;i<parts.length;i+=batchSize){
    const batch=parts.slice(i,i+batchSize);
    const got=await Promise.all(batch.map(fetchPart));
    texts.push(...got);
    if(pill)pill.textContent=`● ${label} ${Math.min(i+batchSize,parts.length)}/${parts.length}`;
  }
  return texts.join('');
}
function runLater(fn,delay=180){
  if('requestIdleCallback' in window){
    requestIdleCallback(()=>fn(),{timeout:900});
  }else{
    setTimeout(fn,delay);
  }
}

try{
  const pill=document.getElementById('netPill');
  if(pill)pill.textContent=experimental?'● finale 6.7.0: avvio base stabile…':(gpsFixTester?'● tester GPS: avvio base stabile…':'● stabile 6.5.2…');

  // Prima avvia SEMPRE la base stabile: la mappa diventa utilizzabile subito.

  let coreSrc=await loadGroup(core,'base',6);
  if(gpsFixTester){
    coreSrc += `
(function(){
  let __gpsRetryTimer=null;
  const __gpsHigh={enableHighAccuracy:true,timeout:12000,maximumAge:3000};
  const __gpsFallback={enableHighAccuracy:false,timeout:12000,maximumAge:60000};

  function __gpsText(e){
    if(!e)return 'GPS non disponibile';
    if(e.code===1)return 'GPS: autorizzazione negata';
    if(e.code===2)return 'GPS: posizione non disponibile';
    if(e.code===3)return 'GPS: ricerca posizione…';
    return 'GPS non disponibile';
  }

  function __applyGps(p,center){
    lastPos={
      lat:p.coords.latitude,
      lng:p.coords.longitude,
      acc:Math.round(p.coords.accuracy||0),
      heading:p.coords.heading,
      speed:p.coords.speed
    };
    const badge=$('gpsBadge');
    if(badge)badge.textContent='GPS ±'+lastPos.acc+' m';
    if(!userMarker){
      userMarker=L.circleMarker([lastPos.lat,lastPos.lng],{
        radius:9,color:'#fff',weight:4,fillColor:'#2878d8',fillOpacity:1
      }).addTo(map);
    }else{
      userMarker.setLatLng([lastPos.lat,lastPos.lng]);
    }
    if(center||follow)map.setView([lastPos.lat,lastPos.lng],Math.max(map.getZoom(),16),{animate:true});
    updateCar();
    return {lat:lastPos.lat,lng:lastPos.lng,acc:lastPos.acc,heading:lastPos.heading};
  }

  function __oneGps(opts){
    return new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(resolve,reject,opts);
    });
  }

  getFix=async function(){
    if(!navigator.geolocation){
      const badge=$('gpsBadge'); if(badge)badge.textContent='GPS non disponibile';
      toast('GPS non disponibile');
      return null;
    }
    try{
      let p;
      try{
        p=await __oneGps(__gpsHigh);
      }catch(e){
        if(e&&e.code===1)throw e;
        p=await __oneGps(__gpsFallback);
      }
      return __applyGps(p,false);
    }catch(e){
      const badge=$('gpsBadge'); if(badge)badge.textContent=__gpsText(e);
      toast(__gpsText(e));
      return null;
    }
  };

  startGps=function(){
    if(!navigator.geolocation){
      const badge=$('gpsBadge'); if(badge)badge.textContent='GPS non disponibile';
      return;
    }
    if(__gpsRetryTimer){clearTimeout(__gpsRetryTimer);__gpsRetryTimer=null;}
    if(gpsWatch!=null){
      try{navigator.geolocation.clearWatch(gpsWatch);}catch(e){}
      gpsWatch=null;
    }
    const badge=$('gpsBadge'); if(badge)badge.textContent='GPS: ricerca posizione…';
    gpsWatch=navigator.geolocation.watchPosition(
      p=>__applyGps(p,false),
      e=>{
        if(gpsWatch!=null){
          try{navigator.geolocation.clearWatch(gpsWatch);}catch(err){}
          gpsWatch=null;
        }
        const b=$('gpsBadge'); if(b)b.textContent=__gpsText(e);
        if(e&&e.code!==1){
          __gpsRetryTimer=setTimeout(()=>{
            __gpsRetryTimer=null;
            if(!document.hidden&&gpsWatch==null)startGps();
          },2500);
        }
      },
      {enableHighAccuracy:true,maximumAge:5000,timeout:18000}
    );
  };

  locate=async function(){
    const badge=$('gpsBadge'); if(badge)badge.textContent='GPS: ricerca posizione…';
    const p=await getFix();
    if(!p){
      if(gpsWatch==null)startGps();
      return;
    }
    follow=true;
    $('followBtn')?.classList.add('active');
    map.setView([p.lat,p.lng],16,{animate:true});
    if(gpsWatch==null)startGps();
  };

  function __resumeGps(){
    if(document.hidden)return;
    if(gpsWatch!=null){
      try{navigator.geolocation.clearWatch(gpsWatch);}catch(e){}
      gpsWatch=null;
    }
    setTimeout(()=>{if(gpsWatch==null)startGps();},300);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)__resumeGps();});
  window.addEventListener('pageshow',__resumeGps);
  window.addEventListener('focus',()=>{if(gpsWatch==null)__resumeGps();});
})();
`;
  }
  if(fullFixTester){
    const startupOld='ensureModalActions(); await ensureLeaflet(); bind(); initMap();';
    const startupNew='ensureModalActions(); await ensureLeaflet(); initMap(); bind();';
    if(!coreSrc.includes(startupOld))throw new Error('Fix avvio mappa non applicabile');
    coreSrc=coreSrc.replace(startupOld,startupNew);

    const oldDefaultTime='const now=new Date();now.setMinutes(0,0,0);now.setHours(now.getHours()+1);';
    if(coreSrc.includes(oldDefaultTime))coreSrc=coreSrc.replace(oldDefaultTime,'const now=new Date();now.setSeconds(0,0);');

    const windFn=/function pointBaseWind\(p\)\{[\s\S]*?return \{deg,speed\};\n  \}/;
    if(!windFn.test(coreSrc))throw new Error('Fix meteo base non applicabile');
    coreSrc=coreSrc.replace(windFn,"function pointBaseWind(p){\n    const num=v=>(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))?Number(v):null;\n    let deg=num(p.windDeg);if(deg==null)deg=num(p.weather?.windDeg);\n    if(deg==null){\n      const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];\n      const n=String(p.windName||p.weather?.windName||'').replace(/\\s*\\(.*?\\)\\s*/g,'').trim(),ix=names.indexOf(n);\n      if(ix>=0)deg=ix*45;\n    }\n    const speed=num(p.windSpeed)??num(p.weather?.windSpeed);\n    const gust=num(p.windGust)??num(p.weather?.windGust);\n    const rain=num(p.weather?.rainProbability);\n    return {deg,speed,gust,rain};\n  }");

    const compareOld="if(base.deg==null||base.speed==null){reason='Manca il vento di riferimento salvato';}\n        else{const dd=angleDiff(base.deg,f.dir),ds=Math.abs(base.speed-f.speed);good=dd<=45&&ds<=10&&f.rain<=55;reason=`Δ direzione ${Math.round(dd)}° · Δ velocità ${Math.round(ds)} km/h`;}";
    const compareNew="if(base.deg==null||base.speed==null){reason='Mancano dati meteo di riferimento salvati';}\n        else{const dd=angleDiff(base.deg,f.dir),ds=Math.abs(base.speed-f.speed),checks=[dd<=45,ds<=10],parts=[`Δ direzione ${Math.round(dd)}°`,`Δ velocità ${Math.round(ds)} km/h`];if(base.gust!=null&&Number.isFinite(+f.gust)){const dg=Math.abs(base.gust-(+f.gust));checks.push(dg<=15);parts.push(`Δ raffiche ${Math.round(dg)} km/h`)}if(base.rain!=null&&Number.isFinite(+f.rain)){const dr=Math.abs(base.rain-(+f.rain));checks.push(dr<=25);parts.push(`Δ pioggia ${Math.round(dr)}%`)}good=checks.every(Boolean);reason=parts.join(' · ');}";
    if(!coreSrc.includes(compareOld))throw new Error('Fix confronto condizioni non applicabile');
    coreSrc=coreSrc.replace(compareOld,compareNew);
  }
  if(safeFixTester){
    const baseWeatherHead="async function weather(lat,lng){\n  $('weatherBody')";
    const extWeatherHead="weather=async function(lat,lng){\n    $('weatherBody')";
    if(!coreSrc.includes(baseWeatherHead)||!coreSrc.includes(extWeatherHead))throw new Error('Fix meteo concorrente non applicabile');
    coreSrc=coreSrc.replace(baseWeatherHead,"async function weather(lat,lng){\n  const __pfcTargetLat=+lat,__pfcTargetLng=+lng;\n  $('weatherBody')");
    coreSrc=coreSrc.replace(extWeatherHead,"weather=async function(lat,lng){\n    const __pfcTargetLat=+lat,__pfcTargetLng=+lng;\n    $('weatherBody')");
    const selectedOld='selected=selected||{lat,lng};';
    const selectedCount=coreSrc.split(selectedOld).length-1;
    if(selectedCount<2)throw new Error('Guardia meteo non applicabile');
    const selectedGuard=longPressTester
      ?"if(!selected){selected={lat:__pfcTargetLat,lng:__pfcTargetLng,weather:null};}else if(!Number.isFinite(+selected.lat)||!Number.isFinite(+selected.lng)||Math.abs((+selected.lat)-__pfcTargetLat)>1e-7||Math.abs((+selected.lng)-__pfcTargetLng)>1e-7)return null;"
      :"if(!selected||!Number.isFinite(+selected.lat)||!Number.isFinite(+selected.lng)||Math.abs((+selected.lat)-__pfcTargetLat)>1e-7||Math.abs((+selected.lng)-__pfcTargetLng)>1e-7)return null;";
    coreSrc=coreSrc.split(selectedOld).join(selectedGuard);
    coreSrc=coreSrc.replace("navigator.serviceWorker.register('./sw.js?v=6.3.4')",`navigator.serviceWorker.register('./sw.js?v=${assetVersion}')`);
    coreSrc += "\nconst __pfc6621SafeStartGps=startGps,__pfc6621SafeGetFix=getFix,__pfc6621SafeLocate=locate;\nwindow.__PFC6621_EVAL__=(src)=>eval(src);\nwindow.__PFC6621_RESTORE_SAFE__=()=>{startGps=__pfc6621SafeStartGps;getFix=__pfc6621SafeGetFix;locate=__pfc6621SafeLocate;};\n";
  }
  new Function(coreSrc)();

  if(!experimental){
    if(pill)pill.textContent=gpsFixTester?'● tester GPS 6.6.17 pronta':'● stabile 6.5.2 pronta';
  }else{
    if(pill)pill.textContent='● base pronta · carico funzioni tester…';

    // Le funzioni tester vengono aggiunte solo dopo il primo disegno della mappa.
    runLater(async()=>{
      try{
        const extraSrc=await loadGroup(enhancements,'funzioni tester',4);
        if(safeFixTester){const ev=window.__PFC6621_EVAL__;if(typeof ev!=='function')throw new Error('Contesto tester sicuro non pronto');ev(extraSrc);window.__PFC6621_RESTORE_SAFE__?.();}else new Function(extraSrc)();
        // Il radar NON viene più caricato in automatico.
        // Viene scaricato e attivato soltanto quando l'utente preme "Radar punti".
        const radarBtn=document.getElementById('ctRadarBtn');
        if(pill)pill.textContent=longPressTester?'● finale 6.7.0 pronta · selezione mappa rinforzata · radar su richiesta':(safeFixTester?'● tester 6.6.21 pronta · radar su richiesta':(fullFixTester?'● tester 6.6.20 pronta · radar su richiesta':'● tester 6.6.3 pronta · radar su richiesta'));
        if(radarBtn){
          let radarLoading=false;
          const lazyRadar=async()=>{
            if(radarLoading)return;
            radarLoading=true;
            radarBtn.disabled=true;
            const oldLabel=radarBtn.textContent;
            radarBtn.textContent='📡 Carico radar…';
            try{
              const radarSrc=await fetchPart(radar);
              if(safeFixTester){const ev=window.__PFC6621_EVAL__;if(typeof ev!=='function')throw new Error('Contesto radar sicuro non pronto');ev(radarSrc);window.__PFC6621_RESTORE_SAFE__?.();}else new Function(radarSrc)();
              radarBtn.disabled=false;
              radarBtn.textContent=oldLabel;
              radarLoading=false;
              if(pill)pill.textContent=longPressTester?'● finale 6.7.0 completa':(safeFixTester?'● tester 6.6.21 completa':(fullFixTester?'● tester 6.6.20 completa':'● tester 6.6.4 pronta'));
              // part35 sostituisce onclick in modo sincrono; rilancio il click una sola volta.
              if(radarBtn.onclick!==lazyRadar)radarBtn.click();
              else throw new Error('radar non collegato');
            }catch(e){
              console.warn('Radar tester non caricato',e);
              radarLoading=false;
              radarBtn.disabled=false;
              radarBtn.textContent=oldLabel;
              radarBtn.onclick=lazyRadar;
              if(pill)pill.textContent='● tester pronta · radar non caricato';
            }
          };
          radarBtn.onclick=lazyRadar;
        }
      }catch(e){
        console.warn('Funzioni tester non caricate',e);
        if(pill)pill.textContent='● base stabile attiva · extra non caricati';
      }
    },220);
  }
}catch(e){
  bootError(e?.name==='AbortError'?'rete lenta durante avvio':(e?.message||e));
}
