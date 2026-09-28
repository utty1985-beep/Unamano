(function(){
const INPS_URL='https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-aree-tematiche.prestazioni-di-lavoro-occasionale-libretto-famiglia-51098.prestazioni-di-lavoro-occasionale-libretto-famiglia.html';
let patched=false,jobDatePatched=false,jobModalDatePatched=false;

function exactDate(v){
  if(!v)return'';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return'';
  return d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function addInpsInfo(){
  try{
    const sticky=document.querySelector('#home .side-sticky');
    if(sticky&&!document.getElementById('umInpsHome')){
      const card=document.createElement('div');
      card.id='umInpsHome';card.className='card';card.style.marginTop='12px';
      card.innerHTML=`<b>💼 Lavori saltuari: informazioni INPS</b><p class="small">Per piccoli lavori occasionali tra privati puoi consultare le regole ufficiali sul <b>Libretto Famiglia</b>, con modalità, limiti e adempimenti aggiornati.</p><a class="btn g sm" href="${INPS_URL}" target="_blank" rel="noopener noreferrer">Apri il sito INPS</a>`;
      sticky.appendChild(card);
    }
    const legalGrid=document.querySelector('#legal .legal-grid');
    if(legalGrid&&!document.getElementById('umInpsLegal')){
      const card=document.createElement('div');card.id='umInpsLegal';card.className='card';
      card.innerHTML=`<h3>💼 Lavori occasionali e INPS</h3><p>UnaMano mette in contatto gli utenti e non gestisce i pagamenti. Per sapere come regolarizzare piccoli lavori occasionali tra privati, consulta le informazioni ufficiali INPS sul Libretto Famiglia.</p><a class="btn g sm" href="${INPS_URL}" target="_blank" rel="noopener noreferrer">Tutti i dettagli sul sito INPS</a>`;
      legalGrid.appendChild(card);
    }
    const publishNotice=document.querySelector('#new .notice.info');
    if(publishNotice&&!document.getElementById('umInpsPublish')){
      const p=document.createElement('div');p.id='umInpsPublish';p.className='small';p.style.marginTop='8px';
      p.innerHTML=`Per piccoli lavori occasionali tra privati: <a href="${INPS_URL}" target="_blank" rel="noopener noreferrer"><b>consulta il Libretto Famiglia INPS</b></a>.`;
      publishNotice.appendChild(p);
    }
  }catch(e){}
}

function outgoingAll(){try{return session?.user?.id&&typeof applications!=='undefined'?applications.filter(a=>a.applicant_id===session.user.id):[]}catch(e){return[]}}
function incomingAll(){try{if(!session?.user?.id||typeof applications==='undefined'||typeof jobs==='undefined')return[];const uid=session.user.id,map=new Map(jobs.map(j=>[j.id,j]));return applications.filter(a=>map.get(a.job_id)?.owner_id===uid)}catch(e){return[]}}

function hideWithdrawnApplications(){
  try{
    const out=outgoingAll(),inc=incomingAll();
    [...document.querySelectorAll('#outgoingApps .appcard')].forEach((card,i)=>{if(out[i]?.status==='withdrawn')card.remove();});
    [...document.querySelectorAll('#incomingApps .appcard')].forEach((card,i)=>{if(inc[i]?.status==='withdrawn')card.remove();});
    const outBox=document.getElementById('outgoingApps');
    if(outBox&&!outBox.querySelector('.appcard')&&!outBox.querySelector('.loading'))outBox.innerHTML='<div class="empty"><span class="emoji">📤</span>Non hai candidature attive.</div>';
    const inBox=document.getElementById('incomingApps');
    if(inBox&&!inBox.querySelector('.appcard')&&!inBox.querySelector('.loading'))inBox.innerHTML='<div class="empty"><span class="emoji">📭</span>Nessuna candidatura ricevuta.</div>';
  }catch(e){}
}

function patchActivity(){
  if(patched||typeof window.renderActivity!=='function')return false;
  patched=true;
  const old=window.renderActivity;
  window.renderActivity=function(){
    const r=old.apply(this,arguments);
    [0,40,140,320,700].forEach(ms=>setTimeout(hideWithdrawnApplications,ms));
    return r;
  };
  hideWithdrawnApplications();
  return true;
}

function patchJobDates(){
  if(jobDatePatched||typeof window.jobCard!=='function')return false;
  jobDatePatched=true;
  const old=window.jobCard;
  window.jobCard=function(j){
    let html=old.apply(this,arguments);
    const when=exactDate(j?.created_at);
    if(when)html=html.replace(/<div class="meta">Pubblicato[\s\S]*?<\/div>/,`<div class="meta">Pubblicato il ${when}</div>`);
    return html;
  };
  try{if(typeof renderJobs==='function')renderJobs()}catch(e){}
  return true;
}

function patchJobModalDate(){
  if(jobModalDatePatched||typeof window.openJob!=='function')return false;
  jobModalDatePatched=true;
  const old=window.openJob;
  window.openJob=function(id){
    const r=old.apply(this,arguments);
    setTimeout(()=>{
      try{
        const j=typeof jobs!=='undefined'?jobs.find(x=>x.id===id):null;
        const modal=document.querySelector('#modalRoot .modal');
        if(!j||!modal||modal.querySelector('.um-published-at'))return;
        const d=document.createElement('div');d.className='small um-published-at';d.style.margin='8px 0';d.textContent='🕒 Pubblicato il '+exactDate(j.created_at);
        const owner=modal.querySelector('.ownerline');(owner||modal.querySelector('.actions'))?.insertAdjacentElement(owner?'beforebegin':'beforebegin',d);
      }catch(e){}
    },30);
    return r;
  };
  return true;
}

function patchApply(){
  if(window.__umApplyReopen||typeof window.applyJob!=='function')return;
  window.__umApplyReopen=1;
  window.applyJob=async function(id){
    try{
      const m=document.getElementById('applyMsg')?.value.trim()||'';
      if(m.length>500)return typeof toast==='function'&&toast('Messaggio troppo lungo.','warn');
      if(!session?.user?.id||typeof sb==='undefined'||!sb)return;
      const jr=await sb.from('jobs').select('status').eq('id',id).single();
      if(jr.error||jr.data?.status!=='open')return typeof toast==='function'&&toast('Questa richiesta non è più disponibile.','warn');
      const ex=await sb.from('applications').select('id,status').eq('job_id',id).eq('applicant_id',session.user.id).maybeSingle();
      if(!ex.error&&ex.data){
        if(ex.data.status==='withdrawn')return typeof toast==='function'&&toast('Hai già ritirato la candidatura per questa richiesta.','warn');
        return typeof toast==='function'&&toast('Ti sei già candidato a questa richiesta.','warn');
      }
      const r=await sb.from('applications').insert({job_id:id,applicant_id:session.user.id,message:m||null});
      if(r?.error)return typeof toast==='function'&&toast(typeof errText==='function'?errText(r.error):r.error.message,'err');
      if(typeof closeModal==='function')closeModal();
      if(typeof toast==='function')toast('Disponibilità inviata. La richiesta resta in bacheca finché chi ha chiesto aiuto non sceglie una persona.');
      if(typeof loadActivity==='function')await loadActivity(true);
      if(typeof loadJobs==='function')await loadJobs();
    }catch(e){if(typeof toast==='function')toast(e?.message||'Errore imprevisto','err')}
  };
}

function patchWithdraw(){
  if(window.__umWithdrawRefresh||typeof window.withdrawApp!=='function')return;
  window.__umWithdrawRefresh=1;
  const old=window.withdrawApp;
  window.withdrawApp=async function(id){
    const r=await old.apply(this,arguments);
    hideWithdrawnApplications();
    try{if(typeof loadJobs==='function')await loadJobs()}catch(e){}
    return r;
  };
}

function boot(){
  addInpsInfo();patchApply();patchActivity();patchJobDates();patchJobModalDate();patchWithdraw();
  let n=0;
  const t=setInterval(()=>{
    n++;addInpsInfo();patchApply();patchActivity();patchJobDates();patchJobModalDate();patchWithdraw();hideWithdrawnApplications();
    if((patched&&window.__umApplyReopen&&jobDatePatched&&jobModalDatePatched&&window.__umWithdrawRefresh&&n>10)||n>60)clearInterval(t);
  },250);
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();