/* 6.9.14 - Solo impaginazione e stato tessere: non modifica punti, GPS o backup. */
(()=>{
  'use strict';
  if(window.__PFC_UX_6914__)return;
  window.__PFC_UX_6914__=true;
  const $=id=>document.getElementById(id);
  let watching=false;
  function arrange(){
    const page=$('page-map'),wrap=page?.querySelector('.mapWrap');
    if(!wrap)return;
    const search=wrap.querySelector('.searchRow');
    if(search)wrap.before(search);
    const input=$('mapSearch');
    if(input){
      input.placeholder='Cerca città, paese o coordinate';
      input.setAttribute('aria-label','Cerca una località o coordinate GPS');
    }
    const badge=$('gpsBadge');
    if(badge&&badge.parentElement===wrap)wrap.after(badge);
    const hint=wrap.querySelector('.pfc694Hint');
    if(hint)(badge||wrap).after(hint);
    const buttons={locateBtn:'Centra la posizione attuale',followBtn:'Attiva o disattiva Seguimi',northBtn:'Blocca il Nord',layersBtn:'Scegli mappa stradale o satellite'};
    for(const [id,label] of Object.entries(buttons)){
      const b=$(id);
      if(b){b.setAttribute('aria-label',label);b.setAttribute('type','button');}
    }
    setupTiles(wrap);
    const version=document.querySelector('.pfc694Version');
    if(version)version.textContent='Interfaccia 6.9.14 · uso privato';
    for(const item of document.querySelectorAll('#pfc694Menu .pfc694MenuItem')){
      const strong=item.querySelector('strong');
      if(strong?.textContent==='Squadra e voce'){
        strong.textContent='Squadra Live';
        const info=item.querySelector('small');
        if(info)info.textContent='Posizioni degli amici sulla mappa';
      }
    }
    const guide=document.querySelector('.pfc694Guide');
    for(const p of guide?.querySelectorAll('p')||[]){
      if(p.textContent?.includes('Per parlare')){
        p.textContent='In Caccia, usa Squadra Live per vedere nomi e distanze degli amici con Internet attivo. I tuoi punti e appostamenti restano privati.';
      }
    }
  }
  function setupTiles(wrap){
    const map=$('map');
    if(!map||watching||!window.MutationObserver)return;
    watching=true;
    const notice=document.createElement('div');
    notice.id='pfcMapLoading';
    notice.setAttribute('role','status');
    notice.setAttribute('aria-live','polite');
    const copy=document.createElement('span');
    copy.textContent='Caricamento della cartografia…';
    const retry=document.createElement('button');
    retry.type='button';retry.textContent='Riprova';retry.hidden=true;
    retry.onclick=()=>{
      if(!navigator.onLine){copy.textContent='Senza rete sono disponibili solo le mappe già scaricate.';return;}
      if(window.confirm('Ricaricare la cartografia? Eventuali modifiche non salvate andranno perse.'))location.reload();
    };
    notice.append(copy,retry);
    wrap.appendChild(notice);
    const completed=()=>map.querySelector('.leaflet-tile-loaded');
    if(completed()){notice.hidden=true;return;}
    const observer=new MutationObserver(()=>{
      if(completed()){notice.hidden=true;observer.disconnect();clearTimeout(deadline);}
    });
    observer.observe(map,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    const deadline=setTimeout(()=>{
      if(completed()){notice.hidden=true;observer.disconnect();return;}
      copy.textContent=navigator.onLine?
        'La mappa tarda a comparire. Puoi attendere o riprovare.':
        'Sei offline: la cartografia non scaricata richiede Internet.';
      retry.hidden=!navigator.onLine;
    },11000);
  }
  function init(){arrange();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.addEventListener('pfc:ready',init);
  window.addEventListener('pfc:authenticated',init);
  setTimeout(init,600);
  setTimeout(init,1800);
})();
