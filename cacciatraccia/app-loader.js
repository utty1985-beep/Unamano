const parts=['./direct/part00.txt','./direct/part01.txt','./direct/part02.txt','./direct/part03.txt'];
function bootError(m){console.error(m);const map=document.getElementById('map');if(map)map.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore avvio: ${String(m)}</div>`}
try{
  const texts=[];
  for(const p of parts){const r=await fetch(new URL(p,location.href),{cache:'no-store'});if(!r.ok)throw new Error(`${p}: ${r.status}`);texts.push(await r.text())}
  const src=texts.join('');
  new Function(src)();
}catch(e){bootError(e?.message||e)}
