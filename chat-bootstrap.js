(function(){
const q=id=>document.getElementById(id);
let done=false;

function addStyles(){
 if(q('chatBootstrapStyle'))return;
 const s=document.createElement('style');s.id='chatBootstrapStyle';s.textContent=`
 .msggrid{display:grid;grid-template-columns:minmax(230px,.6fr) minmax(0,1.4fr);gap:16px}.threads{max-height:65vh;overflow:auto}.thread{border:1px solid var(--line);border-radius:13px;padding:10px;margin:8px 0;cursor:pointer}.thread.active,.thread:hover{background:#f6fbf9;border-color:#9acdbb}.threadprev{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chat{min-height:430px;display:flex;flex-direction:column}.chathead{display:flex;gap:9px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px}.chatscroll{flex:1;max-height:52vh;overflow:auto;padding:12px 0;display:flex;flex-direction:column;gap:8px}.bubble{max-width:78%;padding:9px 11px;border-radius:15px;background:#eef4f1;align-self:flex-start;word-break:break-word}.bubble.me{background:var(--g);color:#fff;align-self:flex-end}.bubble time{font-size:10px;opacity:.7;display:block;margin-top:3px}.compose{display:grid;grid-template-columns:1fr auto;gap:8px;border-top:1px solid var(--line);padding-top:10px}.compose textarea{min-height:48px;margin:0}.avatar.photo{overflow:hidden;padding:0;background:#fff}.avatar.photo img{width:100%;height:100%;object-fit:cover;display:block}@media(max-width:840px){.msggrid{grid-template-columns:1fr}.threads{max-height:30vh}.bottom{grid-template-columns:repeat(6,1fr)!important}}
 `;document.head.appendChild(s);
}

function addSection(){
 if(!q('messages')){
  const sec=document.createElement('section');sec.id='messages';sec.className='hidden';sec.innerHTML=`<div class="section-head"><div><h2>Messaggi privati</h2><div class="small">Usa la chat per concordare i dettagli dell’incarico senza pubblicare telefono o email.</div></div><button class="btn g sm" onclick="loadPrivateMessages()">Aggiorna</button></div><div class="msggrid"><div class="card"><h3 style="margin-top:0">Conversazioni</h3><div id="chatThreads" class="threads"></div></div><div id="chatPanel" class="card chat"><div class="empty"><span class="emoji">💬</span><b>Seleziona una conversazione</b></div></div></div>`;
  q('legal')?.parentNode.insertBefore(sec,q('legal'));
 }
 if(!q('msgTop')){const b=document.createElement('button');b.id='msgTop';b.className='navbtn';b.innerHTML='Messaggi <span id="msgBadge" class="badge hidden">0</span>';b.onclick=()=>need(()=>go('messages'));q('authTop')?.before(b);}
 if(!q('msgMobile')){const b=document.createElement('button');b.id='msgMobile';b.dataset.nav='messages';b.innerHTML='<i>💬</i>Chat<span id="msgBadgeMob" class="badge hidden">0</span>';b.onclick=()=>need(()=>go('messages'));document.querySelector('.bottom button[data-nav="profile"]')?.before(b);}
}

function patchGo(){
 if(window.__chatBootstrapGo)return;window.__chatBootstrapGo=true;const old=window.go;
 window.go=function(id){q('messages')?.classList.add('hidden');if(id!=='messages')return old(id);if(!session)return old('auth');try{currentSection='messages'}catch(e){};['home','auth','new','activity','profile','legal'].forEach(x=>q(x)?.classList.add('hidden'));q('messages')?.classList.remove('hidden');document.querySelectorAll('.bottom button').forEach(b=>b.classList.toggle('active',b.dataset.nav==='messages'));window.scrollTo({top:0,behavior:'instant'});if(typeof loadPrivateMessages==='function')loadPrivateMessages();};
}

function boot(){
 if(done)return;addStyles();addSection();patchGo();
 if(typeof window.openConversation==='function'&&typeof window.loadPrivateMessages==='function')done=true;
}

if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
let tries=0;const t=setInterval(()=>{tries++;boot();if(done||tries>40)clearInterval(t)},250);
})();