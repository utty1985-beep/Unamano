/* Regional sources for the Puglia-only edition. Position sharing has no voice controls. */
(() => {
 'use strict';
 const q=id=>document.getElementById(id);
 function install(){
  const backup=q('page-backup'),quick=q('pfc676Quick');
  if(!backup||!quick)return false;
  if(!q('pfcPugliaRules')){
   const card=document.createElement('div');card.id='pfcPugliaRules';card.className='card';
   const title=document.createElement('h3');title.textContent='📜 Regolamenti Puglia';
   const note=document.createElement('p');note.className='note';note.textContent='Fonti ufficiali regionali per caccia e raccolta funghi.';
   const links=document.createElement('div');links.className='actionGrid';
   for(const [text,href,mode] of [
    ['Caccia · calendario e aggiornamenti','https://www.regione.puglia.it/web/foreste-biodiversita/stagione-venatoria','hunt'],
    ['Caccia · ATC della Puglia','https://www.regione.puglia.it/web/foreste-biodiversita/ambiti-territoriali-di-caccia-atc','hunt'],
    ['Funghi · normativa regionale','https://bussolanormativa.consiglio.puglia.it/public/leges/LeggeNavscroll.aspx?id=13571','mushroom']
   ]){
    const link=document.createElement('a');link.className='secondary';link.textContent=text;link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.dataset.pfcActivityOnly=mode;links.appendChild(link);
   }
   card.append(title,note,links);backup.prepend(card);
  }
  if(!q('pfcPugliaRulesBtn')){
   const button=document.createElement('button');button.id='pfcPugliaRulesBtn';button.className='secondary';button.type='button';
   button.innerHTML='<b>📜</b><span>Regole Puglia</span><small>Caccia e raccolta funghi</small>';
   button.onclick=()=>{q('pfc676Backup')?.click();q('pfcPugliaRules')?.scrollIntoView({behavior:'smooth',block:'start'});};quick.appendChild(button);
  }
  return true;
 }
 if(!install()){
  const observer=new MutationObserver(()=>{if(install())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
 }
})();
