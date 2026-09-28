(function(){
const KEY='unamano_onboarding_seen_v1';
const q=id=>document.getElementById(id);
function addFooterLinks(){
  const footer=q('siteFooter');
  if(!footer)return;
  if(!q('umHowItWorksLink')){
    const a=document.createElement('a');a.id='umHowItWorksLink';a.href='come-funziona.html';a.textContent='Come funziona';
    const first=footer.querySelector('a');if(first)footer.insertBefore(a,first);else footer.appendChild(a);
  }
  if(!q('umContactsLink')){
    const a=document.createElement('a');a.id='umContactsLink';a.href='contatti.html';a.textContent='Contatti';
    footer.appendChild(a);
  }
}
function styles(){
  if(q('umOnboardingStyle'))return;
  const s=document.createElement('style');s.id='umOnboardingStyle';s.textContent=`
  #umWelcome{position:fixed;inset:0;z-index:130;background:rgba(10,26,22,.48);display:grid;place-items:center;padding:16px}
  #umWelcome.hidden{display:none!important}.umw-card{width:min(560px,100%);background:#fff;border-radius:24px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.25);border:1px solid var(--line)}.umw-head{display:flex;gap:12px;align-items:flex-start}.umw-mark{width:48px;height:48px;border-radius:16px;background:var(--g);color:#fff;display:grid;place-items:center;font-size:26px}.umw-head h2{margin:0 0 4px}.umw-steps{display:grid;gap:9px;margin:16px 0}.umw-step{display:flex;gap:10px;align-items:flex-start;padding:10px 11px;border:1px solid var(--line);border-radius:13px;background:#f8fbfa}.umw-n{width:27px;height:27px;flex:none;border-radius:9px;background:var(--mint);color:var(--g2);display:grid;place-items:center;font-weight:900}.umw-actions{display:flex;gap:8px;flex-wrap:wrap}.umw-actions .btn{flex:1;min-width:140px}
  `;document.head.appendChild(s);
}
function close(){q('umWelcome')?.remove();try{localStorage.setItem(KEY,'1')}catch(e){}}
function build(){
  addFooterLinks();
  try{if(localStorage.getItem(KEY)==='1')return}catch(e){}
  if(q('umWelcome'))return;styles();
  const d=document.createElement('div');d.id='umWelcome';d.innerHTML=`<div class="umw-card"><div class="umw-head"><div class="umw-mark">🤝</div><div><h2>Benvenuto su UnaMano</h2><div class="small">In meno di un minuto capisci come funziona.</div></div></div><div class="umw-steps"><div class="umw-step"><span class="umw-n">1</span><div><b>Guarda le richieste</b><div class="small">Esplora la bacheca della tua zona e filtra per categoria.</div></div></div><div class="umw-step"><span class="umw-n">2</span><div><b>Candidati oppure pubblica</b><div class="small">Puoi offrire il tuo aiuto o chiedere una mano con una nuova richiesta.</div></div></div><div class="umw-step"><span class="umw-n">3</span><div><b>Chat e recensioni</b><div class="small">La chat si attiva dopo l’accettazione. Al termine dell’attività puoi lasciare una recensione.</div></div></div></div><div class="umw-actions"><a class="btn g" href="come-funziona.html">Come funziona</a><button id="umWelcomeStart" class="btn p" type="button">Inizia</button></div></div>`;
  document.body.appendChild(d);
  q('umWelcomeStart').onclick=close;
  d.addEventListener('click',e=>{if(e.target===d)close()});
}
if(document.readyState==='complete')setTimeout(build,300);else window.addEventListener('load',()=>setTimeout(build,300),{once:true});
let n=0;const t=setInterval(()=>{n++;addFooterLinks();if(q('siteFooter')||n>20)clearInterval(t)},350);
})();