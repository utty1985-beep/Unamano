(function(){
const INPS_URL='https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-aree-tematiche.prestazioni-di-lavoro-occasionale-libretto-famiglia-51098.prestazioni-di-lavoro-occasionale-libretto-famiglia.html';
let patched=false;

function addInpsInfo(){
  try{
    const sticky=document.querySelector('#home .side-sticky');
    if(sticky&&!document.getElementById('umInpsHome')){
      const card=document.createElement('div');
      card.id='umInpsHome';
      card.className='card';
      card.style.marginTop='12px';
      card.innerHTML=`<b>💼 Lavori saltuari: informazioni INPS</b><p class="small">Per piccoli lavori occasionali tra privati puoi consultare le regole ufficiali sul <b>Libretto Famiglia</b>, con modalità, limiti e adempimenti aggiornati.</p><a class="btn g sm" href="${INPS_URL}" target="_blank" rel="noopener noreferrer">Apri il sito INPS</a>`;
      sticky.appendChild(card);
    }

    const legalGrid=document.querySelector('#legal .legal-grid');
    if(legalGrid&&!document.getElementById('umInpsLegal')){
      const card=document.createElement('div');
      card.id='umInpsLegal';
      card.className='card';
      card.innerHTML=`<h3>💼 Lavori occasionali e INPS</h3><p>UnaMano mette in contatto gli utenti e non gestisce i pagamenti. Per sapere come regolarizzare piccoli lavori occasionali tra privati, consulta le informazioni ufficiali INPS sul Libretto Famiglia.</p><a class="btn g sm" href="${INPS_URL}" target="_blank" rel="noopener noreferrer">Tutti i dettagli sul sito INPS</a>`;
      legalGrid.appendChild(card);
    }

    const publishNotice=document.querySelector('#new .notice.info');
    if(publishNotice&&!document.getElementById('umInpsPublish')){
      const p=document.createElement('div');
      p.id='umInpsPublish';
      p.className='small';
      p.style.marginTop='8px';
      p.innerHTML=`Per piccoli lavori occasionali tra privati: <a href="${INPS_URL}" target="_blank" rel="noopener noreferrer"><b>consulta il Libretto Famiglia INPS</b></a>.`;
      publishNotice.appendChild(p);
    }
  }catch(e){}
}

function visibleOutgoing(){
  try{
    if(!session?.user?.id||typeof applications==='undefined')return [];
    return applications.filter(a=>a.applicant_id===session.user.id);
  }catch(e){return []}
}

function hideWithdrawnApplications(){
  try{
    const out=visibleOutgoing();
    const cards=[...document.querySelectorAll('#outgoingApps .appcard')];
    cards.forEach((card,i)=>{if(out[i]?.status==='withdrawn')card.remove();});
    const box=document.getElementById('outgoingApps');
    if(box&&!box.querySelector('.appcard')&&!box.querySelector('.loading')){
      box.innerHTML='<div class="empty"><span class="emoji">📤</span>Non ti sei ancora candidato.</div>';
    }
  }catch(e){}
}

function patchActivity(){
  if(patched||typeof window.renderActivity!=='function')return false;
  patched=true;
  const old=window.renderActivity;
  window.renderActivity=function(){
    const r=old.apply(this,arguments);
    setTimeout(hideWithdrawnApplications,40);
    setTimeout(hideWithdrawnApplications,180);
    setTimeout(hideWithdrawnApplications,400);
    return r;
  };
  hideWithdrawnApplications();
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
      let r;
      if(!ex.error&&ex.data?.status==='withdrawn'){
        r=await sb.from('applications').update({status:'pending',message:m||null,created_at:new Date().toISOString()}).eq('id',ex.data.id);
      }else if(!ex.error&&ex.data){
        return typeof toast==='function'&&toast('Ti sei già candidato a questa richiesta.','warn');
      }else{
        r=await sb.from('applications').insert({job_id:id,applicant_id:session.user.id,message:m||null});
      }
      if(r?.error)return typeof toast==='function'&&toast(typeof errText==='function'?errText(r.error):r.error.message,'err');
      if(typeof closeModal==='function')closeModal();
      if(typeof toast==='function')toast('Disponibilità inviata. La richiesta resta in bacheca finché chi ha chiesto aiuto non sceglie una persona.');
      if(typeof loadActivity==='function')await loadActivity(true);
      if(typeof loadJobs==='function')await loadJobs();
    }catch(e){if(typeof toast==='function')toast(e?.message||'Errore imprevisto','err')}
  };
}

function boot(){
  addInpsInfo();
  patchApply();
  patchActivity();
  let n=0;
  const t=setInterval(()=>{
    n++;
    addInpsInfo();
    patchApply();
    patchActivity();
    hideWithdrawnApplications();
    if((patched&&window.__umApplyReopen&&n>10)||n>50)clearInterval(t);
  },250);
}

if(document.readyState==='complete')boot();
else window.addEventListener('load',boot,{once:true});
})();