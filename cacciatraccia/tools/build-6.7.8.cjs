const fs=require('fs');const fullFixTester=true,safeFixTester=true,longPressTester=true,assetVersion='6.7.4-final';
  let coreSrc=Array.from({length:25},(_,i)=>fs.readFileSync(`v6/part${String(i).padStart(2,'0')}.txt`,'utf8')).join('');
  coreSrc += '\n' + fs.readFileSync('gps-6.7.4.js','utf8');
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
    coreSrc=coreSrc.replace("navigator.serviceWorker.register('./sw.js?v=6.3.4')",`navigator.serviceWorker.register('./sw-6.7.4.js?v=${assetVersion}')`);
    coreSrc += "\nconst __pfc6621SafeStartGps=startGps,__pfc6621SafeGetFix=getFix,__pfc6621SafeLocate=locate;\nwindow.__PFC6621_EVAL__=(src)=>eval(src);\nwindow.__PFC6621_RESTORE_SAFE__=()=>{startGps=__pfc6621SafeStartGps;getFix=__pfc6621SafeGetFix;locate=__pfc6621SafeLocate;};\n";
  }


coreSrc=coreSrc.replace("navigator.serviceWorker.register('./sw-6.7.4.js?v=6.7.4-final')","navigator.serviceWorker.register('./sw-6.7.8.js?v=6.7.8')");
coreSrc=coreSrc.replace("window.__PFC6621_EVAL__=(src)=>eval(src);",'');
coreSrc=coreSrc.replace("version:'6.7.4'","version:'6.7.8'").replace("dataset.pfcVersion='6.7.4'","dataset.pfcVersion='6.7.8'");
let extras=[27,28,29,30,32,33,34,38].map(i=>fs.readFileSync(`v6/part${i}.txt`,'utf8')).join('');
const insertion="const first=page.querySelector('.searchRow')||page.firstElementChild;page.insertBefore(card,first);";
if(!extras.includes(insertion))throw Error('Territory insertion source changed');
extras=extras.replace(insertion,"const first=Array.from(page.children).find(e=>e.classList.contains('mapWrap'));page.insertBefore(card,first||null);");
const modeWrite="if(q('ct661ModePill'))q('ct661ModePill').textContent=hunt?'Caccia':'Funghi';";
extras=extras.replace(modeWrite,"const pill=q('ct661ModePill'),label=hunt?'Caccia':'Funghi';if(pill&&pill.textContent!==label)pill.textContent=label;");
const radar=fs.readFileSync('v6/part35.txt','utf8');
const tail=`
window.__PFC_APP_STATUS__={version:'6.7.8',state:'loading'};
const setBootStatus=(state,error=null)=>{
  window.__PFC_APP_STATUS__={version:'6.7.8',state,error};
  const pill=$('netPill');if(pill){pill.textContent=state==='ready'?'v6.7.8':state==='error'?'Avvio da riprovare':'Caricamento…';pill.title=error||'Passione Funghi e Caccia 6.7.8';}
  window.dispatchEvent(new CustomEvent('pfc:ready',{detail:window.__PFC_APP_STATUS__}));
};
setBootStatus('loading');
window.__PFC_BOOT_READY__.then(()=>{
 try{
   ${extras}
   window.__PFC6621_RESTORE_SAFE__();
   let radarReady=false;
   const radarBtn=$('ctRadarBtn');
   radarBtn.onclick=function activateRadar(){
     try{
       if(!radarReady){${radar}\nwindow.__PFC6621_RESTORE_SAFE__();radarReady=true;}
       if(radarBtn.onclick===activateRadar)throw Error('Radar non collegato');
       radarBtn.onclick();
     }catch(e){console.error('Radar',e);toast('Radar non disponibile: riprova');}
   };
   const badge=$('ctVersionBadge');if(badge)badge.textContent='• V6.7.8';
   setBootStatus('ready');
 }catch(e){console.error('Avvio funzioni',e);setBootStatus('error',e.message);}
}).catch(e=>{
 console.error('Avvio mappa',e);setBootStatus('error',e.message);
 const target=$('map');if(target&&!target.children.length)target.innerHTML='<div class="empty">Mappa non caricata. Controlla la connessione e ricarica.</div>';
});
`;
fs.writeFileSync('app-6.7.8.js','// Passione Funghi e Caccia 6.7.8: generated from preserved stable modules.\n(()=>{\n'+coreSrc+'\n'+tail+'\n})();\n');
