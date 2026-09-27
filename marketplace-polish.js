(function(){
const q=id=>document.getElementById(id);
const safe=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let installed=false,enrichTimer=null;

function exact(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function avatar(p){const n=p?.display_name||'Utente',u=p?.avatar_url||'';return `<div class="avatar ${u?'photo':''}">${u?`<img src="${safe(u)}" alt="Foto profilo">`:safe((n.trim()[0]||'U').toUpperCase())}</div>`;}
function stars(avg){if(avg==null)return'—';return Number(avg).toFixed(1)+' ★';}

function styles(){
 if(q('marketplacePolishStyle'))return;const s=document.createElement('style');s.id='marketplacePolishStyle';s.textContent=`
 .flowstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0 2px}.flowstep{background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px;min-height:92px}.flowstep b{display:block;margin-bottom:4px}.flowstep span{font-size:12px;color:var(--muted)}
 .candidate-rich{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line);margin-top:10px}.candidate-rich .avatar{width:48px;height:48px}.candidate-rich-main{min-width:0;flex:1}.candidate-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.candidate-tag{font-size:11px;padding:4px 7px;border-radius:999px;background:#f2f7f5;color:#40534d}.candidate-cv{background:#eef7ff;color:#315b76}.accepted-note{margin-top:9px;padding:9px 10px;border-radius:11px;background:#edf9f2;color:#276344;font-size:12px}.profile-progress{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f7faf9;border:1px solid var(--line);font-size:12px}.availability-line{margin-top:6px;font-size:13px;color:#40534d}
 @media(max-width:840px){.flowstrip{grid-template-columns:1fr 1fr}}@media(max-width:500px){.flowstrip{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}

function addFlow(){
 if(q('umFlowStrip'))return;const hero=document.querySelector('.hero');if(!hero)return;
 const d=document.createElement('div');d.id='umFlowStrip';d.className='flowstrip';d.innerHTML=`
 <div class="flowstep"><b>1 · Pubblica</b><span>Descrivi cosa ti serve, categoria, città e quando.</span></div>
 <div class="flowstep"><b>2 · Valuta</b><span>Confronta profilo, esperienza, recensioni e curriculum privato dei candidati.</span></div>
 <div class="flowstep"><b>3 · Accetta e chatta</b><span>Scegli una persona e definite i dettagli nella chat dell’incarico.</span></div>
 <div class="flowstep"><b>4 · Completa e recensisci</b><span>A lavoro concluso, lascia una recensione legata all’esperienza.</span></div>`;
 hero.insertAdjacentElement('afterend',d);
}

function addAvailabilityInput(){
 const card=document.querySelector('#profile aside .card');if(!card||q('pAvailability'))return;
 const skills=q('ps');if(!skills)return;const label=document.createElement('label');label.setAttribute('for','pAvailability');label.textContent='Disponibilità';
 const input=document.createElement('input');input.id='pAvailability';input.maxLength=250;input.placeholder='Es. pomeriggi, weekend, da concordare';
 skills.insertAdjacentElement('afterend',input);input.insertAdjacentElement('beforebegin',label);
}

async function fillAvailability(){
 if(!session?.user?.id||!q('pAvailability'))return;const r=await sb.from('profiles').select('availability_text,avatar_url,bio,skills').eq('id',session.user.id).single();if(r.error)return;
 q('pAvailability').value=r.data?.availability_text||'';
 const card=document.querySelector('#profileBox .card');if(card){card.querySelector('.profile-progress')?.remove();const score=[!!r.data?.avatar_url,!!r.data?.bio,(r.data?.skills||[]).length>0,!!r.data?.availability_text].filter(Boolean).length;const d=document.createElement('div');d.className='profile-progress';d.textContent=`Profilo completato ${score}/4 · foto, presentazione, competenze e disponibilità aiutano chi valuta una candidatura.`;card.appendChild(d);}
}

function patchProfile(){
 addAvailabilityInput();
 const oldSave=window.saveProfile;if(typeof oldSave==='function'&&!oldSave.__availabilityPatched){
  const wrapped=async function(){const value=(q('pAvailability')?.value||'').trim();const r=await oldSave.apply(this,arguments);if(session?.user?.id){const u=await sb.from('profiles').update({availability_text:value||null,updated_at:new Date().toISOString()}).eq('id',session.user.id);if(u.error)toast(errText(u.error),'err');}return r};wrapped.__availabilityPatched=true;window.saveProfile=wrapped;
 }
 const oldLoad=window.loadProfile;if(typeof oldLoad==='function'&&!oldLoad.__availabilityPatched){
  const wrapped=async function(){const r=await oldLoad.apply(this,arguments);addAvailabilityInput();await fillAvailability();return r};wrapped.__availabilityPatched=true;window.loadProfile=wrapped;
 }
 const oldOpen=window.openUserProfile;if(typeof oldOpen==='function'&&!oldOpen.__availabilityPatched){
  const wrapped=async function(uid){await oldOpen.apply(this,arguments);const r=await sb.from('profiles').select('availability_text').eq('id',uid).single();if(!r.error&&r.data?.availability_text){const modal=document.querySelector('#modalRoot .modal');if(modal&&!modal.querySelector('.availability-line')){const skills=modal.querySelector('.skills');const d=document.createElement('div');d.className='availability-line';d.innerHTML=`🗓️ <b>Disponibilità:</b> ${safe(r.data.availability_text)}`;(skills||modal.querySelector('.profile-head'))?.insertAdjacentElement('afterend',d);}}};wrapped.__availabilityPatched=true;window.openUserProfile=wrapped;
 }
}

async function enrichActivity(){
 if(!session?.user?.id||typeof jobs==='undefined'||typeof applications==='undefined')return;
 const uid=session.user.id,map=new Map(jobs.map(j=>[j.id,j]));
 const incoming=applications.filter(a=>map.get(a.job_id)?.owner_id===uid),ids=[...new Set(incoming.map(a=>a.applicant_id))];
 if(ids.length){
  const [pr,rr,cv]=await Promise.all([
   sb.from('profiles').select('id,display_name,city,avatar_url,skills,availability_text').in('id',ids),
   sb.from('reviews').select('subject_id,stars').in('subject_id',ids),
   sb.from('candidate_private').select('user_id,cv_summary,cv_path').in('user_id',ids)
  ]);
  const pm=new Map((pr.data||[]).map(x=>[x.id,x])),cm=new Map((cv.data||[]).map(x=>[x.user_id,x])),ratings=new Map();
  (rr.data||[]).forEach(x=>{if(!ratings.has(x.subject_id))ratings.set(x.subject_id,[]);ratings.get(x.subject_id).push(Number(x.stars)||0)});
  document.querySelectorAll('#incomingApps .appcard').forEach((card,i)=>{
   const a=incoming[i],j=a&&map.get(a.job_id);if(!a||!j||card.querySelector('.candidate-rich'))return;const p=pm.get(a.applicant_id)||{},r=ratings.get(a.applicant_id)||[],avg=r.length?r.reduce((x,y)=>x+y,0)/r.length:null,c=cm.get(a.applicant_id);
   const d=document.createElement('div');d.className='candidate-rich';d.innerHTML=`${avatar(p)}<div class="candidate-rich-main"><b>${safe(p.display_name||'Utente')}</b><div class="small">📍 ${safe(p.city||'Città non indicata')} · candidatura ${safe(exact(a.created_at))}</div>${p.availability_text?`<div class="availability-line">🗓️ ${safe(p.availability_text)}</div>`:''}<div class="candidate-tags"><span class="candidate-tag">${stars(avg)} · ${r.length} recensioni</span>${(p.skills||[]).slice(0,4).map(x=>`<span class="candidate-tag">${safe(x)}</span>`).join('')}${c&&(c.cv_summary||c.cv_path)?'<span class="candidate-tag candidate-cv">🔒 CV disponibile</span>':''}</div></div>`;
   const head=card.querySelector('.apphead');head?.insertAdjacentElement('afterend',d);
   if(a.status==='accepted'&&['assigned','completed'].includes(j.status)&&!card.querySelector('.accepted-note')){const n=document.createElement('div');n.className='accepted-note';n.textContent='✓ Persona scelta. Ora potete definire i dettagli dell’incarico nella chat.';card.appendChild(n);}
  });
 }
 const outgoing=applications.filter(a=>a.applicant_id===uid);
 document.querySelectorAll('#outgoingApps .appcard').forEach((card,i)=>{const a=outgoing[i],j=a&&map.get(a.job_id);if(!a||card.querySelector('.application-time'))return;const d=document.createElement('div');d.className='small application-time';d.style.marginTop='6px';d.textContent='Candidatura inviata '+exact(a.created_at);card.appendChild(d);if(a.status==='accepted'&&j&&['assigned','completed'].includes(j.status)&&!card.querySelector('.accepted-note')){const n=document.createElement('div');n.className='accepted-note';n.textContent='✓ Sei stato scelto. Usa la chat per concordare i dettagli con chi ha pubblicato.';card.appendChild(n);}});
}

function patchActivity(){
 const old=window.renderActivity;if(typeof old==='function'&&!old.__marketplacePolish){const wrapped=function(){const r=old.apply(this,arguments);clearTimeout(enrichTimer);enrichTimer=setTimeout(enrichActivity,80);return r};wrapped.__marketplacePolish=true;window.renderActivity=wrapped;}
}

function install(){
 if(installed)return;installed=true;styles();addFlow();patchProfile();patchActivity();setTimeout(()=>{addAvailabilityInput();fillAvailability();enrichActivity()},250);
 let tries=0;const t=setInterval(()=>{tries++;patchProfile();patchActivity();addAvailabilityInput();if(session?.user?.id&&currentSection==='activity')enrichActivity();if(tries>20)clearInterval(t)},400);
}

if(document.readyState==='complete')setTimeout(install,700);else window.addEventListener('load',()=>setTimeout(install,700),{once:true});
})();