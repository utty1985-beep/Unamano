const requestedVersion=new URLSearchParams(location.search).get('v')||'';
const stable6502=requestedVersion==='6502';
const assetVersion=stable6502?'6.5.2-r4':'6.6.9';
const core=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const fixes=stable6502?[]:[27,28,29,30,32,33,34,35,36].map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=${assetVersion}`);
const parts=[...core,...fixes];
function bootError(m){console.error(m);const pill=document.getElementById('netPill');if(pill)pill.textContent='● errore avvio';const map=document.getElementById('map');if(map)map.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore avvio: ${String(m)}</div>`}
try{
  const pill=document.getElementById('netPill');
  if(pill)pill.textContent='● avvio…';
  const fetchPart=async p=>{
    const ac=new AbortController();
    const tm=setTimeout(()=>ac.abort(),12000);
    try{
      const r=await fetch(new URL(p,location.href),{cache:'no-store',signal:ac.signal});
      if(!r.ok)throw new Error(`${p}: ${r.status}`);
      return await r.text();
    } finally { clearTimeout(tm); }
  };
  const texts=[];
  const BATCH=6;
  for(let i=0;i<parts.length;i+=BATCH){
    const batch=parts.slice(i,i+BATCH);
    const got=await Promise.all(batch.map(fetchPart));
    texts.push(...got);
    if(pill)pill.textContent=`● avvio ${Math.min(i+BATCH,parts.length)}/${parts.length}`;
  }
  const src=texts.join('');
  new Function(src)();
}catch(e){bootError(e?.name==='AbortError'?'rete lenta durante avvio':(e?.message||e))}
