/* Official Puglia boundaries and source monitoring. No "all clear" is inferred. */
function createPugliaRestrictionEngine(){
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p.lat)!==(b[1]>p.lat)&&p.lng<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function inside(p,feature){if(!valid(p))return false;const b=feature.bbox;if(b&&(p.lng<b[0]||p.lat<b[1]||p.lng>b[2]||p.lat>b[3]))return false;return feature.rings.reduce((yes,ring)=>inRing(p,ring)?!yes:yes,false);}
 function boundary(p,feature){const kx=111320*Math.cos(p.lat*Math.PI/180),ky=111320;let best=Infinity;for(const ring of feature.rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],ax=(a[0]-p.lng)*kx,ay=(a[1]-p.lat)*ky,dx=(b[0]-a[0])*kx,dy=(b[1]-a[1])*ky,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));}return best;}
 function assess(p,data,now=Date.now()){
  if(!valid(p)||!Number.isFinite(p.acc)||p.acc>50)return{state:'gps',areas:[]};
  const layers=data?.layers||[],fresh=layers.length===2&&layers.every(l=>l.status==='ok'&&now-Date.parse(l.downloadedAt)<48*3600000&&now>=Date.parse(l.downloadedAt));
  const areas=[];for(const layer of layers)for(const f of layer.features||[])if(inside(p,f))areas.push({...f,layerId:layer.id,nearBoundary:boundary(p,f)<=Math.max(p.acc,30)});
  return{state:areas.length?'inside':fresh?'no_overlap':'unverified',areas,fresh};
 }
 return{valid,inRing,inside,boundary,assess};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createPugliaRestrictionEngine;
