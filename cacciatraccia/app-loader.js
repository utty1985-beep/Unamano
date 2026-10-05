const requestedVersion=new URLSearchParams(location.search).get('v')||'';
const experimental=requestedVersion==='6611';
const assetVersion=experimental?'6.6.4-test4':'6.5.2-r5';
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
  if(pill)pill.textContent=experimental?'● tester: avvio base stabile…':'● stabile 6.5.2…';

  // Prima avvia SEMPRE la base stabile: la mappa diventa utilizzabile subito.
  const coreSrc=await loadGroup(core,'base',6);
  new Function(coreSrc)();

  if(!experimental){
    if(pill)pill.textContent='● stabile 6.5.2 pronta';
  }else{
    if(pill)pill.textContent='● base pronta · carico funzioni tester…';

    // Le funzioni tester vengono aggiunte solo dopo il primo disegno della mappa.
    runLater(async()=>{
      try{
        const extraSrc=await loadGroup(enhancements,'funzioni tester',4);
        new Function(extraSrc)();
        if(pill)pill.textContent='● tester pronta · attivo radar…';

        // Radar 6.6.4 separato: non può più rallentare o bloccare l'avvio iniziale.
        runLater(async()=>{
          try{
            const radarSrc=await fetchPart(radar);
            new Function(radarSrc)();
            if(pill)pill.textContent='● tester 6.6.4 pronta';
          }catch(e){
            console.warn('Radar tester non caricato',e);
            if(pill)pill.textContent='● tester pronta · radar da ricaricare';
          }
        },350);
      }catch(e){
        console.warn('Funzioni tester non caricate',e);
        if(pill)pill.textContent='● base stabile attiva · extra non caricati';
      }
    },220);
  }
}catch(e){
  bootError(e?.name==='AbortError'?'rete lenta durante avvio':(e?.message||e));
}
