/* App 6.9.x · nomi foggiani visibili nel meteo, nella mappa e nello storico,
   senza riscrivere i dati salvati e senza duplicare le etichette. */
(()=>{
 'use strict';
 if(window.__PFC_WIND_UI_6911__)return;
 window.__PFC_WIND_UI_6911__=true;
 const selectors=[
  '#weatherBody','#pointWeatherSummary','#pointsList','#historyList',
  '#page-appostamenti','#pfcWindModal','#pfcWindOutput',
  '#ctConditionResults','#ctSightingSummary','#ctWindLegend','#ctWindHud'
 ];
 const names=/\b(Tramontana|Grecale|Levante|Scirocco|Ostro|Libeccio|Ponente|Maestrale)\b/g;
 const alreadyLabeled=/^\s*·\s*(?:NE|NO|SE|SO|N|E|S|O)\s*\)/i;
 const resolve=name=>window.PFC_WIND_LABELS?.name(name)||name;
 let scheduled=false;
 function visit(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const original=node.nodeValue||'';
   if(!original)continue;
   const updated=original.replace(names,(match,offset,whole)=>
    alreadyLabeled.test(whole.slice(offset+match.length))?match:resolve(match));
   if(updated!==original)node.nodeValue=updated;
  }
 }
 function legend(){
  const weather=document.getElementById('weatherBody');
  if(!weather||document.getElementById('pfcWindDialectLegend'))return;
  const rows=window.PFC_WIND_LABELS?.rows;
  if(!rows?.length)return;
  const details=document.createElement('details');
  details.id='pfcWindDialectLegend';
  details.className='note';
  details.style.margin='10px 0';
  const summary=document.createElement('summary');
  summary.textContent='🧭 Nomi foggiani dei venti · apri la legenda';
  summary.style.cursor='pointer';
  summary.style.fontWeight='700';
  details.append(summary);
  const ul=document.createElement('ul');
  ul.style.paddingLeft='20px';
  ul.style.margin='8px 0 0';
  for(const row of rows){
   const li=document.createElement('li');
   li.textContent=row.dir+' · '+row.local+' — '+row.standard;
   ul.appendChild(li);
  }
  details.append(ul);
  weather.insertAdjacentElement('afterend',details);
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
  const label=named&&named!==standard?named:standard;
  const value=label?'Nome locale: '+label:'Dopo la lettura meteo appariranno nome foggiano e direzione';
  if(hint.textContent!==value)hint.textContent=value;
 }
 function apply(){
  scheduled=false;
  selectors.forEach(selector=>document.querySelectorAll(selector).forEach(visit));
  legend();
  editHint();
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