if(typeof document!=='undefined')(()=>{
 'use strict';const engine=createPugliaRestrictionEngine(),q=id=>document.getElementById(id),RAW='https://raw.githubusercontent.com/utty1985-beep/Unamano/main/cacciatraccia/data/';
 let api,map,layer,data=null,sources=null,lastFix=null,lastFixAt=0,busy=false,lastCheck=0,unavailable=false,drawTimer,alerted=new Map();
 const mode=()=>{try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode||'hunt'}catch{return'hunt'}};
 function text(el,value){if(el&&el.textContent!==value)el.textContent=value;}
 const date=value=>value?new Date(value).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'non disponibile';
 function panel(){
  if(q('pfcRestrictionPanel'))return;
  const box=document.createElement('div');box.id='pfcRestrictionPanel';box.className='card';box.dataset.pfcActivityOnly='hunt';
  box.innerHTML='<h3>🛡 Controllo aree · Puglia</h3><p id="pfcRestrictionStatus" role="status">Verifica non ancora disponibile</p><p id="pfcRestrictionUpdated" class="note"></p><label style="display:flex;gap:10px"><input id="pfcOfficialAreasVisible" type="checkbox" checked> Mostra aree protette e SIC/ZPS sulla mappa</label><p class="note">Rosso: aree protette. Ambra: SIC/ZPS, norme specifiche da verificare. Nessun colore non equivale a caccia consentita. Ordinanze locali e divieti temporanei possono non essere inclusi.</p><button id="pfcRestrictionsRefresh" type="button" class="secondary">Aggiorna controllo ufficiale</button><a class="secondary" href="https://pugliacon.regione.puglia.it/web/sit-puglia-sit/wms" target="_blank" rel="noopener">Fonte cartografica SIT Puglia</a><h3>📜 Aggiornamento fonti</h3><div id="pfcRegulationSourceStatus" role="status">Controllo in corso…</div>';
  (q('page-backup')||document.body).prepend(box);
  const badge=document.createElement('button');badge.id='pfcRestrictionBadge';badge.type='button';badge.textContent='🛡 Aree: verifica in corso';badge.style.cssText='position:absolute;left:10px;right:10px;bottom:12px;z-index:550;padding:9px 12px;border:1px solid #b5a36b;border-radius:12px;background:#fff7df;color:#4e3c10;font:600 12px/1.4 system-ui;text-align:left;white-space:normal';
  badge.onclick=()=>{q('pfc676Backup')?.click();box.scrollIntoView({behavior:'smooth',block:'start'});};q('map')?.parentElement.appendChild(badge);
  q('pfcRestrictionsRefresh').onclick=()=>refresh(true);q('pfcOfficialAreasVisible').onchange=draw;
 }
 async function json(name){let error;for(const url of [RAW+name+'?check='+Math.floor(Date.now()/300000),'./data/'+name])try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.region!=='Puglia')throw Error('region');return j;}catch(e){error=e;}throw error;}
 function sourceStatus(){
  const target=q('pfcRegulationSourceStatus');if(!target)return;
  target.replaceChildren();
  for(const s of sources?.sources||[]){const row=document.createElement('p'),a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=s.title;row.appendChild(a);
   const current=s.status==='ok'&&Date.now()-Date.parse(s.lastSuccessfulCheckAt)<48*3600000;let line=current?' · fonte controllata '+date(s.lastSuccessfulCheckAt):' · fonte non verificata di recente';
   if(s.changedAt)line+=' · contenuto modificato il '+date(s.changedAt)+': apri e verifica le novità';row.appendChild(document.createTextNode(line));target.appendChild(row);
  }
  if(!target.children.length)target.textContent='Verifica delle fonti non disponibile.';
  const note=document.createElement('p');note.className='note';note.textContent='Controllo automatico giornaliero delle fonti collegate. Una modifica rilevata non viene trasformata automaticamente in un nuovo divieto sulla mappa.';target.appendChild(note);
 }
 function status(){
  const badge=q('pfcRestrictionBadge');if(!badge)return;
  badge.hidden=mode()!=='hunt';
  if(mode()!=='hunt'){layer?.clearLayers();return;}
  let message='Verifica non disponibile · non indica assenza di divieti';
  const result=engine.assess(Date.now()-lastFixAt<=60000?lastFix:null,data);
  if(result.state==='gps')message='GPS assente o impreciso · verifica posizione sospesa';
  else if(result.areas.length){const uncertain=result.areas.some(a=>a.nearBoundary);message=(uncertain?'Vicino al confine di ':'Dentro ')+result.areas.map(a=>a.name).join(' · ')+(unavailable||!result.fresh?' · dati non verificati di recente':'');}
  else if(result.state==='no_overlap'&&!unavailable)message='Nessuna area protetta/SIC-ZPS rilevata qui · altri divieti non esclusi';
  text(badge,'🛡 '+message);text(q('pfcRestrictionStatus'),message);
  text(q('pfcRestrictionUpdated'),'Confini ufficiali scaricati: '+(data?.layers||[]).map(l=>date(l.downloadedAt)).join(' / '));
  badge.style.background=result.areas.some(a=>a.layerId===0)?'#ffe2df':'#fff7df';
  if(result.areas.length&&!document.hidden){const key=result.areas.map(a=>a.id).sort().join('|');if(!alerted.has(key)||Date.now()-alerted.get(key)>15*60000){alerted.set(key,Date.now());if(navigator.vibrate)navigator.vibrate([100,70,100]);window.dispatchEvent(new CustomEvent('pfc:official-area-warning',{detail:{areas:result.areas.map(a=>({name:a.name,layerId:a.layerId})),fresh:result.fresh}}));}}
 }
 function draw(){
  if(!layer||!data)return;layer.clearLayers();
  if(mode()!=='hunt'||q('pfcOfficialAreasVisible')?.checked===false)return;
  if(map.getZoom()<8)return;
  const b=map.getBounds();let count=0;
  for(const l of data.layers||[])for(const f of l.features||[]){const x=f.bbox;if(!x||x[2]<b.getWest()||x[0]>b.getEast()||x[3]<b.getSouth()||x[1]>b.getNorth())continue;if(++count>180)break;
   const polygon=window.L.polygon(f.rings.map(r=>r.map(p=>[p[1],p[0]])),{color:l.id===0?'#bd2727':'#b87908',weight:2,fillOpacity:l.id===0?.17:.12,fillRule:'evenodd'});
   const popup=document.createElement('div'),name=document.createElement('strong'),note=document.createElement('p');name.textContent=f.name;note.textContent=(l.id===0?'Area protetta ufficiale: verifica le norme dell’area.':'SIC/ZPS: verifica le prescrizioni specifiche; non è automaticamente un divieto totale di caccia.')+' Confini scaricati '+date(l.downloadedAt)+'.';popup.append(name,note);polygon.bindPopup(popup);polygon.addTo(layer);
  }
 }
 async function refresh(force=false){
  if(busy||!force&&Date.now()-lastCheck<5*60000)return;busy=true;lastCheck=Date.now();
  const button=q('pfcRestrictionsRefresh');if(button)button.disabled=true;
  const results=await Promise.allSettled([json('aree-protette-puglia.json'),json('normativa-puglia.json')]);
  unavailable=results[0].status!=='fulfilled';if(!unavailable)data=results[0].value;
  if(results[1].status==='fulfilled')sources=results[1].value;
  busy=false;if(button)button.disabled=false;sourceStatus();draw();status();
 }
 function boot(){if(api||!window.__PFC_LIVE_API__||!window.L)return;api=window.__PFC_LIVE_API__;map=api.map();if(!map){api=null;return;}panel();layer=window.L.layerGroup().addTo(map);map.on('moveend',()=>{clearTimeout(drawTimer);drawTimer=setTimeout(draw,250);});refresh(true);}
 window.addEventListener('pfc:position',e=>{const p=e.detail;if(!engine.valid(p))return;lastFixAt=Date.now();lastFix={lat:p.lat,lng:p.lng,acc:p.acc==null?NaN:Number(p.acc)};status();refresh();});
 window.addEventListener('pfc:activity-mode',()=>{draw();status();});
 setInterval(()=>{if(!document.hidden){status();refresh();}},60000);
 window.addEventListener('online',()=>refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('pfc:ready',boot);boot();
})();
