(function(){
const byId=id=>document.getElementById(id);
const norm=s=>String(s||'').trim().toLowerCase();
const demoTemplates=[
  {icon:'👶',category:'Babysitter',title:'Cerco babysitter per qualche ora',description:'Esempio di richiesta: supporto occasionale per alcune ore, orario da concordare.'},
  {icon:'📚',category:'Ripetizioni',title:'Cerco aiuto doposcuola per compiti',description:'Esempio di richiesta: una mano con i compiti e il ripasso scolastico nel pomeriggio.'},
  {icon:'🌱',category:'Giardinaggio',title:'Mi serve una mano in giardino',description:'Esempio di richiesta: piccolo aiuto per sistemare piante e spazio esterno.'},
  {icon:'🛒',category:'Spesa / commissioni',title:'Cerco aiuto per una commissione',description:'Esempio di richiesta: una piccola commissione o spesa nella zona.'},
  {icon:'🔧',category:'Piccoli lavori',title:'Aiuto per un piccolo lavoro in casa',description:'Esempio di richiesta: montaggio o sistemazione semplice, da concordare.'}
];

function demoCard(d,city){
  const place=city||'la tua città';
  return `<article class="card job" style="border-style:dashed;opacity:.96"><div class="jobtop"><div><div class="meta">${d.icon} ${d.category} · 📍 ${place}</div><h3>${d.title}</h3></div><span class="status" style="background:#eef3f1;color:#52635e">ESEMPIO</span></div><p>${d.description}</p><div class="notice info" style="margin-top:10px"><b>Richiesta dimostrativa.</b> Serve solo a mostrarti come funziona UnaMano e non accetta candidature.</div></article>`;
}

function emptyBoardHtml(city){
  const where=city?` a ${city}`:'';
  return `<div class="card" style="border:1px solid #b9ddcf;background:#f6fcf9"><h3 style="margin-top:0">🌱 UnaMano sta partendo${where}</h3><p style="margin-bottom:8px">Non ci sono ancora richieste reali${where}. Qui sotto trovi alcuni <b>esempi</b> di ciò che potrà comparire nella bacheca.</p><div class="actions"><button class="btn p" onclick="need(()=>go('new'))">Pubblica la prima richiesta reale</button><button class="btn g" onclick="if(typeof clearFilters==='function')clearFilters()">Guarda tutte le città</button></div></div>`+demoTemplates.map(d=>demoCard(d,city)).join('');
}

function install(){
  if(typeof window.renderJobs!=='function'||window.renderJobs.__emptyDemoPatched)return false;
  const original=window.renderJobs;
  const wrapped=function(){
    const r=original.apply(this,arguments);
    try{
      const city=(byId('cityFilter')?.value||'').trim();
      const category=byId('cat')?.value||'';
      const query=(byId('search')?.value||'').trim();
      const open=(typeof jobs!=='undefined'?jobs:[]).filter(j=>j.status==='open');
      const cityOpen=city?open.filter(j=>norm(j.city)===norm(city)):open;
      const shouldDemo=(city?cityOpen.length===0:open.length===0)&&!category&&!query;
      if(shouldDemo){
        const box=byId('jobs');
        if(box)box.innerHTML=emptyBoardHtml(city);
        const count=byId('count');
        if(count)count.textContent='';
      }
    }catch(e){}
    return r;
  };
  wrapped.__emptyDemoPatched=true;
  window.renderJobs=wrapped;
  try{window.renderJobs()}catch(e){}
  return true;
}

window.addEventListener('load',()=>{
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},250);
});
})();
