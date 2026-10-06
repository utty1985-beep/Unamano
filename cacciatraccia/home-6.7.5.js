// Passione Funghi e Caccia 6.7.5 - Home commerciale collegata alle funzioni reali
(function(){
  const q=id=>document.getElementById(id);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.body.classList.add('pfc675');

  function click(id){const e=q(id);if(e){e.click();return true}return false}
  function oldNav(page){const b=document.querySelector('body>nav button[data-page="'+page+'"]');if(b){b.click();return true}return false}
  function goMap(top=false){oldNav('map');setTimeout(()=>{window.dispatchEvent(new Event('resize'));(top?q('page-map'):q('map'))?.scrollIntoView({behavior:'smooth',block:top?'start':'center'})},90)}
  function getCfg(){try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}')}catch{return{}}}
  function syncMode(){const mushroom=getCfg().mode==='mushroom';q('pfc675Hunt')?.classList.toggle('active',!mushroom);q('pfc675Mush')?.classList.toggle('active',mushroom)}

  function buildHero(){
    const page=q('page-map');if(!page||q('pfc675Hero'))return;
    const hero=document.createElement('section');hero.id='pfc675Hero';hero.className='pfc675Hero';hero.innerHTML=
      '<div class="welcome"><h2>Benvenuto Mario</h2><p>Controlla meteo, punti salvati e condizioni del territorio.</p></div>'+
      '<div class="pfc675Mode"><button id="pfc675Hunt" type="button">🎯 Caccia</button><button id="pfc675Mush" type="button">🍄 Funghi</button></div>';
    page.prepend(hero);
    q('pfc675Hunt').onclick=()=>{if(!click('ctModeHunt')){const c=getCfg();c.mode='hunt';localStorage.setItem('pfc-v661-settings',JSON.stringify(c))}setTimeout(syncMode,80)};
    q('pfc675Mush').onclick=()=>{if(!click('ctModeMush')){const c=getCfg();c.mode='mushroom';localStorage.setItem('pfc-v661-settings',JSON.stringify(c))}setTimeout(syncMode,80)};
    syncMode();
  }

  function decorateMap(){
    const wrap=document.querySelector('.mapWrap'),search=document.querySelector('#page-map>.searchRow');
    if(wrap&&search&&!wrap.contains(search))wrap.prepend(search);
    const input=q('mapSearch');if(input)input.placeholder='Cerca città, paese o contrada';
    if(wrap&&!q('pfc675OpenMap')){const b=document.createElement('button');b.id='pfc675OpenMap';b.className='pfc675OpenMap';b.type='button';b.textContent='🗺 Apri mappa ›';b.onclick=()=>goMap(false);wrap.appendChild(b)}
  }

  function findCardById(id){return q(id)?.closest('.card')||null}
  function decorateCards(){
    const weather=findCardById('weatherBody');if(weather){weather.classList.add('homeWeatherCard');const h=weather.querySelector('h2');if(h)h.textContent='🌤 Meteo attuale'}
    const car=findCardById('carStatus');if(car)car.classList.add('homeCarDetail');
    const points=findCardById('pointsList');if(points){points.classList.add('homePointsCard');const h=points.querySelector('h2');if(h)h.textContent='📍 I tuoi appostamenti'}
    if(weather&&!q('pfc675Quick')){
      const title=document.createElement('div');title.className='pfc675QuickTitle';title.textContent='Azioni rapide';
      const box=document.createElement('div');box.id='pfc675Quick';box.className='pfc675Quick';box.innerHTML=
        '<button id="pfc675Save"><b>📍</b><span>Segna punto</span><small>Salva la posizione scelta</small></button>'+
        '<button id="pfc675Conditions"><b>🌦</b><span>Verifica condizioni</span><small>Meteo e territorio</small></button>'+
        '<button id="pfc675Radar"><b>🎯</b><span>Radar</span><small>Punti e direzione</small></button>'+
        '<button id="pfc675Track"><b>🥾</b><span>Camminata</span><small>Registra percorso</small></button>';
      weather.insertAdjacentElement('afterend',box);weather.insertAdjacentElement('afterend',title);
      q('pfc675Save').onclick=()=>{goMap(false);setTimeout(()=>{if(!q('selectedCard')?.classList.contains('hidden'))click('savePointBtn');else if(!click('quickSaveHereBtn'))click('locateBtn')},140)};
      q('pfc675Conditions').onclick=()=>{if(!click('ctCompareMainBtn')&&!click('ctConditionBtn')){goMap(false);setTimeout(()=>click('ctCompareMainBtn')||click('ctConditionBtn'),500)}};
      q('pfc675Radar').onclick=()=>{if(!click('ctRadarBtn')){goMap(false);setTimeout(()=>click('ctRadarBtn'),700)}};
      q('pfc675Track').onclick=()=>oldNav('track');
    }
    if(points&&!q('pfc675Return')){
      const r=document.createElement('button');r.id='pfc675Return';r.className='pfc675Return';r.type='button';r.innerHTML='<span class="car">🚗</span><span class="copy"><strong>Ritorna alla macchina</strong><span>Segui il percorso per tornare alla tua auto</span></span><span class="arrow">›</span>';r.onclick=()=>{if(!click('returnCarBtn'))click('quickCarBtn')};points.insertAdjacentElement('afterend',r);
      const adv=document.createElement('div');adv.className='pfc675Advanced';adv.innerHTML='<button id="pfc675Territory">🧭 Regione / ATC</button><button id="pfc675Protected">🛡 Aree protette</button><button id="pfc675Calendar">📅 Calendario</button><button id="pfc675Backup">💾 Dati / backup</button>';r.insertAdjacentElement('afterend',adv);
      q('pfc675Territory').onclick=()=>{const c=q('ct661Card');if(c){c.classList.toggle('pfc675AdvancedOpen');c.scrollIntoView({behavior:'smooth',block:'center'})}};
      q('pfc675Protected').onclick=()=>{if(!click('ctProtectedBtn')){q('ct661Card')?.classList.add('pfc675AdvancedOpen');setTimeout(()=>click('ctProtectedBtn'),200)}};
      q('pfc675Calendar').onclick=()=>{const c=q('ctCalendarCard');if(c){c.classList.toggle('pfc675AdvancedOpen');c.scrollIntoView({behavior:'smooth',block:'center'})}};
      q('pfc675Backup').onclick=()=>click('backupQuickBtn');
    }
  }

  function buildNav(){
    if(q('pfc675Nav'))return;
    const nav=document.createElement('div');nav.id='pfc675Nav';nav.className='pfc675CommercialNav';nav.innerHTML=
      '<button id="pfc675NavHome" class="active"><b>🏠</b>Home</button>'+
      '<button id="pfc675NavMap"><b>🗺</b>Mappa</button>'+
      '<button id="pfc675NavRadar"><b>🎯</b>Radar</button>'+
      '<button id="pfc675NavSight"><b>🔭</b>Avvistamenti</button>'+
      '<button id="pfc675NavMore"><b>☰</b>Altro</button>';
    document.body.appendChild(nav);
    const active=id=>{nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.id===id))};
    q('pfc675NavHome').onclick=()=>{active('pfc675NavHome');oldNav('map');setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60)};
    q('pfc675NavMap').onclick=()=>{active('pfc675NavMap');goMap(false)};
    q('pfc675NavRadar').onclick=()=>{active('pfc675NavRadar');if(!click('ctRadarBtn')){goMap(false);setTimeout(()=>click('ctRadarBtn'),700)}};
    q('pfc675NavSight').onclick=()=>{active('pfc675NavSight');oldNav('diary');setTimeout(()=>document.querySelector('[data-history="sightings"]')?.click(),120)};
    q('pfc675NavMore').onclick=()=>{active('pfc675NavMore');if(!click('backupQuickBtn'))oldNav('diary')};
  }

  function header(){
    const logo=document.querySelector('.topbar .logo');if(logo)logo.textContent='🦌🍄';
    const h=document.querySelector('.topbar .brand h1');if(h)h.textContent='Passione Funghi e Caccia';
    const s=document.querySelector('.topbar .brand small');if(s)s.textContent='Mappa • meteo • appostamenti • radar';
  }

  function health(){
    const ids=['map','locateBtn','followBtn','quickSaveHereBtn','savePointBtn','returnCarBtn','startTrackBtn','ctModeHunt','ctModeMush','ctCompareMainBtn','ctProtectedBtn','ctRadarBtn'];
    const missing=ids.filter(id=>!q(id));
    let b=q('pfc675Status');if(!b){b=document.createElement('div');b.id='pfc675Status';b.className='pfc675StatusDot';document.body.appendChild(b)}
    b.textContent=missing.length?'⚠ '+missing.length+' funzioni in caricamento':'✓ Funzioni collegate';
    b.style.background=missing.length?'#9a6a1e':'#1c5f36';
    window.__PFC675_HEALTH__={version:'6.7.5',missing,checkedAt:new Date().toISOString()};
    if(!missing.length)setTimeout(()=>b.remove(),3200);
  }

  async function boot(){
    header();buildHero();decorateMap();buildNav();
    for(let i=0;i<35;i++){decorateCards();syncMode();if(q('ctRadarBtn')&&q('pointsList'))break;await sleep(180)}
    decorateCards();health();
    const mo=new MutationObserver(()=>{decorateCards();syncMode()});mo.observe(q('page-map')||document.body,{childList:true,subtree:true});
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw-6.7.5.js?v=6.7.5').catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();