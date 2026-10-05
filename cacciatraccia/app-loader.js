const core=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.6.3`);
const fixes=[27,28,29,30,32,33,34].map(i=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.6.3`);
const parts=[...core,...fixes];
function bootError(m){console.error(m);const map=document.getElementById('map');if(map)map.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore avvio: ${String(m)}</div>`}
try{
  const texts=[];
  for(const p of parts){const r=await fetch(new URL(p,location.href),{cache:'no-store'});if(!r.ok)throw new Error(`${p}: ${r.status}`);texts.push(await r.text())}
  const src=texts.join('');
  new Function(src)();
}catch(e){bootError(e?.message||e)}
