(function(){
  const q=id=>document.getElementById(id);
  let isAdmin=false,checking=false;
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const short=s=>String(s||'').slice(0,8);
  const fmt=d=>{try{return new Date(d).toLocaleString('it-IT')}catch(e){return ''}};

  function ensureStyles(){
    if(q('umModStyle'))return;
    const s=document.createElement('style');s.id='umModStyle';s.textContent=`
      .mod-card{border:1px solid #cfe0da;background:#f8fbfa}.mod-grid{display:grid;gap:10px}.mod-item{border:1px solid var(--line);border-radius:13px;padding:11px;background:#fff}.mod-item p{margin:6px 0}.mod-title{display:flex;gap:8px;align-items:start;justify-content:space-between}.mod-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.mod-section{max-height:55vh;overflow:auto}.mod-id{font:11px/1.3 monospace;color:var(--muted)}
    `;document.head.appendChild(s);
  }

  async function invoke(body){
    const {data,error}=await sb.functions.invoke('admin-moderation',{body});
    if(error)throw error;
    return data;
  }

  async function checkAdmin(){
    if(checking||!window.session?.user?.id||!window.sb)return;
    checking=true;
    try{
      const data=await invoke({action:'summary'});
      if(data?.admin){isAdmin=true;addAdminCard(data);}
    }catch(e){}finally{checking=false;}
  }

  function addAdminCard(prefetched){
    if(q('moderationCard'))return;
    ensureStyles();
    const profile=q('profile');if(!profile)return;
    const aside=profile.querySelector('aside')||profile;
    const card=document.createElement('div');card.id='moderationCard';card.className='card mod-card';
    card.innerHTML='<h3 style="margin-top:0">🛡️ Moderazione</h3><p class="small">Gestisci segnalazioni, annunci e sospensioni.</p><button id="openModerationBtn" class="btn g" type="button">Apri moderazione</button>';
    aside.appendChild(card);
    q('openModerationBtn').onclick=()=>openDashboard(prefetched);
  }

  function buttonsForReport(r){
    let h=`<button class="btn g sm" onclick="umModReport('${r.id}','reviewing')">In revisione</button><button class="btn g sm" onclick="umModReport('${r.id}','closed')">Chiudi</button>`;
    if(r.job_id)h+=`<button class="btn d sm" onclick="umModCloseJob('${r.job_id}')">Chiudi annuncio</button>`;
    if(r.reported_user_id)h+=`<button class="btn d sm" onclick="umModSuspend('${r.reported_user_id}')">Sospendi utente</button>`;
    return h;
  }

  function render(data,tab='reports'){
    const reports=data?.reports||[],notices=data?.notices||[],jobs=data?.jobs||[],susp=data?.suspensions||[];
    const tabs=`<div class="mod-tabs"><button class="btn ${tab==='reports'?'p':'g'} sm" onclick="umModTab('reports')">Segnalazioni (${reports.length})</button><button class="btn ${tab==='notices'?'p':'g'} sm" onclick="umModTab('notices')">Segnalazioni pubbliche (${notices.length})</button><button class="btn ${tab==='jobs'?'p':'g'} sm" onclick="umModTab('jobs')">Annunci (${jobs.length})</button><button class="btn ${tab==='susp'?'p':'g'} sm" onclick="umModTab('susp')">Sospesi (${susp.length})</button></div>`;
    let body='';
    if(tab==='reports')body=reports.length?reports.map(r=>`<div class="mod-item"><div class="mod-title"><b>${safe(r.reason)}</b><span class="status ${safe(r.status)}">${safe(r.status)}</span></div><div class="small">${fmt(r.created_at)}</div><div class="mod-id">report ${short(r.id)} · job ${short(r.job_id)} · utente ${short(r.reported_user_id)}</div><div class="actions">${buttonsForReport(r)}</div></div>`).join(''):'<div class="empty">Nessuna segnalazione.</div>';
    if(tab==='notices')body=notices.length?notices.map(n=>`<div class="mod-item"><div class="mod-title"><b>${safe(n.reason)}</b><span class="status">${safe(n.status)}</span></div><div class="small">${fmt(n.created_at)} · ${safe(n.reporter_email||'')}</div><p>${safe(n.details||'')}</p><div class="small">${safe(n.content_url||'')}</div><div class="actions"><button class="btn g sm" onclick="umModNotice('${n.id}','reviewing')">In revisione</button><button class="btn g sm" onclick="umModNotice('${n.id}','actioned')">Gestita</button><button class="btn g sm" onclick="umModNotice('${n.id}','closed')">Chiudi</button></div></div>`).join(''):'<div class="empty">Nessuna segnalazione pubblica.</div>';
    if(tab==='jobs')body=jobs.length?jobs.map(j=>`<div class="mod-item"><div class="mod-title"><b>${safe(j.title)}</b><span class="status ${safe(j.status)}">${safe(j.status)}</span></div><div class="small">${safe(j.category)} · ${safe(j.city)} · ${fmt(j.created_at)}</div><div class="mod-id">job ${short(j.id)} · owner ${short(j.owner_id)}</div><div class="actions">${j.status!=='closed'?`<button class="btn d sm" onclick="umModCloseJob('${j.id}')">Chiudi annuncio</button>`:''}<button class="btn d sm" onclick="umModSuspend('${j.owner_id}')">Sospendi proprietario</button></div></div>`).join(''):'<div class="empty">Nessun annuncio.</div>';
    if(tab==='susp')body=susp.length?susp.map(s=>`<div class="mod-item"><b>Utente sospeso</b><div class="mod-id">${safe(s.user_id)}</div><p>${safe(s.reason||'')}</p><div class="small">${fmt(s.updated_at)}</div><div class="actions"><button class="btn g sm" onclick="umModUnsuspend('${s.user_id}')">Riattiva</button></div></div>`).join(''):'<div class="empty">Nessun utente sospeso.</div>';
    return `${tabs}<div class="mod-section mod-grid">${body}</div>`;
  }

  let currentData=null,currentTab='reports';
  async function openDashboard(prefetched){
    try{
      currentData=prefetched?.admin?prefetched:await invoke({action:'summary'});
      currentTab='reports';
      const html=`<div class="modal-head"><h2 style="margin:0">🛡️ Moderazione UnaMano</h2><button class="iconbtn" onclick="closeModal()">✕</button></div><div id="moderationBody">${render(currentData,currentTab)}</div>`;
      if(typeof showModal==='function')showModal(html);else alert('Ricarica UnaMano per aprire la moderazione.');
    }catch(e){if(typeof toast==='function')toast('Impossibile caricare la moderazione.','err');}
  }
  async function refresh(){currentData=await invoke({action:'summary'});if(q('moderationBody'))q('moderationBody').innerHTML=render(currentData,currentTab);}
  window.umModTab=function(tab){currentTab=tab;if(q('moderationBody'))q('moderationBody').innerHTML=render(currentData,currentTab)};
  window.umModCloseJob=async function(id){if(!confirm('Chiudere questo annuncio?'))return;await invoke({action:'close_job',job_id:id});await refresh();if(typeof loadJobs==='function')loadJobs();};
  window.umModSuspend=async function(id){const reason=prompt('Motivo della sospensione:','Violazione delle regole di UnaMano');if(reason===null)return;await invoke({action:'suspend_user',user_id:id,reason});await refresh();if(typeof loadJobs==='function')loadJobs();};
  window.umModUnsuspend=async function(id){if(!confirm('Riattivare questo utente?'))return;await invoke({action:'unsuspend_user',user_id:id});await refresh();};
  window.umModReport=async function(id,status){await invoke({action:'report_status',id,status});await refresh();};
  window.umModNotice=async function(id,status){await invoke({action:'notice_status',id,status});await refresh();};

  function boot(){ensureStyles();checkAdmin();}
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
  let tries=0;const t=setInterval(()=>{tries++;if(window.session?.user?.id)checkAdmin();if(isAdmin||tries>40)clearInterval(t)},500);
})();
