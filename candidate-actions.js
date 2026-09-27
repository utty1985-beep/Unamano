(function(){
let installed=false;
function enhance(){
  try{
    if(!session?.user?.id||typeof jobs==='undefined'||typeof applications==='undefined')return;
    const uid=session.user.id,map=new Map(jobs.map(j=>[j.id,j]));
    const incoming=applications.filter(a=>map.get(a.job_id)?.owner_id===uid);
    const outgoing=applications.filter(a=>a.applicant_id===uid);
    document.querySelectorAll('#incomingApps .appcard').forEach((card,i)=>{
      const a=incoming[i];if(!a||card.querySelector('.candidate-profile-action'))return;
      let box=card.querySelector('.actions.candidate-tools');
      if(!box){box=document.createElement('div');box.className='actions candidate-tools';card.appendChild(box);}
      const b=document.createElement('button');b.className='btn g sm candidate-profile-action';b.type='button';b.textContent='👤 Profilo / CV';
      b.onclick=()=>{if(typeof openUserProfile==='function')openUserProfile(a.applicant_id);else if(typeof toast==='function')toast('Profilo non disponibile. Ricarica la pagina.','warn');};box.appendChild(b);
    });
    document.querySelectorAll('#outgoingApps .appcard').forEach((card,i)=>{
      const a=outgoing[i],j=a&&map.get(a.job_id);if(!j||card.querySelector('.owner-profile-action'))return;
      let box=card.querySelector('.actions.candidate-tools');
      if(!box){box=document.createElement('div');box.className='actions candidate-tools';card.appendChild(box);}
      const b=document.createElement('button');b.className='btn g sm owner-profile-action';b.type='button';b.textContent='👤 Profilo di chi ha pubblicato';
      b.onclick=()=>{if(typeof openUserProfile==='function')openUserProfile(j.owner_id);};box.appendChild(b);
    });
  }catch(e){}
}
function install(){
  if(installed||typeof window.renderActivity!=='function')return false;installed=true;
  const old=window.renderActivity;window.renderActivity=function(){const r=old.apply(this,arguments);setTimeout(enhance,120);return r;};enhance();return true;
}
function boot(){let n=0;const t=setInterval(()=>{n++;install();enhance();if(installed&&n>10)clearInterval(t);if(n>40)clearInterval(t)},250);}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();