(function(){
const q=id=>document.getElementById(id);
const safe=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let patched=false,emailPrefsBound=false;

function fullPublished(v){
  if(!v)return 'Data di pubblicazione non disponibile';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return 'Data di pubblicazione non disponibile';
  const date=d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
  const time=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  return `Pubblicato il ${date} alle ${time}`;
}
function avatarMarkup(p,size=''){
  const name=p?.display_name||'Utente',url=p?.avatar_url||'';
  return `<div class="avatar ${size} ${url?'photo':''}">${url?`<img src="${safe(url)}" alt="Foto profilo di ${safe(name)}">`:safe((name.trim()[0]||'U').toUpperCase())}</div>`;
}
function ext(f){return((f?.name||'').split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function avatarPath(url){const m='/storage/v1/object/public/avatars/';const i=String(url||'').indexOf(m);return i<0?null:decodeURIComponent(String(url).slice(i+m.length))}

function ensureStyles(){
  if(q('umPrivacyEnhanceStyle'))return;
  const s=document.createElement('style');s.id='umPrivacyEnhanceStyle';s.textContent=`
  .avatar.photo{overflow:hidden;padding:0;background:#fff}.avatar.photo img{width:100%;height:100%;object-fit:cover;display:block}
  .published-at{font-size:12px;color:var(--muted);margin-top:2px}.private-cv-note{font-size:12px;color:var(--muted);margin-top:7px}
  `;document.head.appendChild(s);
}

function ensureProfileInputs(){
  const card=document.querySelector('#profile aside .card');if(!card)return;
  const save=[...card.querySelectorAll('button')].find(b=>/Salva profilo/i.test(b.textContent||''));if(!save)return;
  if(!q('profilePhoto')){
    const box=document.createElement('div');
    box.innerHTML=`<label for="profilePhoto">Foto profilo</label><input id="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp"><div class="upload-note">JPG, PNG o WEBP · massimo 5 MB</div>`;
    while(box.firstChild)save.parentNode.insertBefore(box.firstChild,save);
  }
  if(!q('pcv')){
    const box=document.createElement('div');
    box.innerHTML=`<label for="pcv">Esperienze lavorative / curriculum</label><textarea id="pcv" maxlength="3000" placeholder="Inserisci esperienze lavorative, formazione, capacità e disponibilità"></textarea><label for="profileCv">Allega curriculum</label><input id="profileCv" type="file" accept="application/pdf,.pdf,.doc,.docx"><div class="upload-note">PDF, DOC o DOCX · massimo 10 MB. Visibile solo a te e a chi sta valutando una tua candidatura.</div><div id="cvCurrent" class="upload-note"></div>`;
    while(box.firstChild)save.parentNode.insertBefore(box.firstChild,save);
  } else {
    const label=q('pcv')?.previousElementSibling;if(label)label.textContent='Esperienze lavorative / curriculum';
    const note=q('profileCv')?.nextElementSibling;if(note)note.textContent='PDF, DOC o DOCX · massimo 10 MB. Visibile solo a te e a chi sta valutando una tua candidatura.';
  }
}

function patchJobs(){
  window.loadJobs=async function(){
    if(!sb)return;
    const r=await sb.from('jobs').select('id,owner_id,title,category,city,when_text,description,economic_note,status,assigned_to,created_at,profiles!jobs_owner_id_fkey(display_name,city,avatar_url)').order('created_at',{ascending:false}).limit(200);
    if(r.error){q('jobs').innerHTML=`<div class="card dangerbox">${safe(r.error.message)}</div>`;return}
    jobs=r.data||[];renderJobs();
  };
  window.jobCard=function(j){
    const mine=session?.user?.id===j.owner_id,name=j.profiles?.display_name||'Utente';
    return `<article class="card job"><div class="jobtop"><div><div class="meta">${iconForCat(j.category)} ${safe(j.category)} · 📍 ${safe(j.city)} · ${safe(j.when_text||'Da concordare')}</div><h3>${safe(j.title)}</h3></div><span class="status ${safe(j.status)}">${statusText(j.status)}</span></div><p>${safe(j.description)}</p><div class="ownerline">${avatarMarkup(j.profiles)}<div><b>${safe(name)}</b><div class="published-at">${fullPublished(j.created_at)}</div></div></div>${j.economic_note?`<div class="chip" style="margin-top:11px">💬 ${safe(j.economic_note)}</div>`:''}<div class="actions">${mine?`<button class="btn s sm" onclick="go('profile')">Gestisci</button>`:`<button class="btn p sm" onclick="openApply('${j.id}')">Sono disponibile</button>`}<button class="btn g sm" onclick="openJob('${j.id}')">Dettagli</button><button class="btn g sm" onclick="shareJob('${j.id}')">Condividi</button></div></article>`;
  };
  window.myJobCard=function(j){return `<div class="appcard"><div class="apphead"><div><b>${safe(j.title)}</b><div class="small">${safe(j.city)}</div><div class="published-at">${fullPublished(j.created_at)}</div></div><span class="status ${safe(j.status)}">${statusText(j.status)}</span></div><div class="actions">${j.status==='open'?`<button class="btn g sm" onclick="editJob('${j.id}')">Modifica</button><button class="btn d sm" onclick="deleteJob('${j.id}')">Elimina</button>`:''}${j.status==='assigned'?`<button class="btn s sm" onclick="completeJob('${j.id}')">Segna completata</button>`:''}<button class="btn g sm" onclick="go('activity')">Candidature</button></div></div>`};

  if(!window.__umExactOpenJob){
    window.__umExactOpenJob=true;const old=window.openJob;
    window.openJob=function(id){
      old.apply(this,arguments);
      setTimeout(()=>{
        const j=jobs.find(x=>x.id===id),modal=document.querySelector('#modalRoot .modal');if(!j||!modal)return;
        const owner=modal.querySelector('.ownerline');
        if(owner){const oldAv=owner.querySelector('.avatar');if(oldAv)oldAv.outerHTML=avatarMarkup(j.profiles);const info=owner.querySelector('div:nth-child(2)');if(info&&!info.querySelector('.published-at'))info.insertAdjacentHTML('beforeend',`<div class="published-at">${fullPublished(j.created_at)}</div>`);}
        if(!modal.querySelector('.job-published-full')){
          const meta=modal.querySelector('.meta');if(meta)meta.insertAdjacentHTML('afterend',`<div class="published-at job-published-full" style="margin-bottom:8px">${fullPublished(j.created_at)}</div>`);
        }
      },10);
    };
  }
}

function patchPrivateProfile(){
  ensureProfileInputs();
  window.saveProfile=async function(){
    if(!session)return;
    const uid=session.user.id,name=q('pn')?.value.trim()||'',city=q('pc')?.value.trim()||'',bio=q('pb')?.value.trim()||'',skills=(q('ps')?.value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),cv_summary=q('pcv')?.value.trim()||'';
    if(name.length<2)return toast('Inserisci un nome pubblico.','warn');
    const [pub,priv]=await Promise.all([
      sb.from('profiles').select('avatar_url').eq('id',uid).single(),
      sb.from('candidate_private').select('cv_path,cv_filename').eq('user_id',uid).maybeSingle()
    ]);
    if(pub.error)return toast(errText(pub.error),'err');
    let avatar_url=pub.data?.avatar_url||null,cv_path=priv.data?.cv_path||null,cv_filename=priv.data?.cv_filename||null;
    const photo=q('profilePhoto')?.files?.[0];
    if(photo){
      if(photo.size>5*1024*1024)return toast('La foto supera 5 MB.','warn');
      if(!['image/jpeg','image/png','image/webp'].includes(photo.type))return toast('Usa JPG, PNG o WEBP.','warn');
      const path=`${uid}/avatar-${Date.now()}.${ext(photo)||'jpg'}`;
      const up=await sb.storage.from('avatars').upload(path,photo,{contentType:photo.type});if(up.error)return toast('Errore foto: '+errText(up.error),'err');
      avatar_url=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;const old=avatarPath(pub.data?.avatar_url);if(old)await sb.storage.from('avatars').remove([old]);
    }
    const cv=q('profileCv')?.files?.[0];
    if(cv){
      if(cv.size>10*1024*1024)return toast('Il curriculum supera 10 MB.','warn');
      const ex=ext(cv);if(!['pdf','doc','docx'].includes(ex))return toast('Usa PDF, DOC o DOCX.','warn');
      const path=`${uid}/cv-${Date.now()}.${ex}`;const up=await sb.storage.from('curricula').upload(path,cv,{contentType:cv.type||undefined});if(up.error)return toast('Errore curriculum: '+errText(up.error),'err');
      if(cv_path)await sb.storage.from('curricula').remove([cv_path]);cv_path=path;cv_filename=cv.name;
    }
    const a=await sb.from('profiles').update({display_name:name,city:city||null,bio:bio||null,skills,avatar_url,updated_at:new Date().toISOString()}).eq('id',uid);
    const b=await sb.from('candidate_private').upsert({user_id:uid,cv_summary:cv_summary||null,cv_path,cv_filename,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(a.error||b.error)return toast(errText(a.error||b.error),'err');
    if(q('profilePhoto'))q('profilePhoto').value='';if(q('profileCv'))q('profileCv').value='';
    toast('Profilo salvato. Curriculum protetto.');await loadJobs();await loadProfile();
  };
  window.removeCurriculum=async function(){
    if(!session)return;const r=await sb.from('candidate_private').select('cv_path').eq('user_id',session.user.id).maybeSingle();
    if(r.data?.cv_path)await sb.storage.from('curricula').remove([r.data.cv_path]);
    const u=await sb.from('candidate_private').upsert({user_id:session.user.id,cv_path:null,cv_filename:null,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(u.error)return toast(errText(u.error),'err');toast('Curriculum allegato rimosso.');loadProfile();
  };

  const oldLoad=window.loadProfile;
  window.loadProfile=async function(){const r=await oldLoad.apply(this,arguments);ensureProfileInputs();await enhanceOwnPrivate();return r};

  window.openUserProfile=async function(uid){
    const [pr,rr,jr]=await Promise.all([
      sb.from('profiles').select('id,display_name,city,bio,skills,avatar_url').eq('id',uid).single(),
      sb.from('reviews').select('stars').eq('subject_id',uid),
      sb.from('jobs').select('id,status').eq('owner_id',uid)
    ]);
    if(pr.error)return toast(errText(pr.error),'err');
    const p=pr.data,rev=rr.data||[],mine=jr.data||[],avg=rev.length?(rev.reduce((a,x)=>a+x.stars,0)/rev.length).toFixed(1):'—',me=session?.user?.id===uid;
    let priv=null,cvUrl=null;
    if(session){const x=await sb.from('candidate_private').select('cv_summary,cv_path,cv_filename').eq('user_id',uid).maybeSingle();if(!x.error)priv=x.data||null;}
    if(priv?.cv_path){const s=await sb.storage.from('curricula').createSignedUrl(priv.cv_path,600);if(!s.error)cvUrl=s.data.signedUrl;}
    const cvBlock=priv&&(priv.cv_summary||priv.cv_path)?`<div class="cvbox"><b>🔒 Curriculum ed esperienze</b>${priv.cv_summary?`<p>${safe(priv.cv_summary)}</p>`:''}${priv.cv_path?(cvUrl?`<a class="btn g sm" href="${safe(cvUrl)}" target="_blank" rel="noopener">Apri ${safe(priv.cv_filename||'curriculum')}</a>`:'<div class="small">Allegato non disponibile.</div>'):''}<div class="private-cv-note">Visibile solo al candidato e al proprietario di un annuncio mentre sta valutando la candidatura.</div></div>`:'';
    showModal(`<div class="modal-head"><h2 style="margin:0">Profilo utente</h2><button class="iconbtn" onclick="closeModal()">✕</button></div><div class="profile-head" style="margin-top:12px">${avatarMarkup(p,'lg')}<div><h2>${safe(p.display_name||'Utente')}</h2><div class="small">📍 ${safe(p.city||'Città non indicata')}</div></div></div><p>${safe(p.bio||'Nessuna presentazione.')}</p><div class="skills">${(p.skills||[]).map(x=>`<span class="chip">${safe(x)}</span>`).join('')}</div><div class="metric-grid"><div class="metric"><b>${avg}</b><span>valutazione</span></div><div class="metric"><b>${rev.length}</b><span>recensioni</span></div><div class="metric"><b>${mine.filter(x=>x.status==='open').length}</b><span>annunci aperti</span></div></div>${cvBlock}<div class="actions">${!me?`<button class="btn p" onclick="closeModal();openConversation('${uid}')">💬 Messaggio privato</button>`:''}<button class="btn g" onclick="closeModal()">Chiudi</button></div>`);
  };
}

async function enhanceOwnPrivate(){
  if(!session)return;ensureProfileInputs();
  const r=await sb.from('candidate_private').select('cv_summary,cv_path,cv_filename').eq('user_id',session.user.id).maybeSingle();if(r.error)return;
  const p=r.data||{};if(q('pcv'))q('pcv').value=p.cv_summary||'';
  if(q('cvCurrent'))q('cvCurrent').innerHTML=p.cv_path?`Attuale: <b>${safe(p.cv_filename||'Curriculum')}</b> <button class="btn d sm" type="button" onclick="removeCurriculum()">Rimuovi allegato</button>`:'Nessun curriculum allegato.';
  const card=document.querySelector('#profileBox .card');if(!card)return;card.querySelector('#ownPrivateCv')?.remove();
  if(p.cv_summary||p.cv_path){
    let link='';if(p.cv_path){const s=await sb.storage.from('curricula').createSignedUrl(p.cv_path,600);if(!s.error)link=`<a class="btn g sm" href="${safe(s.data.signedUrl)}" target="_blank" rel="noopener">Apri ${safe(p.cv_filename||'curriculum')}</a>`;}
    const d=document.createElement('div');d.id='ownPrivateCv';d.className='cvbox';d.innerHTML=`<b>🔒 Curriculum privato</b>${p.cv_summary?`<p>${safe(p.cv_summary)}</p>`:''}${link}<div class="private-cv-note">Gli altri utenti non lo vedono. È accessibile solo a chi sta valutando una tua candidatura ancora in attesa.</div>`;card.appendChild(d);
  }
}

async function loadEmailPref(){
  if(!session?.user?.id||!q('workerEmailNotify'))return;
  const r=await sb.from('worker_preferences').select('email_notifications_enabled').eq('user_id',session.user.id).maybeSingle();
  if(!r.error)q('workerEmailNotify').checked=!!r.data?.email_notifications_enabled;
}
function setupEmailPrefUi(){
  const card=q('workerPrefsCard'),save=q('saveWorkerPrefs');if(!card||!save)return false;
  if(!q('workerEmailNotify')){
    const push=q('workerNotify')?.closest('label');const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:flex-start;margin-top:10px';label.innerHTML='<input id="workerEmailNotify" type="checkbox" style="width:auto;margin-top:3px"><span><b>Avvisami via email</b> quando viene pubblicata una richiesta nella mia città e in una delle categorie scelte.</span>';
    (push||q('workerCats'))?.insertAdjacentElement('afterend',label);
    const note=document.createElement('div');note.className='small';note.style.marginTop='6px';note.textContent='L’email viene inviata all’indirizzo usato per il tuo account UnaMano.';label.insertAdjacentElement('afterend',note);
  }
  if(!emailPrefsBound){
    emailPrefsBound=true;save.addEventListener('click',async()=>{
      if(!session?.user?.id)return;
      const city=(q('pc')?.value||'').trim(),cats=[...document.querySelectorAll('#workerCats input:checked')].map(x=>x.value);
      if(!city||!cats.length)return;
      const enabled=!!q('workerEmailNotify')?.checked;
      const r=await sb.from('worker_preferences').upsert({user_id:session.user.id,email_notifications_enabled:enabled,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(r.error)toast(errText(r.error),'err');else if(enabled)toast('Avvisi email attivati per città e categorie selezionate.');
    });
  }
  loadEmailPref();return true;
}

async function init(){
  if(patched||typeof sb==='undefined'||!sb||typeof window.jobCard!=='function')return;patched=true;
  ensureStyles();patchJobs();patchPrivateProfile();setupEmailPrefUi();
  try{await loadJobs()}catch(e){}
  let n=0;const t=setInterval(()=>{n++;ensureProfileInputs();setupEmailPrefUi();if(n>40)clearInterval(t)},300);
}
if(document.readyState==='complete')setTimeout(init,120);else window.addEventListener('load',()=>setTimeout(init,120));
})();