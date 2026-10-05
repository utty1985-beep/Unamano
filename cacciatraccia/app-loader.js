const parts=[...Array(25)].map((_,i)=>`./v6/part${String(i).padStart(2,'0')}.txt?v=6.4.9`);
parts.push('./v6/part27.txt?v=6.4.9');
parts.push('./v6/part28.txt?v=6.4.9');
parts.push('./v6/part29.txt?v=6.4.9');
parts.push('./v6/part30.txt?v=6.4.9');
parts.push('./v6/part31.txt?v=6.4.9');
parts.push('./v6/part32.txt?v=6.4.9');
parts.push('./v6/part33.txt?v=6.4.9');
function bootError(m){console.error(m);const map=document.getElementById('map');if(map)map.innerHTML=`<div style="padding:22px;color:#8b1e16;font-weight:700">Errore avvio: ${String(m)}</div>`}
try{
  const texts=[];
  for(const p of parts){const r=await fetch(new URL(p,location.href),{cache:'no-store'});if(!r.ok)throw new Error(`${p}: ${r.status}`);texts.push(await r.text())}
  const src=texts.join('');
  new Function(src)();
}catch(e){bootError(e?.message||e)}
