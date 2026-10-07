/* Activity-specific controls; common GPS, walking and car tools stay available. */
(()=>{
'use strict';
const q=id=>document.getElementById(id);
let previous=null,pending=false;
const mode=()=>{try{return JSON.parse(localStorage.getItem('pfc-v661-settings')||'{}').mode==='mushroom'?'mushroom':'hunt';}catch{return 'hunt';}};
const huntIds=['pfc676Save','quickSaveHereBtn','weatherRefreshBtn','pfc678Sighting','pfc676Conditions','pfc683AppostamentiConditions','pfc676Calendar','pfc676Territory','ct661Card','ctCalendarCard','ctHuntDayBar','ctConditionBtn','ctCompareMainBtn','ctSightingCheck','ctWindCanvas','ctWindHud','ctWindLegend','teamMapBar','dogMapBar','pfcFriendsBtn','pfcFriendsBackupBtn','dogSettingsBtn','pfc676Protected'];
const mushroomIds=['pfc678Mushroom','pfc678Species','quickMushroomBtn','quickSpeciesBtn'];
function text(e,value){if(e&&e.textContent!==value)e.textContent=value;}
function apply(){
 const current=mode(),mush=current==='mushroom';document.body.dataset.pfcActivity=current;
 for(const id of huntIds){const e=q(id);if(e)e.dataset.pfcActivityOnly='hunt';}
 for(const id of mushroomIds){const e=q(id);if(e)e.dataset.pfcActivityOnly='mushroom';}
 for(const id of ['pointWindName','pointWindDir','pointWindSpeed','pointWindGust','pointReadWeatherBtn','pointWeatherSummary','pointType']){const e=q(id)?.closest('.full, .formGrid > div');if(e)e.dataset.pfcActivityOnly='hunt';}
 document.querySelectorAll('[data-basemap="wind"],.pfcWindButton,.pfcWindResult').forEach(e=>e.dataset.pfcActivityOnly='hunt');
 document.querySelectorAll('.homeWeatherCard,.pfcWeatherSettings').forEach(e=>e.setAttribute('data-pfc-activity-only','hunt'));
 document.querySelectorAll('#page-backup > button').forEach(e=>{if(e.textContent.includes('GPS cane'))e.dataset.pfcActivityOnly='hunt';});
 text(q('pfc676NavPosts')?.lastChild,mush?'Funghi salvati':'Appostamenti');
 text(q('pfc676NavSight')?.lastChild,mush?'Ritrovamenti':'Avvistamenti');
 text(q('pfc676NavPosts')?.querySelector('b'),mush?'🍄':'📍');
 text(q('pfc676NavSight')?.querySelector('b'),mush?'🍄':'🔭');
 const head=q('page-appostamenti')?.querySelector('.pfc676PageHead');
 text(head?.querySelector('h2'),mush?'🍄 Funghi salvati':'📍 Appostamenti');
 text(head?.querySelector('p'),mush?'I ritrovamenti salvati sulla mappa, con foto e note.':'I tuoi punti salvati, con giorno di caccia, meteo e comandi di gestione.');
 text(q('savePointBtn'),mush?'🍄 Imposta fungo qui':'📌 Salva punto selezionato');
 text(q('quickMushroomBtn')?.querySelector('span'),'Imposta fungo sulla mappa');
 text(q('quickSpeciesBtn')?.querySelector('span'),'Cerca fungo');
 document.querySelectorAll('#historyList button[onclick]').forEach(e=>{if((e.getAttribute('onclick')||'').includes('CT.openHistoryPoint'))text(e,mush?'🗺 Vedi fungo sulla mappa':'🗺 Mappa + vento attuale');});
 document.querySelectorAll('.legend span').forEach(e=>{if(e.textContent.includes('Funghi'))e.dataset.pfcActivityOnly='mushroom';else if(!e.textContent.includes('Parcheggio'))e.dataset.pfcActivityOnly='hunt';});
 text(q('ctMushModal')?.querySelector('h2'),'🔎🍄 Cerca fungo');
 text(document.querySelector('.topbar .brand small'),mush?'Funghi • mappa • ritrovamenti • radar':'Caccia • venti • appostamenti • squadra');
 if(previous!==current){
 if(mush){
 window.__PFC_CLEAR_CONDITION_LAYER__?.();window.PFC_DOG?.disconnect?.();q('pfcFriendsLeave')?.click();
 for(const id of ['pfcFriendsModal','teamPermissionModal','dogModal','pfcWindModal','ctConditionModal'])q(id)?.classList.remove('open');
 document.querySelector('[data-basemap="street"]')?.click();
 }else q('ctMushModal')?.classList.remove('open');
 previous=current;
 }
}
function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;apply();});}
const css=document.createElement('style');css.textContent='body[data-pfc-activity="mushroom"] [data-pfc-activity-only="hunt"],body[data-pfc-activity="hunt"] [data-pfc-activity-only="mushroom"]{display:none!important}body[data-pfc-activity="mushroom"] .pfc676CommercialNav{grid-template-columns:repeat(6,minmax(0,1fr))}';document.head.appendChild(css);
document.addEventListener('click',e=>{
 if(mode()==='mushroom'&&e.target.closest?.('#savePointBtn')){e.preventDefault();e.stopImmediatePropagation();q('quickMushroomBtn')?.click();return;}
 if(e.target.closest?.('#ctModeHunt,#ctModeMush,#pfc676Hunt,#pfc676Mush'))setTimeout(apply,100);
},true);
window.addEventListener('pfc:activity-mode',apply);window.addEventListener('pfc:ready',apply);window.addEventListener('storage',e=>{if(e.key==='pfc-v661-settings')apply();});
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.PFC_ACTIVITY_UI={apply,mode};apply();
})();
