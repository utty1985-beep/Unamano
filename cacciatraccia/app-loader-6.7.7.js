const requestedVersion='674';
const finalBuild=requestedVersion==='674'||requestedVersion==='final'||requestedVersion==='671';
const longPressTester=requestedVersion==='6622'||finalBuild;
const safeFixTester=requestedVersion==='6621'||longPressTester;
const fullFixTester=requestedVersion==='6620'||safeFixTester;
const experimental=requestedVersion==='6611'||fullFixTester;
const gpsFixTester=requestedVersion==='6600'||fullFixTester;
const assetVersion=finalBuild?'6.7.4-final':(longPressTester?'6.6.22-longpress':(safeFixTester?'6.6.21-safefix':(fullFixTester?'6.6.20-fullfix':(experimental?'6.6.4-test5-lazy':(gpsFixTester?'6.6.19-gpsfix':'6.5.2-r7')))));
const core=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const enhancementParts=[27,28,29,30,32,33,34,...(longPressTester&&!finalBuild?[37]:[]),...(finalBuild?[38]:[])];
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
  if(pill)pill.textContent=finalBuild?'● avvio 6.7.7 su base stabile…':(experimental?'● tester: avvio base stabile…':(gpsFixTester?'● tester GPS: avvio base stabile…':'● stabile 6.5.2…'));

  // Prima avvia SEMPRE la base stabile: la mappa diventa utilizzabile subito.

  let coreSrc=await loadGroup(core,'base',6);
  coreSrc += '\n' + await fetchPart('./gps-6.7.4.js?v=6.7.4');
  if(fullFixTester){
    const startupOld='ensureModalActions(); await ensureLeaflet(); bind(); initMap();';
    const startupNew='ensureModalActions(); await ensureLeaflet(); initMap(); bind();';
    if(!coreSrc.includes(startupOld))throw new Error('Fix avvio mappa non applicabile');
    coreSrc=coreSrc.replace(startupOld,startupNew);
    coreSrc=coreSrc.replace('(async()=>{\n  try{\n    if(\'serviceWorker\' in navigator)', 'window.__PFC_BOOT_READY__=(async()=>{\n  try{\n    if(\'serviceWorker\' in navigator)');
    coreSrc=coreSrc.replace('await navigator.serviceWorker.register(', 'navigator.serviceWorker.register(');
    coreSrc=coreSrc.replace("register('./sw.js?v=6.3.4');", "register('./sw.js?v=6.3.4').catch(e=>console.warn('SW',e));");
    coreSrc=coreSrc.replace('console.error(e); const m=document', 'console.error(e); throw e; const m=document');

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
    coreSrc=coreSrc.replace("navigator.serviceWorker.register('./sw.js?v=6.3.4')",`navigator.serviceWorker.register('./sw-6.7.7.js?v=${assetVersion}')`);
    coreSrc += "\nconst __pfc6621SafeStartGps=startGps,__pfc6621SafeGetFix=getFix,__pfc6621SafeLocate=locate;\nwindow.__PFC6621_EVAL__=(src)=>eval(src);\nwindow.__PFC6621_RESTORE_SAFE__=()=>{startGps=__pfc6621SafeStartGps;getFix=__pfc6621SafeGetFix;locate=__pfc6621SafeLocate;};\n";
  }
  new Function(coreSrc)();
  await window.__PFC_BOOT_READY__;

  if(!experimental){
    if(pill)pill.textContent=gpsFixTester?'● tester GPS 6.6.17 pronta':'● stabile 6.5.2 pronta';
  }else{
    if(pill)pill.textContent='● base pronta · carico funzioni tester…';

    // Le funzioni tester vengono aggiunte solo dopo il primo disegno della mappa.
    runLater(async()=>{
      try{
        let extraSrc=await loadGroup(enhancements,'funzioni tester',4);
        const modeWrite="if(q('ct661ModePill'))q('ct661ModePill').textContent=hunt?'Caccia':'Funghi';";
        if(!extraSrc.includes(modeWrite))throw new Error('Correzione interfaccia modalità non applicabile');
        extraSrc=extraSrc.replace("const first=page.querySelector('.searchRow')||page.firstElementChild;page.insertBefore(card,first);", "const search=page.querySelector('.searchRow');let first=search||page.firstElementChild;while(first&&first.parentElement!==page)first=first.parentElement;page.insertBefore(card,first||null);");
        extraSrc=extraSrc.replace(modeWrite,"const pill=q('ct661ModePill'),label=hunt?'Caccia':'Funghi';if(pill&&pill.textContent!==label)pill.textContent=label;");
        if(safeFixTester){const ev=window.__PFC6621_EVAL__;if(typeof ev!=='function')throw new Error('Contesto tester sicuro non pronto');ev(extraSrc);window.__PFC6621_RESTORE_SAFE__?.();}else new Function(extraSrc)();
        window.__PFC_EXTRA_ERROR__=null;window.__PFC_EXTRAS_READY__=true;window.dispatchEvent(new Event('pfc-extra-state'));
        // Il radar NON viene più caricato in automatico.
        // Viene scaricato e attivato soltanto quando l'utente preme "Radar punti".
        const radarBtn=document.getElementById('ctRadarBtn');
        const versionBadge=document.getElementById('ctVersionBadge');if(versionBadge)versionBadge.textContent='• V6.7.7';
        if(pill)pill.textContent=finalBuild?'● 6.7.7 pronta · GPS automatico recuperato · radar su richiesta':(longPressTester?'● tester 6.6.22 pronta · pressione lunga attiva · radar su richiesta':(safeFixTester?'● tester 6.6.21 pronta · radar su richiesta':(fullFixTester?'● tester 6.6.20 pronta · radar su richiesta':'● tester 6.6.3 pronta · radar su richiesta')));
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
              if(pill)pill.textContent=finalBuild?'● 6.7.7 completa':(longPressTester?'● tester 6.6.22 completa':(safeFixTester?'● tester 6.6.21 completa':(fullFixTester?'● tester 6.6.20 completa':'● tester 6.6.4 pronta')));
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
        window.__PFC_EXTRA_ERROR__=String(e?.message||e);window.dispatchEvent(new Event('pfc-extra-state'));console.warn('Funzioni tester non caricate',e);
        if(pill)pill.textContent='● base stabile attiva · extra non caricati';
      }
    },220);
  }
}catch(e){
  bootError(e?.name==='AbortError'?'rete lenta durante avvio':(e?.message||e));
}
