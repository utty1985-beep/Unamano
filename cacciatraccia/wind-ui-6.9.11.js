/* PFC 6.9.11: show dialect wind labels across weather, diary and map without altering stored data. */
(()=>{
 'use strict';
 if(window.__PFC_WIND_UI_6911__)return;
 window.__PFC_WIND_UI_6911__=true;
 const selectors=[
  '#weatherBody','#pointWeatherSummary','#pointsList','#historyList',
  '#page-appostamenti','#pfcWindModal','#pfcWindOutput',
  '#ctConditionResults','#ctSightingSummary','#ctWindLegend','#ctWindHud'
 ];
 const names=/\b(Tramontana|Grecale|Ostro|Libeccio)\b/g;
 const resolve=name=>window.PFC_WIND_LABELS?.name(name)||name;
 let scheduled=false;
 function visit(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const text=node.nodeValue||'';
   if(!text||text.includes('Voria (')||text.includes('Favugna ('))continue;
   const updated=text.replace(names,resolve);
   if(updated!==text)node.nodeValue=updated;
  }
 }
 function legend(){
  const weather=document.getElementById('weatherBody');
  if(!weather||document.getElementById('pfcWindDialectLegend'))return;
  const info=document.createElement('p');
  info.id='pfcWindDialectLegend';
  info.className='note';
  info.textContent='Venti locali: Voria (N / NE), Favugna (S / SO), Ponente (O), Maestrale (NO). La direzione standard resta visibile.';
  weather.insertAdjacentElement('afterend',info);
 }
 function editHint(){
  const input=document.getElementById('pointWindName');
  if(!input||!input.parentElement)return;
  let hint=document.getElementById('pfcWindDialectHint');
  if(!hint){
   hint=document.createElement('small');
   hint.id='pfcWindDialectHint';
   hint.className='muted';
   hint.style.display='block';
   hint.style.marginTop='4px';
   input.insertAdjacentElement('afterend',hint);
  }
  const standard=String(input.value||'').trim();
  const named=resolve(standard);
  const label= named && named!==standard?named:standard;
  const value= label?'Nome locale: '+label:'Nome locale e direzione compariranno qui dopo la lettura meteo';
  if(hint.textContent!==value)hint.textContent=value;
 }
 function apply(){
  scheduled=false;
  selectors.forEach(selector=>document.querySelectorAll(selector).forEach(visit));
  legend();editHint();
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(apply);
 }
 document.addEventListener('input',event=>{if(event.target?.id==='pointWindName')schedule()},true);
 document.addEventListener('click',schedule,true);
 window.addEventListener('pfc:ready',schedule);
 window.addEventListener('pfc:authenticated',schedule);
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
 schedule();
})();
