// Passione Funghi e Caccia 6.7.6 - Home commerciale collegata alle funzioni reali
(function(){
  const q=id=>document.getElementById(id);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.body.classList.add('pfc676');

  function click(id){const e=q(id);if(e){e.click();return true}const t=q('toast');if(t){t.textContent=window.__PFC_APP_STATUS__?.state==='error'?'Avvio incompleto: ricarica l’app':'Attendi il caricamento delle funzioni';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}return false}
  function oldNav(page){const b=document.querySelector('body>nav button[data-page="'+page+'"]');if(b){b.click();return true}return false}
  function goMap(top=false){oldNav('map');setTimeout(()=>{window.dispatchEvent(new Event('resize'));(top?q('page-map'):q('map'))?.scrollIntoView({behavior:'smooth',block:top?'start':'center'})},90)}
  function getCfg(){try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}')}catch{return{}}}
  function syncMode(){const mushroom=getCfg().mode==='mushroom';q('pfc676Calendar')?.toggleAttribute('hidden',mushroom);q('pfc678Mushroom')?.toggleAttribute('hidden',!mushroom);q('pfc678Species')?.toggleAttribute('hidden',!mushroom);q('pfc678Sighting')?.toggleAttribute('hidden',mushroom);q('pfc676Conditions')?.toggleAttribute('hidden',mushroom);q('pfc683AppostamentiConditions')?.toggleAttribute('hidden',mushroom);q('pfc676Hunt')?.classList.toggle('active',!mushroom);q('pfc676Mush')?.classList.toggle('active',mushroom);q('pfc676Hunt')?.setAttribute('aria-pressed',String(!mushroom));q('pfc676Mush')?.setAttribute('aria-pressed',String(mushroom));const box=q('pfc676Quick');if(box){const ids=mushroom?['pfc678Mushroom','pfc678Species','pfc676Radar','pfc676Track','pfc676Save','pfc676Conditions','pfc678Sighting']:['pfc676Save','pfc676Conditions','pfc678Sighting','pfc676Radar','pfc676Track','pfc678Mushroom','pfc678Species'];const wanted=ids.map(q).filter(Boolean);if(wanted.some((e,i)=>box.children[i]!==e))wanted.forEach(e=>box.appendChild(e))}}

  function openConditionComparison(){
    try{
      if(typeof window.__PFC_OPEN_CONDITION_CHECK__==='function'){window.__PFC_OPEN_CONDITION_CHECK__();return true}
      const direct=q('ctConditionBtn');if(direct){direct.click();return true}
      const main=q('ctCompareMainBtn');if(main){main.click();return true}
      goMap(false);
      setTimeout(()=>{if(typeof window.__PFC_OPEN_CONDITION_CHECK__==='function')window.__PFC_OPEN_CONDITION_CHECK__();else if(!click('ctConditionBtn'))click('ctCompareMainBtn')},450);
      return false;
    }catch(e){console.warn('Verifica condizioni',e);return false}
  }

  function ensureAppostamentiConditionButton(page){
    if(!page||q('pfc683AppostamentiConditions'))return;
    const head=page.querySelector('.pfc676PageHead');
    if(!head)return;
    const b=document.createElement('button');
    b.id='pfc683AppostamentiConditions';
    b.type='button';
    b.innerHTML='<b>🌦 Verifica se il meteo è simile</b><small>Confronta vento, raffiche e pioggia con le condizioni salvate</small>';
    b.style.cssText='width:100%;margin:0 0 14px;border:0;border-radius:16px;padding:14px 12px;background:linear-gradient(145deg,#2f7e45,#1f6034);color:#fff;font-weight:900;box-shadow:0 5px 16px #0002;text-align:left';
    b.querySelector('small').style.cssText='display:block;margin-top:4px;font-size:11px;opacity:.9;font-weight:700';
    b.onclick=openConditionComparison;
    head.insertAdjacentElement('afterend',b);
    syncMode();
  }

  function buildHero(){
    const page=q('page-map');if(!page||q('pfc676Hero'))return;
    const hero=document.createElement('section');hero.id='pfc676Hero';hero.className='pfc676Hero';hero.innerHTML=
      '<img class="pfc681Scene" src="assets/bosco-cervo-porcini-6.8.1.webp" alt="Cervo nel bosco e porcini sul muschio" fetchpriority="high" decoding="async"><div class="welcome"><h2>La tua prossima uscita</h2><p>Scegli Caccia o Funghi e prepara la tua uscita.</p></div>'+
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
    if(page){ensureAppostamentiConditionButton(page);return page;}
    const main=document.querySelector('main');if(!main)return null;
    page=document.createElement('section');page.id='page-appostamenti';page.className='page pfc676AppostamentiPage';
    page.innerHTML='<div class="pfc676PageHead"><button id="pfc676BackHome" type="button">‹ Home</button><div><h2>📍 Appostamenti</h2><p>I tuoi punti salvati, con giorno di caccia, meteo e comandi di gestione.</p></div></div>';
    main.appendChild(page);
    ensureAppostamentiConditionButton(page);
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
      points.classList.add('homePointsCard');const h=points.querySelector('h2');const title=getCfg().mode==='mushroom'?'🍄 I tuoi funghi':'📍 I tuoi appostamenti';if(h&&h.textContent!==title)h.textContent=title;
      const appPage=ensureAppostamentiPage();if(appPage&&points.parentElement!==appPage)appPage.appendChild(points);
      const fit=q('fitPointsBtn');if(fit&&!fit.dataset.pfc676Bound){fit.dataset.pfc676Bound='1';fit.addEventListener('click',()=>setTimeout(()=>q('pfc676NavMap')?.click(),70));}
    }
    if(weather&&!q('pfc676Quick')){
      const title=document.createElement('div');title.id='pfcQuickTitle';title.className='pfc676QuickTitle';title.textContent='Azioni rapide';
      const box=document.createElement('div');box.id='pfc676Quick';box.className='pfc676Quick';box.innerHTML=
        '<button id="pfc676Save"><b>📍</b><span>Segna punto</span><small>Salva la posizione scelta</small></button>'+
        '<button id="pfc676Conditions"><b>🌦</b><span>Confronta vento</span><small>Condizioni e orario del cambio</small></button>'+
        '<button id="pfc676Radar"><b>🎯</b><span>Radar</span><small>Punti e direzione</small></button>'+
        '<button id="pfc676Track"><b>🥾</b><span>Camminata</span><small>Registra percorso</small></button>';
      box.insertAdjacentHTML('beforeend','<button id="pfc678Mushroom" hidden><b>🍄</b><span>Segna fungo</span><small>Salva nel punto scelto</small></button><button id="pfc678Species" hidden><b>🔎</b><span>Cerca fungo</span><small>Foto e descrizione</small></button><button id="pfc678Sighting"><b>🕊️</b><span>Avvistamento</span><small>Uccelli e note</small></button>');
      weather.insertAdjacentElement('afterend',box);q('pfc678Mushroom').onclick=()=>click('quickMushroomBtn');q('pfc678Species').onclick=()=>click('quickSpeciesBtn');q('pfc678Sighting').onclick=()=>click('quickSightingBtn');weather.insertAdjacentElement('afterend',title);
      q('pfc676Save').onclick=()=>{goMap(false);setTimeout(()=>{if(!q('selectedCard')?.classList.contains('hidden'))click('savePointBtn');else if(!click('quickSaveHereBtn'))click('locateBtn')},140)};
      q('pfc676Conditions').onclick=openConditionComparison;
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
    const desired=[q('pfc676Hero'),page.querySelector('.mapWrap'),q('teamMapBar'),q('dogMapBar'),q('selectedCard'),q('pfcQuickTitle'),q('pfc676Quick'),q('pfc676Return'),page.querySelector('.pfcParkingSettings'),page.querySelector('.pfc676Advanced'),page.querySelector('.homeWeatherCard')].filter(e=>e&&e.parentElement===page);
    const children=Array.from(page.children);if(desired.some((e,i)=>i&&children.indexOf(e)<children.indexOf(desired[i-1])))desired.forEach(e=>page.appendChild(e));
  }

  function buildNav(){
    if(q('pfc676Nav'))return;
    const nav=document.createElement('div');nav.id='pfc676Nav';nav.className='pfc676CommercialNav';nav.innerHTML=
      '<button id="pfc676NavHome"><b>🏠</b>Home</button>'+
      '<button id="pfc676NavMap" class="active"><b>🗺</b>Mappa</button>'+
      '<button id="pfc676NavRadar"><b>🎯</b>Radar</button>'+
      '<button id="pfc676NavPosts"><b>📍</b>Appostamenti</button>'+
      '<button id="pfc676NavSight"><b>🔭</b>Avvistamenti</button>'+
      '<button id="pfc676NavMore"><b>☰</b>Altro</button>';
    document.body.appendChild(nav);
    const active=id=>{nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.id===id))};
    q('pfc676NavHome').onclick=()=>{active('pfc676NavMap');oldNav('map');setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60)};
    q('pfc676NavMap').onclick=()=>{active('pfc676NavMap');goMap(false)};
    q('pfc676NavRadar').onclick=()=>{active('pfc676NavRadar');if(!click('ctRadarBtn')){goMap(false);setTimeout(()=>click('ctRadarBtn'),700)}};
    q('pfc676NavPosts').onclick=()=>{active('pfc676NavPosts');showAppostamenti()};
    q('pfc676NavSight').onclick=()=>{active('pfc676NavSight');if(window.__PFC_LIVE_API__)window.__PFC_LIVE_API__.openSightings();else{oldNav('diary');setTimeout(()=>document.querySelector('[data-history="sightings"]')?.click(),120)}window.scrollTo({top:0,behavior:'smooth'});};
    q('pfc676NavMore').onclick=()=>{active('pfc676NavMore');if(!click('backupQuickBtn'))oldNav('diary')};
  }


  function buildSimpleMenu(){
    if(q('page-more'))return;
    const page=document.createElement('section');page.id='page-more';page.className='page';
    page.innerHTML='<div class="pfc676PageHead"><button id="pfc694Back" type="button">‹ Mappa</button><div><h2>Strumenti e aiuto</h2><p>Tutti i comandi della tua uscita, in un solo posto.</p></div></div><div class="pfc694Menu" id="pfc694Menu"></div><details class="card pfc694Guide"><summary>Come iniziare · 3 passaggi</summary><ol><li>Scegli <b>Caccia</b> o <b>Funghi</b> nella pagina Mappa.</li><li>Cerca una località oppure premi <b>Dove sono</b>. Tocca la mappa per scegliere un punto.</li><li>Premi <b>Segna punto</b> o <b>Segna fungo</b>. Aggiungi nome, foto e note, poi salva.</li></ol><p>Prima di camminare, segna la macchina. Per ritrovarla usa <b>Ritorna alla macchina</b>.</p><p>In Caccia, apri <b>Squadra</b> per creare o raggiungere un gruppo. Per parlare, attiva il microfono e tieni premuto <b>Parla</b>. Serve Internet e l’app aperta.</p><p>Il riconoscimento fotografico dei funghi è indicativo: non stabilisce se un fungo è commestibile. Fai controllare i funghi da un micologo prima del consumo.</p></details><p class="pfc694Version">Interfaccia 6.9.4 · Prova gratuita</p>';
    document.querySelector('main').appendChild(page);
    const entries=[
      ['🥾','Camminata','Registra e rivedi il percorso','track'],
      ['📡','Radar','Direzione e distanza dei punti','ctRadarBtn'],
      ['👥','Squadra e voce','Posizioni degli amici e microfono','teamMapSquad','hunt'],
      ['🐕','GPS cane','Associa un trasmettitore compatibile','dogSettingsBtn','hunt'],
      ['🌬','Confronta vento','Confronto e possibili cambi di direzione','compare','hunt'],
      ['🍄','Cerca fungo','Apri il riconoscimento da foto','quickSpeciesBtn','mushroom'],
      ['🚗','Parcheggio','Segna o sposta la macchina','parking'],
      ['🧭','Territorio e regole','Regione, ATC e aree protette','pfc676Territory','hunt'],
      ['📅','Calendario caccia','Consulta le informazioni disponibili','pfc676Calendar','hunt'],
      ['🔔','Avvisi','Impostazioni e notifiche','pfcAlertsBtn'],
      ['💾','Dati e backup','Esporta o ripristina i tuoi dati','backupQuickBtn']
    ];
    entries.forEach(([icon,title,desc,target,mode])=>{
      const b=document.createElement('button');b.type='button';b.className='pfc694MenuItem';if(mode)b.dataset.pfcActivityOnly=mode;
      b.innerHTML='<b aria-hidden="true">'+icon+'</b><span><strong>'+title+'</strong><small>'+desc+'</small></span><span aria-hidden="true">›</span>';
      b.onclick=()=>{
        if(target==='track'){oldNav('track');window.scrollTo(0,0);return;}
        if(target==='compare'){openConditionComparison();return;}
        if(target==='parking'){oldNav('map');const d=document.querySelector('.pfcParkingSettings');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});}return;}
        if(['pfc676Territory','pfc676Calendar'].includes(target))oldNav('map');
        click(target);
      };q('pfc694Menu').appendChild(b);
    });
    q('pfc694Back').onclick=()=>q('pfc676NavMap').click();
    q('pfc676NavMore').onclick=()=>{
      document.querySelectorAll('main>.page').forEach(p=>p.classList.toggle('active',p.id==='page-more'));
      q('pfc676Nav').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.id==='pfc676NavMore'));
      window.scrollTo({top:0,behavior:'smooth'});
    };
    // Explain map tools with visible labels instead of relying on long presses.
    const labels={locateBtn:'◎<small>Dove sono</small>',followBtn:'➤<small>Seguimi</small>',layersBtn:'◫<small>Mappe</small>'};
    Object.entries(labels).forEach(([id,html])=>{const b=q(id);if(b){b.innerHTML=html;b.setAttribute('aria-label',b.title);}});
    q('clearSelectedBtn')?.setAttribute('aria-label','Chiudi il punto selezionato');
    q('backupQuickBtn')?.setAttribute('aria-label','Apri dati e backup');
    q('mapSearch')?.setAttribute('aria-label','Cerca città, paese o contrada');
    const hint=document.createElement('p');hint.className='pfc694Hint';hint.textContent='Tocca la mappa per scegliere dove salvare. “Dove sono” centra la tua posizione.';
    document.querySelector('.mapWrap').appendChild(hint);
    document.querySelectorAll('main>.page').forEach(page=>{
      if(['page-map','page-more','page-appostamenti'].includes(page.id))return;
      const b=document.createElement('button');b.type='button';b.className='secondary pfc694Back';b.textContent='‹ Torna alla mappa';b.onclick=()=>q('pfc676NavMap').click();page.prepend(b);
    });
    window.__PFC_INTERFACE_VERSION__='6.9.4';
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
    window.__PFC676_HEALTH__={version:'6.9.4',missing,checkedAt:new Date().toISOString()};
    if(!missing.length&&!b.dataset.dismiss){b.dataset.dismiss='1';setTimeout(()=>b.remove(),3200);}
  }

  async function boot(){
    header();buildHero();decorateMap();buildNav();buildSimpleMenu();
    for(let i=0;i<35;i++){decorateCards();orderHome();syncMode();if(q('ctRadarBtn')&&q('pointsList'))break;await sleep(180)}
    decorateCards();orderHome();health();
    let healthTimer;window.addEventListener('pfc:ready',()=>{decorateCards();orderHome();syncMode();health()});const mo=new MutationObserver(()=>{decorateCards();orderHome();syncMode();clearTimeout(healthTimer);if(q('pfc676Status'))healthTimer=setTimeout(health,350)});mo.observe(q('page-map')||document.body,{childList:true,subtree:true});
    
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
