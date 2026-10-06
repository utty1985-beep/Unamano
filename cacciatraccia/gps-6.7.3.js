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
  window.__PFC_FINAL_DIAG__=()=>({version:'6.7.3',follow,lastPos:lastPos?{...lastPos}:null,gpsWatchActive:gpsWatch!=null,gpsPending:!!pending,retries,selected:selected?{lat:selected.lat,lng:selected.lng}:null,center:map?.getCenter?.()});
  document.documentElement.dataset.pfcVersion='6.7.3';
})();
