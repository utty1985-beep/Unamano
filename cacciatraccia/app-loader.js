const requestedVersion=new URLSearchParams(location.search).get('v')||'';
const experimental=requestedVersion==='6611';
const gpsFixTester=requestedVersion==='6600';
const assetVersion=experimental?'6.6.4-test5-lazy':(gpsFixTester?'6.6.19-gpsfix':'6.5.2-r7');
const core=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const enhancements=[27,28,29,30,32,33,34].map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
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
  if(pill)pill.textContent=experimental?'● tester: avvio base stabile…':(gpsFixTester?'● tester GPS: avvio base stabile…':'● stabile 6.5.2…');

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
  new Function(coreSrc)();

  if(!experimental){
    if(pill)pill.textContent=gpsFixTester?'● tester GPS 6.6.17 pronta':'● stabile 6.5.2 pronta';
  }else{
    if(pill)pill.textContent='● base pronta · carico funzioni tester…';

    // Le funzioni tester vengono aggiunte solo dopo il primo disegno della mappa.
    runLater(async()=>{
      try{
        const extraSrc=await loadGroup(enhancements,'funzioni tester',4);
        new Function(extraSrc)();
        // Il radar NON viene più caricato in automatico.
        // Viene scaricato e attivato soltanto quando l'utente preme "Radar punti".
        const radarBtn=document.getElementById('ctRadarBtn');
        if(pill)pill.textContent='● tester 6.6.3 pronta · radar su richiesta';
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
              new Function(radarSrc)();
              radarBtn.disabled=false;
              radarBtn.textContent=oldLabel;
              radarLoading=false;
              if(pill)pill.textContent='● tester 6.6.4 pronta';
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
