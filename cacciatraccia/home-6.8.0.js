// Passione Funghi e Caccia 6.7.6 - Home commerciale collegata alle funzioni reali
(function(){
  const q=id=>document.getElementById(id);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.body.classList.add('pfc676');

  function click(id){const e=q(id);if(e){e.click();return true}const t=q('toast');if(t){t.textContent=window.__PFC_APP_STATUS__?.state==='error'?'Avvio incompleto: ricarica l’app':'Attendi il caricamento delle funzioni';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}return false}
  function oldNav(page){const b=document.querySelector('body>nav button[data-page="'+page+'"]');if(b){b.click();return true}return false}
  function goMap(top=false){oldNav('map');setTimeout(()=>{window.dispatchEvent(new Event('resize'));(top?q('page-map'):q('map'))?.scrollIntoView({behavior:'smooth',block:top?'start':'center'})},90)}
  function getCfg(){try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}')}catch{return{}}}
  function syncMode(){const mushroom=getCfg().mode==='mushroom';q('pfc676Calendar')?.toggleAttribute('hidden',mushroom);q('pfc678Mushroom')?.toggleAttribute('hidden',!mushroom);q('pfc678Species')?.toggleAttribute('hidden',!mushroom);q('pfc678Sighting')?.toggleAttribute('hidden',mushroom);q('pfc676Hunt')?.classList.toggle('active',!mushroom);q('pfc676Mush')?.classList.toggle('active',mushroom)}

  function buildHero(){
    const page=q('page-map');if(!page||q('pfc676Hero'))return;
    const hero=document.createElement('section');hero.id='pfc676Hero';hero.className='pfc676Hero';hero.innerHTML=
      '<svg class="pfc679Landscape" viewBox="0 0 800 220" preserveAspectRatio="none" aria-hidden="true"><circle cx="690" cy="42" r="25" fill="#f7d495" opacity=".75"/><path d="M0 165L100 88L178 140L280 58L390 147L490 90L620 150L730 86L800 127V220H0Z" fill="#658771"/><path d="M0 186Q160 125 320 183T620 166T800 184V220H0Z" fill="#34614b"/><path d="M0 205Q170 166 350 205T800 192V220H0Z" fill="#1a3e2e"/><g fill="#173c2b"><path d="M48 164l23-46 23 46h-13l21 33H40l21-33zM590 151l26-55 26 55h-15l23 38h-68l23-38zM706 165l22-48 22 48h-13l21 32h-60l21-32z"/><path d="M65 190h12v30H65M610 179h12v41h-12M722 190h11v30h-11"/></g><g transform="translate(150 -108)" stroke="#ecddad" stroke-width="3" fill="none" opacity=".85"><path d="M446 200v-20m-7 20v-12m-8-8q13-22 29 0zM453 197v-11m-5 0q7-13 16 0z"/><path d="M501 199l4-24 17-2 7 13-4 14m-20-23-9-12-1-11m1 11-8-4m8 4 7-7m19 15 8-13 1-10m-1 10 8-5m-8 5-7-7M501 184h24"/></g><path d="M370 220q-45-19 12-34t-5-28" stroke="#c9b987" stroke-width="4" fill="none" opacity=".5"/></svg><div class="welcome"><h2>Benvenuto Mario</h2><p>Controlla meteo, punti salvati e condizioni del territorio.</p></div>'+
      '<div class="pfc676Mode"><button id="pfc676Hunt" type="button">🎯 Caccia</button><button id="pfc676Mush" type="button">🍄 Funghi</button></div>';
    page.prepend(hero);
    q('pfc676Hunt').onclick=()=>{if(!click('ctModeHunt')){const c=getCfg();c.mode='hunt';localStorage.setItem('pfc-v661-settings',JSON.stringify(c))}setTimeout(syncMode,80)};
    q('pfc676Mush').onclick=()=>{if(!click('ctModeMush')){const c=getCfg();c.mode='mushroom';localStorage.setItem('pfc-v661-settings',JSON.stringify(c))}setTimeout(syncMode,80)};
    syncMode();
  }

  function decorateMap(){
    const wrap=document.querySelector('.mapWrap'),search=document.querySelector('#page-map>.searchRow');
    if(wrap&&search&&!wrap.contains(search))wrap.prepend(search);
    const input=q('mapSearch');if(input)input.placeholder='Cerca città, paese o contrada';
    if(wrap&&!q('pfc676OpenMap')){const b=document.createElement('button');b.id='pfc676OpenMap';b.className='pfc676OpenMap';b.type='button';b.textContent='🗺 Apri mappa ›';b.onclick=()=>goMap(false);wrap.appendChild(b)}
  }

  function findCardById(id){return q(id)?.closest('.card')||null}
  function ensureAppostamentiPage(){
    let page=q('page-appostamenti');
    if(page)return page;
    const main=document.querySelector('main');if(!main)return null;
    page=document.createElement('section');page.id='page-appostamenti';page.className='page pfc676AppostamentiPage';
    page.innerHTML='<div class="pfc676PageHead"><button id="pfc676BackHome" type="button">‹ Home</button><div><h2>📍 Appostamenti</h2><p>I tuoi punti salvati, con giorno di caccia, meteo e comandi di gestione.</p></div></div>';
    main.appendChild(page);
    q('pfc676BackHome').onclick=()=>{q('pfc676NavHome')?.click()};
    return page;
  }
  function showAppostamenti(){
    const page=ensureAppostamentiPage();if(!page)return;
    document.querySelectorAll('main>.page').forEach(p=>p.classList.remove('active'));
    page.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function decorateCards(){
    const weather=findCardById('weatherBody');if(weather){weather.classList.add('homeWeatherCard');const h=weather.querySelector('h2');if(h&&h.textContent!=='🌤 Meteo attuale')h.textContent='🌤 Meteo attuale'}
    const settings=q('ctWeatherSettings');
    if(settings&&!settings.parentElement.classList.contains('pfcWeatherSettings')){
      const d=document.createElement('details');d.className='pfcWeatherSettings';
      const s=document.createElement('summary');s.textContent='Impostazioni meteo';d.appendChild(s);
      settings.before(d);d.appendChild(settings);
    }
    const car=findCardById('carStatus');if(car){
      car.classList.add('homeCarDetail');
      if(!car.parentElement.classList.contains('pfcParkingSettings')){
        const d=document.createElement('details');d.className='pfcParkingSettings';
        const s=document.createElement('summary');s.textContent='🚗 Segna o sposta la macchina';d.appendChild(s);car.before(d);d.appendChild(car);
      }
    }
    const points=findCardById('pointsList');if(points){
      points.classList.add('homePointsCard');const h=points.querySelector('h2');if(h&&h.textContent!=='📍 I tuoi appostamenti')h.textContent='📍 I tuoi appostamenti';
      const appPage=ensureAppostamentiPage();if(appPage&&points.parentElement!==appPage)appPage.appendChild(points);
      const fit=q('fitPointsBtn');if(fit&&!fit.dataset.pfc676Bound){fit.dataset.pfc676Bound='1';fit.addEventListener('click',()=>setTimeout(()=>q('pfc676NavMap')?.click(),70));}
    }
    if(weather&&!q('pfc676Quick')){
      const title=document.createElement('div');title.id='pfcQuickTitle';title.className='pfc676QuickTitle';title.textContent='Azioni rapide';
      const box=document.createElement('div');box.id='pfc676Quick';box.className='pfc676Quick';box.innerHTML=
        '<button id="pfc676Save"><b>📍</b><span>Segna punto</span><small>Salva la posizione scelta</small></button>'+
        '<button id="pfc676Conditions"><b>🌦</b><span>Verifica condizioni</span><small>Meteo e territorio</small></button>'+
        '<button id="pfc676Radar"><b>🎯</b><span>Radar</span><small>Punti e direzione</small></button>'+
        '<button id="pfc676Track"><b>🥾</b><span>Camminata</span><small>Registra percorso</small></button>';
      box.insertAdjacentHTML('beforeend','<button id="pfc678Mushroom" hidden><b>🍄</b><span>Funghi trovati</span><small>Segna il ritrovamento</small></button><button id="pfc678Species" hidden><b>🔎</b><span>Vedi specie</span><small>Foto e descrizione</small></button><button id="pfc678Sighting"><b>🕊️</b><span>Avvistamento</span><small>Uccelli e note</small></button>');
      weather.insertAdjacentElement('afterend',box);q('pfc678Mushroom').onclick=()=>click('quickMushroomBtn');q('pfc678Species').onclick=()=>click('quickSpeciesBtn');q('pfc678Sighting').onclick=()=>click('quickSightingBtn');weather.insertAdjacentElement('afterend',title);
      q('pfc676Save').onclick=()=>{goMap(false);setTimeout(()=>{if(!q('selectedCard')?.classList.contains('hidden'))click('savePointBtn');else if(!click('quickSaveHereBtn'))click('locateBtn')},140)};
      q('pfc676Conditions').onclick=()=>{if(!click('ctCompareMainBtn')&&!click('ctConditionBtn')){goMap(false);setTimeout(()=>click('ctCompareMainBtn')||click('ctConditionBtn'),500)}};
      q('pfc676Radar').onclick=()=>{if(!click('ctRadarBtn')){goMap(false);setTimeout(()=>click('ctRadarBtn'),700)}};
      q('pfc676Track').onclick=()=>oldNav('track');
    }
    if(points&&!q('pfc676Return')){
      const r=document.createElement('button');r.id='pfc676Return';r.className='pfc676Return';r.type='button';r.innerHTML='<span class="car">🚗</span><span class="copy"><strong>Ritorna alla macchina</strong><span>Segui il percorso per tornare alla tua auto</span></span><span class="arrow">›</span>';r.onclick=()=>{if(!click('returnCarBtn'))click('quickCarBtn')};(q('pfc676Quick')||weather||q('pfc676Hero')).insertAdjacentElement('afterend',r);
      const adv=document.createElement('div');adv.className='pfc676Advanced';adv.innerHTML='<button id="pfc676Territory">🧭 Regione / ATC</button><button id="pfc676Protected">🛡 Aree protette</button><button id="pfc676Calendar">📅 Calendario</button><button id="pfc676Backup">💾 Dati / backup</button>';r.insertAdjacentElement('afterend',adv);
      q('pfc676Territory').onclick=()=>{const c=q('ct661Card');if(c){c.classList.toggle('pfc676AdvancedOpen');c.scrollIntoView({behavior:'smooth',block:'center'})}};
      q('pfc676Protected').onclick=()=>{if(!click('ctProtectedBtn')){q('ct661Card')?.classList.add('pfc676AdvancedOpen');setTimeout(()=>click('ctProtectedBtn'),200)}};
      q('pfc676Calendar').onclick=()=>{const c=q('ctCalendarCard');if(c){c.classList.toggle('pfc676AdvancedOpen');c.scrollIntoView({behavior:'smooth',block:'center'})}};
      q('pfc676Backup').onclick=()=>click('backupQuickBtn');
    }
  }


  function orderHome(){
    const page=q('page-map');if(!page)return;
    const desired=[q('pfc676Hero'),page.querySelector('.mapWrap'),q('selectedCard'),q('pfcQuickTitle'),q('pfc676Quick'),q('pfc676Return'),page.querySelector('.pfcParkingSettings'),page.querySelector('.pfc676Advanced'),page.querySelector('.homeWeatherCard')].filter(e=>e&&e.parentElement===page);
    const children=Array.from(page.children);if(desired.some((e,i)=>i&&children.indexOf(e)<children.indexOf(desired[i-1])))desired.forEach(e=>page.appendChild(e));
  }

  function buildNav(){
    if(q('pfc676Nav'))return;
    const nav=document.createElement('div');nav.id='pfc676Nav';nav.className='pfc676CommercialNav';nav.innerHTML=
      '<button id="pfc676NavHome" class="active"><b>🏠</b>Home</button>'+
      '<button id="pfc676NavMap"><b>🗺</b>Mappa</button>'+
      '<button id="pfc676NavRadar"><b>🎯</b>Radar</button>'+
      '<button id="pfc676NavPosts"><b>📍</b>Appostamenti</button>'+
      '<button id="pfc676NavSight"><b>🔭</b>Avvistamenti</button>'+
      '<button id="pfc676NavMore"><b>☰</b>Altro</button>';
    document.body.appendChild(nav);
    const active=id=>{nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.id===id))};
    q('pfc676NavHome').onclick=()=>{active('pfc676NavHome');oldNav('map');setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60)};
    q('pfc676NavMap').onclick=()=>{active('pfc676NavMap');goMap(false)};
    q('pfc676NavRadar').onclick=()=>{active('pfc676NavRadar');if(!click('ctRadarBtn')){goMap(false);setTimeout(()=>click('ctRadarBtn'),700)}};
    q('pfc676NavPosts').onclick=()=>{active('pfc676NavPosts');showAppostamenti()};
    q('pfc676NavSight').onclick=()=>{active('pfc676NavSight');oldNav('diary');setTimeout(()=>document.querySelector('[data-history="sightings"]')?.click(),120)};
    q('pfc676NavMore').onclick=()=>{active('pfc676NavMore');if(!click('backupQuickBtn'))oldNav('diary')};
  }

  function header(){
    const logo=document.querySelector('.topbar .logo');if(logo)logo.innerHTML='<span class="pfc679Emblem" aria-hidden="true">🦌<span>🍄</span></span>';
    const h=document.querySelector('.topbar .brand h1');if(h)h.textContent='Passione Funghi e Caccia';
    const s=document.querySelector('.topbar .brand small');if(s)s.textContent='Mappa • meteo • appostamenti • radar';
  }

  function health(){
    const ids=['map','locateBtn','followBtn','quickSaveHereBtn','savePointBtn','returnCarBtn','startTrackBtn','ctModeHunt','ctModeMush','ctCompareMainBtn','ctProtectedBtn','ctRadarBtn'];
    const missing=ids.filter(id=>!q(id));
    let b=q('pfc676Status');if(!b){b=document.createElement('div');b.id='pfc676Status';b.className='pfc676StatusDot';document.body.appendChild(b)}
    const label=missing.length?(window.__PFC_APP_STATUS__?.error?'⚠ Alcune funzioni non disponibili':'⚠ '+missing.length+' funzioni in caricamento'):'✓ Funzioni collegate';if(b.textContent!==label)b.textContent=label;
    b.style.background=missing.length?'#9a6a1e':'#1c5f36';
    window.__PFC676_HEALTH__={version:'6.8.0',missing,checkedAt:new Date().toISOString()};
    if(!missing.length&&!b.dataset.dismiss){b.dataset.dismiss='1';setTimeout(()=>b.remove(),3200);}
  }

  async function boot(){
    header();buildHero();decorateMap();buildNav();
    for(let i=0;i<35;i++){decorateCards();orderHome();syncMode();if(q('ctRadarBtn')&&q('pointsList'))break;await sleep(180)}
    decorateCards();orderHome();health();
    let healthTimer;window.addEventListener('pfc:ready',()=>{decorateCards();orderHome();syncMode();health()});const mo=new MutationObserver(()=>{decorateCards();orderHome();syncMode();clearTimeout(healthTimer);if(q('pfc676Status'))healthTimer=setTimeout(health,350)});mo.observe(q('page-map')||document.body,{childList:true,subtree:true});
    
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();